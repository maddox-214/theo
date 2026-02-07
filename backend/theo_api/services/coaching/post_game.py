from theo_api.services.llm.client import LLMClient

def post_game_summary(pgn_or_moves: str, elo_bucket: int) -> str:
	"""Generate a short post-game summary and improvement tips.

	This uses the LLM when available; otherwise returns a small template.
	"""
	client = LLMClient()
	try:
		system = (
			"You are a friendly, encouraging chess coach. Summarize the game in 2-3 simple sentences and provide three practical tips tailored to the player's level. "
			"Avoid technical engine scores; focus on what the player can practice next."
		)
		user = f"Player elo bucket: {elo_bucket}\nGame moves or PGN:\n{pgn_or_moves}"
		return client.chat([{"role": "system", "content": system}, {"role": "user", "content": user}], temperature=0.6, max_tokens=400)
	except Exception:
		return "Post-game summary: Review opening principles, practice tactics, and analyze key mistakes. Tips: 1) Solve tactical puzzles; 2) Review missed tactics; 3) Practice endgames."
