from theo_api.services.stockfish.difficulty import get_difficulty, clamp_bucket


def test_clamp_bucket_rounds_to_nearest():
	assert clamp_bucket(50) == 400
	assert clamp_bucket(700) == 800
	assert clamp_bucket(1300) == 1200
	assert clamp_bucket(1700) == 1600


def test_get_difficulty_returns_expected_fields():
	d = get_difficulty(400)
	assert hasattr(d, "skill_level")
	assert hasattr(d, "movetime_ms")
	assert hasattr(d, "depth")
	assert hasattr(d, "multipv")
	assert hasattr(d, "choose_top_n")

	# sanity ranges
	assert 0 <= d.skill_level <= 20
	assert d.movetime_ms > 0
