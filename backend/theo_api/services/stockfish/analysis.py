import random
from theo_api.services.stockfish.engine import StockfishUCI, EngineAnalysis
from theo_api.services.stockfish.difficulty import get_difficulty


def analyze_position(fen: str, elo_bucket: int) -> EngineAnalysis:
    diff = get_difficulty(elo_bucket)
    engine = StockfishUCI()
    try:
        engine.set_option("Skill Level", diff.skill_level)
        # Optional: make weaker play more human by reducing strength a bit
        # engine.set_option("UCI_LimitStrength", "true")  # not always supported consistently
        return engine.analyze(fen=fen, movetime_ms=diff.movetime_ms, depth=diff.depth, multipv=diff.multipv)
    finally:
        engine.close()


def choose_engine_reply(fen: str, elo_bucket: int) -> tuple[str | None, EngineAnalysis]:
    """
    Returns (reply_move_uci, analysis).
    For low Elo, optionally choose from top N lines.
    """
    diff = get_difficulty(elo_bucket)
    analysis = analyze_position(fen, elo_bucket)

    reply = analysis.best_move
    if analysis.lines and diff.choose_top_n > 1:
        # choose from the best N PV first moves (if available)
        candidates = []
        for line in analysis.lines[: diff.choose_top_n]:
            if line.pv:
                candidates.append(line.pv[0])
        if candidates:
            # Weighted: prefer best line but allow mistakes at low Elo
            # Example weights for N=3 => [0.65, 0.25, 0.10]
            weights = []
            for i in range(len(candidates)):
                weights.append(max(0.05, 0.7 / (i + 1)))
            s = sum(weights)
            weights = [w / s for w in weights]
            reply = random.choices(candidates, weights=weights, k=1)[0]

    return reply, analysis
