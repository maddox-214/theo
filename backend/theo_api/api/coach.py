from fastapi import APIRouter, HTTPException, Depends
from theo_api.core.rate_limit import rate_limit_dependency

from theo_api.schemas.coach import HintRequest, HintResponse
from theo_api.services.stockfish.difficulty import clamp_bucket
import theo_api.services.stockfish.analysis as analysis_mod

router = APIRouter(prefix="/coach", tags=["coach"])


@router.post("/hint", response_model=HintResponse)
async def coach_hint(req: HintRequest, _rl=Depends(rate_limit_dependency)):
    # normalize elo
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
        # If python-chess is not installed or parsing fails, continue without SAN
        san = None

    # Build a hint using the async LLM client (or fallback)
    from theo_api.services.llm.client import get_hint_for_async

    hint = await get_hint_for_async(analysis, elo_bucket)

    return HintResponse(move_uci=move_uci, move_san=san, hint=hint)
