import types
import sys
import types as _types

import pytest

# Provide a tiny fake 'chess' module for tests so imports don't require the external package.
if "chess" not in sys.modules:
	fake_chess = _types.SimpleNamespace()

	class FakeMove:
		def __init__(self, uci):
			self.uci = uci

		def __str__(self):
			return self.uci

		@classmethod
		def from_uci(cls, u):
			return cls(u)

	class FakeBoard:
		def __init__(self, fen):
			self.fen = fen

		def san(self, move):
			# return a human-friendly representation for tests
			return str(move)

	fake_chess.Move = FakeMove
	fake_chess.Board = FakeBoard
	sys.modules["chess"] = fake_chess

from theo_api.services.stockfish.engine import EngineAnalysis, UciLine


def make_sample_analysis() -> EngineAnalysis:
	lines = [UciLine(pv=["e2e4", "e7e5"], eval_cp=50, mate=None, depth=10)]
	return EngineAnalysis(fen="testfen", lines=lines, best_move="e2e4")


def test_llm_fallback_hint_contains_try_and_alternatives(monkeypatch):
	import os
	from theo_api.services.llm.client import get_hint_for

	# ensure no OPENAI_API_KEY is visible so the deterministic fallback is used
	monkeypatch.delenv("OPENAI_API_KEY", raising=False)

	analysis = make_sample_analysis()
	hint = get_hint_for(analysis, 1200)
	assert isinstance(hint, str)
	# fallback wording starts with Try or similar; be permissive and accept 'Try' or 'Play'
	assert any(w in hint for w in ("Try", "try", "Play", "play"))


def test_live_coach_get_live_hint_structure(monkeypatch):
	from theo_api.services.coaching.live_coach import get_live_hint

	# monkeypatch choose_engine_reply to return deterministic results
	def fake_choose(fen, elo):
		return "e2e4", make_sample_analysis()

	import theo_api.services.stockfish.analysis as analysis_mod
	monkeypatch.setattr(analysis_mod, "choose_engine_reply", fake_choose)

	res = get_live_hint("somefen", 800)
	assert isinstance(res, dict)
	assert set(["move_uci", "move_san", "hint", "analysis"]).issubset(res.keys())


def test_explain_move_returns_string(monkeypatch):
	from theo_api.services.coaching.explain_move import explain_move

	# monkeypatch analyze_position to avoid launching stockfish
	def fake_analyze(fen, elo):
		return make_sample_analysis()

	import theo_api.services.stockfish.analysis as analysis_mod
	monkeypatch.setattr(analysis_mod, "analyze_position", fake_analyze)

	out = explain_move("fen", None, 1000)
	assert isinstance(out, str)


def test_post_game_summary_returns_string():
	from theo_api.services.coaching.post_game import post_game_summary

	out = post_game_summary("1. e4 e5 2. Nf3 Nc6", 1200)
	assert isinstance(out, str)
