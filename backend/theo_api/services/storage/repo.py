from sqlalchemy.orm import Session
from theo_api.services.storage.models import Game


def create_game(db: Session, *, elo_bucket: int, player_color: str, start_fen: str) -> Game:
    g = Game(
        elo_bucket=elo_bucket,
        player_color=player_color,
        start_fen=start_fen,
        current_fen=start_fen,
        moves_uci="",
        pgn="",
        status="active",
    )
    db.add(g)
    db.commit()
    db.refresh(g)
    return g


def get_game(db: Session, game_id: str) -> Game | None:
    return db.get(Game, game_id)


def save_game(db: Session, game: Game) -> Game:
    db.add(game)
    db.commit()
    db.refresh(game)
    return game
