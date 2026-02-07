import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, Text, Integer
from sqlalchemy.orm import Mapped, mapped_column
from theo_api.services.storage.db import Base


class Game(Base):
    __tablename__ = "games"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    elo_bucket: Mapped[int] = mapped_column(Integer, nullable=False)
    player_color: Mapped[str] = mapped_column(String(5), nullable=False)  # "white" or "black"

    start_fen: Mapped[str] = mapped_column(Text, nullable=False)
    current_fen: Mapped[str] = mapped_column(Text, nullable=False)

    moves_uci: Mapped[str] = mapped_column(Text, default="", nullable=False)  # space-separated
    pgn: Mapped[str] = mapped_column(Text, default="", nullable=False)
    status: Mapped[str] = mapped_column(String(12), default="active", nullable=False)  # active/finished
