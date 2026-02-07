from pydantic import BaseModel, Field
from typing import Optional


class HintRequest(BaseModel):
    fen: str
    elo: int = Field(ge=100, le=3000)


class HintResponse(BaseModel):
    move_uci: Optional[str]
    move_san: Optional[str]
    hint: str
