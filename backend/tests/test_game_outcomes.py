"""
test game outcome detection (stalemate, checkmate, draws)
"""
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import chess

from theo_api.main import app
from theo_api.services.storage.db import Base, get_db
from theo_api.services.storage import repo


# setup test db
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base.metadata.create_all(bind=engine)


def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


def test_stalemate_detection():
    """
    test that stalemate is properly detected
    using a known stalemate position
    """
    # create game with stalemate position (one move away)
    # white king on a8, black king on c7, black queen on c6
    # if black plays qa6, it's stalemate
    stalemate_fen = "7k/2K5/2q5/8/8/8/8/8 b - - 0 1"
    
    db = TestingSessionLocal()
    g = repo.create_game(db, elo_bucket=1200, player_color="black", start_fen=stalemate_fen)
    game_id = g.id
    db.close()
    
    # make the stalemate move (qa6)
    response = client.post(
        f"/api/games/{game_id}/move",
        json={"move_uci": "c6a6"}
    )
    
    assert response.status_code == 200
    data = response.json()
    
    assert data["game_over"] is True
    assert data["outcome"] == "stalemate"
    assert data["winner"] is None
    assert data["engine_reply_uci"] is None  # no engine reply after game over


def test_checkmate_detection():
    """
    test that checkmate is properly detected
    """
    # back rank mate in one - white to move, rook to h8 is mate
    mate_fen = "6kr/5ppp/8/8/8/8/5PPP/6KR w - - 0 1"
    
    db = TestingSessionLocal()
    g = repo.create_game(db, elo_bucket=1200, player_color="white", start_fen=mate_fen)
    game_id = g.id
    db.close()
    
    # deliver checkmate
    response = client.post(
        f"/api/games/{game_id}/move",
        json={"move_uci": "h1h8"}
    )
    
    assert response.status_code == 200
    data = response.json()
    
    assert data["game_over"] is True
    assert data["outcome"] == "checkmate"
    assert data["winner"] == "white"
    assert data["engine_reply_uci"] is None


def test_insufficient_material():
    """
    test that insufficient material draws are detected
    """
    # just two kings
    km_fen = "8/8/8/4k3/8/4K3/8/8 w - - 0 1"
    
    db = TestingSessionLocal()
    g = repo.create_game(db, elo_bucket=1200, player_color="white", start_fen=km_fen)
    game_id = g.id
    db.close()
    
    # make any legal move
    response = client.post(
        f"/api/games/{game_id}/move",
        json={"move_uci": "e3e2"}
    )
    
    assert response.status_code == 200
    data = response.json()
    
    assert data["game_over"] is True
    assert data["outcome"] == "insufficient_material"
    assert data["winner"] is None


def test_game_continues_normally():
    """
    test that normal games don't trigger false game-over
    """
    response = client.post(
        "/api/games",
        json={"elo": 1500, "player_color": "white"}
    )
    
    assert response.status_code == 200
    game_id = response.json()["game_id"]
    
    # make normal opening move
    response = client.post(
        f"/api/games/{game_id}/move",
        json={"move_uci": "e2e4"}
    )
    
    assert response.status_code == 200
    data = response.json()
    
    assert data["game_over"] is False
    assert data["outcome"] is None
    assert data["winner"] is None
    assert data["engine_reply_uci"] is not None  # engine should reply


if __name__ == "__main__":
    print("Running game outcome tests...")
    
    print("\n1. Testing stalemate detection...")
    test_stalemate_detection()
    print("✓ Stalemate test passed!")
    
    print("\n2. Testing checkmate detection...")
    test_checkmate_detection()
    print("✓ Checkmate test passed!")
    
    print("\n3. Testing insufficient material...")
    test_insufficient_material()
    print("✓ Insufficient material test passed!")
    
    print("\n4. Testing normal game continuation...")
    test_game_continues_normally()
    print("✓ Normal game test passed!")
    
    print("\n✅ All tests passed!")
