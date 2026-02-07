from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from typing import Optional

from theo_api.services.stockfish.difficulty import clamp_bucket
import theo_api.services.stockfish.analysis as analysis_mod
from theo_api.services.llm.client import get_hint_for_async
from theo_api.core.rate_limit import rate_limit_dependency

router = APIRouter(prefix="/games", tags=["games"])


class AnalyzeRequest(BaseModel):
    fen: str
    elo: int


class AnalyzeResponse(BaseModel):
    move_uci: Optional[str]
    move_san: Optional[str]
    hint: str


class MoveRequest(BaseModel):
    fen: str
    move_uci: str
    elo: int


class MoveResponse(BaseModel):
    fen_before: str
    move_uci: str
    fen_after: str
    engine_reply_uci: Optional[str]
    fen_after_engine: Optional[str]
    hint: str


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze(req: AnalyzeRequest, _rl=Depends(rate_limit_dependency)):
    elo_bucket = clamp_bucket(req.elo)
    try:
        move_uci, analysis = analysis_mod.choose_engine_reply(req.fen, elo_bucket)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    san = None
    try:
        import chess

        board = chess.Board(req.fen)
        if move_uci:
            san = board.san(chess.Move.from_uci(move_uci))
    except Exception:
        san = None

    hint = await get_hint_for_async(analysis, elo_bucket)
    return AnalyzeResponse(move_uci=move_uci, move_san=san, hint=hint)


@router.post("/move", response_model=MoveResponse)
async def submit_move(req: MoveRequest, _rl=Depends(rate_limit_dependency)):
    elo_bucket = clamp_bucket(req.elo)

    try:
        import chess
    except Exception:
        raise HTTPException(status_code=503, detail="chess package required for move validation")

    board = chess.Board(req.fen)
    try:
        user_move = board.parse_uci(req.move_uci)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid UCI move format")

    if user_move not in board.legal_moves:
        raise HTTPException(status_code=400, detail="Illegal move")

    board.push(user_move)
    fen_after = board.fen()

    # Engine reply after user's move
    engine_reply, analysis = analysis_mod.choose_engine_reply(fen_after, elo_bucket)
    fen_after_engine = None
    if engine_reply:
        try:
            engine_move = board.parse_uci(engine_reply)
            if engine_move in board.legal_moves:
                board.push(engine_move)
                fen_after_engine = board.fen()
            else:
                engine_reply = None
        except Exception:
            engine_reply = None

    hint = await get_hint_for_async(analysis, elo_bucket)

    return MoveResponse(
        fen_before=req.fen,
        move_uci=req.move_uci,
        fen_after=fen_after,
        engine_reply_uci=engine_reply,
        fen_after_engine=fen_after_engine,
        hint=hint,
    )
