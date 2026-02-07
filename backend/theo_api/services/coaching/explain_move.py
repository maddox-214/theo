import theo_api.services.stockfish.analysis as analysis_mod
from theo_api.services.llm.client import LLMClient
import chess


def explain_move(fen: str, move_uci: str | None, elo_bucket: int) -> str:
	"""Produce a concise explanation for why `move_uci` is good or bad.

	Uses the LLM client when an API key is configured, otherwise returns
	a short deterministic explanation based on engine evals.
	"""
	analysis = analysis_mod.analyze_position(fen, elo_bucket)

	# If move not provided, use engine best move
	move = move_uci or analysis.best_move

	client = LLMClient()
	try:
		# Build a compact, beginner-friendly prompt describing the move and top lines
		lines = []
		for i, l in enumerate(analysis.lines[:3], start=1):
			pv = " ".join(l.pv) if l.pv else ""
			lines.append(f"Line {i}: pv={pv}")

		system = (
			"You are a friendly, encouraging chess coach. Explain in simple terms why a move is good or bad. "
			"Avoid engine jargon (no centipawn numbers); focus on ideas and what the player should watch for. "
			"Limit your response to 1-2 sentences, and keep it under 150 characters."
		)
		user = f"FEN: {fen}\nMove (uci): {move}\nEngine lines (for context):\n" + "\n".join(lines)
		response = client.chat([{"role": "system", "content": system}, {"role": "user", "content": user}], temperature=0.3, max_tokens=80)
		return response[:150]
	except Exception:
		# Fallback: simple deterministic message
		return f"Move {move or '(none)'} — suggested by the engine. Look for simple tactics and try to keep your pieces safe." 

