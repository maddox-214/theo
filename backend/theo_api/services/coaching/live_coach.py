import theo_api.services.stockfish.analysis as analysis_mod
from theo_api.services.llm.client import get_hint_for
import chess


def get_live_hint(fen: str, elo_bucket: int) -> dict:
	"""Returns an engine-chosen move and a short LLM-produced hint.

	The return value includes UCI move, SAN move (when convertible),
	the textual hint, and the raw analysis object.
	"""
	move_uci, analysis = analysis_mod.choose_engine_reply(fen, elo_bucket)

	san = None
	try:
		board = chess.Board(fen)
		if move_uci:
			san = board.san(chess.Move.from_uci(move_uci))
	except Exception:
		san = None

	hint = get_hint_for(analysis, elo_bucket)

	return {"move_uci": move_uci, "move_san": san, "hint": hint, "analysis": analysis}

