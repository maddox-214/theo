import types

from theo_api.services.stockfish.engine import _parse_info, UciLine, EngineAnalysis


def test_parse_info_cp_and_pv():
	line = "info depth 12 multipv 1 score cp 34 pv e2e4 e7e5 g1f3"
	parsed = _parse_info(line)
	assert parsed is not None
	mpv, uciline = parsed
	assert mpv == 1
	assert isinstance(uciline, UciLine)
	assert uciline.pv[0] == "e2e4"
	assert uciline.eval_cp == 34


def test_parse_info_mate_and_depth():
	line = "info depth 18 multipv 2 score mate -3 pv e2e4"
	parsed = _parse_info(line)
	assert parsed is not None
	mpv, uciline = parsed
	assert mpv == 2
	assert uciline.mate == -3


def test_engine_analysis_dataclass():
	# basic sanity for EngineAnalysis container
	ea = EngineAnalysis(fen="startfen", lines=[UciLine(pv=["e2e4"], eval_cp=20, mate=None, depth=10)], best_move="e2e4")
	assert ea.fen == "startfen"
	assert ea.best_move == "e2e4"
