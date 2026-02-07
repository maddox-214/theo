from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import chess
import chess.pgn
import io

from theo_api.services.storage.db import get_db
from theo_api.services.storage import repo
from theo_api.schemas.games import (
    CreateGameRequest,
    CreateGameResponse,
    SubmitMoveRequest,
    MoveResponse,
    AnalysisLine,
    GameStateResponse,
)
from theo_api.services.stockfish.difficulty import clamp_bucket
from theo_api.services.stockfish.analysis import choose_engine_reply
from theo_api.services.llm.client import LLMClient

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
        # If it's checkmate and it's side-to-move's turn, they are the one checkmated.
        # So the winner is the opposite side.
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

    # If player is Black, Theo (White) should play first move automatically
    if req.player_color == "black":
        board = chess.Board(g.start_fen)
        engine_reply, _analysis = choose_engine_reply(board.fen(), g.elo_bucket)

        if engine_reply:
            try:
                move = board.parse_uci(engine_reply)
                if move in board.legal_moves:
                    board.push(move)
                    g.moves_uci = engine_reply
                    g.current_fen = board.fen()
                    repo.save_game(db, g)
            except ValueError:
                pass

    return CreateGameResponse(
        game_id=g.id,
        start_fen=g.start_fen,
        player_color=req.player_color,
        elo_bucket=elo_bucket,
    )


@router.get("/{game_id}", response_model=GameStateResponse)
def get_game_state(game_id: str, db: Session = Depends(get_db)):
    g = repo.get_game(db, game_id)
    if not g:
        raise HTTPException(status_code=404, detail="Game not found")

    return GameStateResponse(
        game_id=g.id,
        status=g.status,
        elo_bucket=g.elo_bucket,
        player_color=g.player_color,
        start_fen=g.start_fen,
        current_fen=g.current_fen,
        moves_uci=g.moves_uci.split() if g.moves_uci.strip() else [],
        pgn=g.pgn or "",
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

        # outcome logic here
        outcome = None
        winner = None
        if board.is_checkmate():
            outcome = "checkmate"
            # winner is opposite of turn current turn just got mated
            winner = "white" if board.turn == chess.BLACK else "black"
        elif board.is_stalemate():
            outcome = "stalemate"
        elif board.is_insufficient_material():
            outcome = "insufficient_material"
        elif board.can_claim_fifty_moves():
            outcome = "fifty_move"
        elif board.can_claim_threefold_repetition():
            outcome = "threefold"
        else:
            outcome = "draw"

        return MoveResponse(
            game_id=g.id,
            fen_before=fen_before,
            move_uci=req.move_uci,
            fen_after=fen_after,
            engine_reply_uci=None,
            fen_after_engine=None,
            eval_white_cp=None,
            mate_white=None,
            eval_player_cp=None,
            mate_player=None,
            pv=[],
            top_moves=[],
            game_over=True,
            outcome=outcome,
            winner=winner,
        )

    # Engine reply + analysis (analyze position after user's move)
    engine_reply, analysis = choose_engine_reply(fen_after, g.elo_bucket)

    fen_after_engine = None
    if engine_reply:
        try:
            engine_move = board.parse_uci(engine_reply)
            if engine_move in board.legal_moves:
                board.push(engine_move)
                fen_after_engine = board.fen()
            else:
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
    
    # Check if game ended after engine move
    game_over = board.is_game_over(claim_draw=True)
    outcome = None
    winner = None
    
    if game_over:
        g.pgn = _compute_pgn(g)
        g.status = "finished"
        
        # Detect outcome type
        if board.is_checkmate():
            outcome = "checkmate"
            winner = "white" if board.turn == chess.BLACK else "black"
            print(f"CHECKMATE DETECTED! Winner: {winner}, Current turn: {board.turn}")
        elif board.is_stalemate():
            outcome = "stalemate"
            print("STALEMATE DETECTED!")
        elif board.is_insufficient_material():
            outcome = "insufficient_material"
        elif board.can_claim_fifty_moves():
            outcome = "fifty_move"
        elif board.can_claim_threefold_repetition():
            outcome = "threefold"
        else:
            outcome = "draw"
        
        print(f"Game Over! Outcome: {outcome}, Winner: {winner}")
    else:
        print(f"Game continues. Board state: {board.fen()[:50]}...")
    
    repo.save_game(db, g)

    # ----- Build coaching payload (both White POV and Player POV) -----
    # Raw engine best-line values
    raw_eval = analysis.lines[0].eval_cp if analysis.lines else None
    raw_mate = analysis.lines[0].mate if analysis.lines else None
    pv = analysis.lines[0].pv if analysis.lines and analysis.lines[0].pv else []

    analyzed_board = chess.Board(fen_after)  # this is the position Stockfish analyzed (after user's move)

    # Canonical: White POV (positive means White better)
    eval_white = raw_eval
    mate_white = raw_mate
    if analyzed_board.turn == chess.BLACK:
        # Flip if engine score is from side-to-move POV
        if eval_white is not None:
            eval_white = -eval_white
        if mate_white is not None:
            mate_white = -mate_white

    # Player POV: positive means USER better
    eval_player = eval_white
    mate_player = mate_white
    if g.player_color == "black":
        if eval_player is not None:
            eval_player = -eval_player
        if mate_player is not None:
            mate_player = -mate_player

    # top_moves: include both POVs for each candidate
    top_moves: list[AnalysisLine] = []
    for line in analysis.lines[:3]:
        if not line.pv:
            continue

        line_eval = line.eval_cp
        line_mate = line.mate

        # Convert candidate to White POV
        line_eval_white = line_eval
        line_mate_white = line_mate
        if analyzed_board.turn == chess.BLACK:
            if line_eval_white is not None:
                line_eval_white = -line_eval_white
            if line_mate_white is not None:
                line_mate_white = -line_mate_white

        # Convert candidate to Player POV
        line_eval_player = line_eval_white
        line_mate_player = line_mate_white
        if g.player_color == "black":
            if line_eval_player is not None:
                line_eval_player = -line_eval_player
            if line_mate_player is not None:
                line_mate_player = -line_mate_player

        top_moves.append(
            AnalysisLine(
                move=line.pv[0],
                eval_white_cp=line_eval_white,
                mate_white=line_mate_white,
                eval_player_cp=line_eval_player,
                mate_player=line_mate_player,
            )
        )

    # ----- Generate LLM coaching response -----
    llm_response = None
    if not game_over:
        try:
            llm_client = LLMClient()
            llm_response = llm_client.hint_from_analysis(analysis, g.elo_bucket)
        except Exception as e:
            print(f"LLM coaching call failed: {e}")
            llm_response = None

    print(f"Returning response: game_over={game_over}, outcome={outcome}, winner={winner}")
    
    return MoveResponse(
        game_id=g.id,
        fen_before=fen_before,
        move_uci=req.move_uci,
        fen_after=fen_after,
        engine_reply_uci=engine_reply,
        fen_after_engine=fen_after_engine,
        eval_white_cp=eval_white,
        mate_white=mate_white,
        eval_player_cp=eval_player,
        mate_player=mate_player,
        pv=pv,
        top_moves=top_moves,
        game_over=game_over,
        outcome=outcome,
        winner=winner,
        llm_response=llm_response,
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
