from dataclasses import dataclass

# Stockfish UCI options vary by version, but Skill Level is stable (0-20).
# We'll mostly tune via:
# - Skill Level
# - (Depth or MoveTime)
# - Small randomness by sometimes choosing #2 line for low Elo

@dataclass(frozen=True)
class Difficulty:
    skill_level: int          # 0..20
    movetime_ms: int          # time per move (ms)
    depth: int | None         # optional
    multipv: int              # how many lines to analyze
    choose_top_n: int         # pick from top N moves (adds human-ish play)


def clamp_bucket(elo: int) -> int:
    # Normalize to buckets you support
    buckets = [400, 800, 1200, 1600, 2000]
    return min(buckets, key=lambda b: abs(b - elo))


def get_difficulty(elo_bucket: int) -> Difficulty:
    b = clamp_bucket(elo_bucket)

    if b <= 400:
        return Difficulty(skill_level=2, movetime_ms=50, depth=6, multipv=3, choose_top_n=3)
    if b <= 800:
        return Difficulty(skill_level=6, movetime_ms=100, depth=8, multipv=3, choose_top_n=2)
    if b <= 1200:
        return Difficulty(skill_level=10, movetime_ms=150, depth=10, multipv=3, choose_top_n=2)
    if b <= 1600:
        return Difficulty(skill_level=14, movetime_ms=250, depth=12, multipv=3, choose_top_n=1)
    return Difficulty(skill_level=18, movetime_ms=400, depth=14, multipv=3, choose_top_n=1)
