from fastapi.testclient import TestClient
from theo_api.main import app

import theo_api.services.stockfish.analysis as analysis_mod

client = TestClient(app)


def test_coach_hint_endpoint(monkeypatch):
    # Monkeypatch choose_engine_reply to return a deterministic move and analysis
    def fake_choose(fen, elo):
        # create a minimal EngineAnalysis-like object
        class Line:
            def __init__(self):
                self.pv = ["e2e4"]
                self.eval_cp = 20
                self.mate = None
                self.depth = 10

        class EA:
            def __init__(self):
                self.fen = fen
                self.lines = [Line()]
                self.best_move = "e2e4"

        return "e2e4", EA()

    monkeypatch.setattr(analysis_mod, "choose_engine_reply", fake_choose)
    # Prevent real LLM/API calls during tests
    async def fake_hint_async(analysis, elo):
        return "Test hint"

    import theo_api.services.llm.client as llm_mod
    monkeypatch.setattr(llm_mod, "get_hint_for_async", fake_hint_async)

    resp = client.post("/api/coach/hint", json={"fen": "startpos", "elo": 1200})
    assert resp.status_code == 200
    data = resp.json()
    assert "move_uci" in data and "hint" in data
    assert data["move_uci"] == "e2e4"
