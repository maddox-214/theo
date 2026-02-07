from pydantic import BaseModel, Field
from typing import Literal, Optional

Color = Literal["white", "black"]


class CreateGameRequest(BaseModel):
    elo: int = Field(ge=100, le=3000)
    player_color: Color = "white"


class CreateGameResponse(BaseModel):
    game_id: str
    start_fen: str
    player_color: Color
    elo_bucket: int


class SubmitMoveRequest(BaseModel):
    move_uci: str  # e2e4, g1f3, etc.


class AnalysisLine(BaseModel):
    move: str
    # Canonical POV (always White)
    eval_white_cp: Optional[int] = None
    mate_white: Optional[int] = None
    # Player POV (positive means USER is better, respects chosen color)
    eval_player_cp: Optional[int] = None
    mate_player: Optional[int] = None


class MoveResponse(BaseModel):
    game_id: str
    fen_before: str
    move_uci: str
    fen_after: str

    engine_reply_uci: Optional[str] = None
    fen_after_engine: Optional[str] = None

    # Canonical POV (always White)
    eval_white_cp: Optional[int] = None
    mate_white: Optional[int] = None

    # Player POV (positive means USER is better)
    eval_player_cp: Optional[int] = None
    mate_player: Optional[int] = None

    pv: list[str] = []
    top_moves: list[AnalysisLine] = []


class GameStateResponse(BaseModel):
    game_id: str
    status: str
    elo_bucket: int
    player_color: Color
    start_fen: str
    current_fen: str
    moves_uci: list[str]
    pgn: str
