from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import chess
import chess.pgn
import io

from theo_api.services.storage.db import get_db
from theo_api.services.storage import repo
from theo_api.schemas.games import (
    CreateGameRequest, CreateGameResponse,
    SubmitMoveRequest, MoveResponse, AnalysisLine
)
from theo_api.services.stockfish.difficulty import clamp_bucket
from theo_api.services.stockfish.analysis import choose_engine_reply

router = APIRouter(prefix="/games", tags=["games"])

START_FEN = chess.STARTING_FEN


def _moves_str_to_list(moves_uci: str) -> list[str]:
    s = moves_uci.strip()
    return s.split() if s else []


def _build_board_from_game(game) -> chess.Board:
    board = chess.Board(game.start_fen)
    for uci in _moves_str_to_list(game.moves_uci):
        board.push_uci(uci)
    return board


def _compute_pgn(game) -> str:
    board = chess.Board(game.start_fen)
    game_pgn = chess.pgn.Game()
    game_pgn.headers["Event"] = "Theo Training Game"
    game_pgn.headers["White"] = "Player" if game.player_color == "white" else "Theo"
    game_pgn.headers["Black"] = "Theo" if game.player_color == "white" else "Player"

    node = game_pgn
    for uci in _moves_str_to_list(game.moves_uci):
        move = board.parse_uci(uci)
        node = node.add_variation(move)
        board.push(move)

    if board.is_checkmate():
        game_pgn.headers["Result"] = "1-0" if board.turn == chess.BLACK else "0-1"
    elif board.is_stalemate() or board.is_insufficient_material() or board.can_claim_draw():
        game_pgn.headers["Result"] = "1/2-1/2"
    else:
        game_pgn.headers["Result"] = "*"

    buf = io.StringIO()
    exporter = chess.pgn.FileExporter(buf)
    game_pgn.accept(exporter)
    return buf.getvalue()


@router.post("", response_model=CreateGameResponse)
def create_game(req: CreateGameRequest, db: Session = Depends(get_db)):
    elo_bucket = clamp_bucket(req.elo)
    g = repo.create_game(db, elo_bucket=elo_bucket, player_color=req.player_color, start_fen=START_FEN)
    return CreateGameResponse(
        game_id=g.id,
        start_fen=g.start_fen,
        player_color=req.player_color,
        elo_bucket=elo_bucket,
    )


@router.post("/{game_id}/move", response_model=MoveResponse)
def submit_move(game_id: str, req: SubmitMoveRequest, db: Session = Depends(get_db)):
    g = repo.get_game(db, game_id)
    if not g:
        raise HTTPException(status_code=404, detail="Game not found")
    if g.status != "active":
        raise HTTPException(status_code=400, detail="Game is not active")

    board = _build_board_from_game(g)
    fen_before = board.fen()

    # Validate user's move
    try:
        user_move = board.parse_uci(req.move_uci)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid UCI move format")

    if user_move not in board.legal_moves:
        raise HTTPException(status_code=400, detail="Illegal move")

    # Apply user's move
    board.push(user_move)
    fen_after = board.fen()

    # If game ended after user's move, save and return without engine reply
    if board.is_game_over(claim_draw=True):
        moves = _moves_str_to_list(g.moves_uci)
        moves.append(req.move_uci)
        g.moves_uci = " ".join(moves)
        g.current_fen = fen_after
        g.pgn = _compute_pgn(g)
        g.status = "finished"
        repo.save_game(db, g)

        return MoveResponse(
            game_id=g.id,
            fen_before=fen_before,
            move_uci=req.move_uci,
            fen_after=fen_after,
            engine_reply_uci=None,
            fen_after_engine=None,
            eval_cp=None,
            mate=None,
            pv=[],
            top_moves=[],
        )

    # Engine reply + analysis (from the position after user's move)
    engine_reply, analysis = choose_engine_reply(fen_after, g.elo_bucket)

    fen_after_engine = None
    if engine_reply:
        try:
            engine_move = board.parse_uci(engine_reply)
            if engine_move in board.legal_moves:
                board.push(engine_move)
                fen_after_engine = board.fen()
            else:
                # fallback: if reply not legal (rare), ignore
                engine_reply = None
        except ValueError:
            engine_reply = None

    # Persist moves and state
    moves = _moves_str_to_list(g.moves_uci)
    moves.append(req.move_uci)
    if engine_reply:
        moves.append(engine_reply)
    g.moves_uci = " ".join(moves)
    g.current_fen = board.fen()
    repo.save_game(db, g)

    # Flatten analysis payload for Person B
    eval_cp = analysis.lines[0].eval_cp if analysis.lines else None
    mate = analysis.lines[0].mate if analysis.lines else None
    pv = analysis.lines[0].pv if analysis.lines and analysis.lines[0].pv else []

    top_moves = []
    for line in analysis.lines[:3]:
        if line.pv:
            top_moves.append(AnalysisLine(move=line.pv[0], eval_cp=line.eval_cp, mate=line.mate))

    return MoveResponse(
        game_id=g.id,
        fen_before=fen_before,
        move_uci=req.move_uci,
        fen_after=fen_after,
        engine_reply_uci=engine_reply,
        fen_after_engine=fen_after_engine,
        eval_cp=eval_cp,
        mate=mate,
        pv=pv,
        top_moves=top_moves,
    )


@router.post("/{game_id}/finish")
def finish_game(game_id: str, db: Session = Depends(get_db)):
    g = repo.get_game(db, game_id)
    if not g:
        raise HTTPException(status_code=404, detail="Game not found")

    g.pgn = _compute_pgn(g)
    g.status = "finished"
    repo.save_game(db, g)
    return {"game_id": g.id, "status": g.status, "pgn": g.pgn}
@router.get("/{game_id}")
def get_game_state(game_id: str, db: Session = Depends(get_db)):
    g = repo.get_game(db, game_id)
    if not g:
        raise HTTPException(status_code=404, detail="Game not found")
    return {
        "game_id": g.id,
        "status": g.status,
        "elo_bucket": g.elo_bucket,
        "player_color": g.player_color,
        "start_fen": g.start_fen,
        "current_fen": g.current_fen,
        "moves_uci": g.moves_uci.split() if g.moves_uci.strip() else [],
        "pgn": g.pgn,
    }
