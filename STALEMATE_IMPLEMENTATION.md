# stalemate logic implementation summary

## overview
comprehensive game outcome detection system for chess games including stalemate, checkmate, and various draw conditions.

## backend changes

### 1. schema updates (`backend/theo_api/schemas/games.py`)
added game outcome fields to `MoveResponse`:
- `game_over: bool` - indicates if game has ended
- `outcome: Optional[Literal[...]]` - specific outcome type:
  - `"checkmate"` - one side is checkmated
  - `"stalemate"` - no legal moves, not in check
  - `"insufficient_material"` - neither side can checkmate
  - `"fifty_move"` - 50 moves without capture or pawn move
  - `"threefold"` - same position repeated 3 times
  - `"draw"` - generic draw
- `winner: Optional[Color]` - winning player (null for draws)

### 2. api logic (`backend/theo_api/api/games.py`)
updated `submit_move` endpoint with two outcome detection points:

**after player's move:**
- checks `board.is_game_over(claim_draw=True)`
- if true, determines specific outcome type
- sets game status to "finished"
- returns response with no engine reply

**after engine's move:**
- checks `board.is_game_over(claim_draw=True)`
- determines outcome type if game ended
- updates game status
- includes outcome info in response

outcome detection logic:
```python
if board.is_checkmate():
    outcome = "checkmate"
    winner = "white" if board.turn == chess.BLACK else "black"
elif board.is_stalemate():
    outcome = "stalemate"
elif board.is_insufficient_material():
    outcome = "insufficient_material"
elif board.can_claim_fifty_moves():
    outcome = "fifty_move"
elif board.can_claim_threefold_repetition():
    outcome = "threefold"
else:
    outcome = "draw"
```

## frontend changes

### 1. type definitions (`frontend/src/lib/api.ts`)
updated `MoveResponse` interface to include:
- `game_over?: boolean`
- `outcome?: ...`
- `winner?: PlayerColor | null`

### 2. game state (`frontend/src/GameBoard.tsx`)
added state variables:
- `gameOver: boolean` - prevents further moves
- `gameOutcome: string | null` - stores outcome type
- `winner: string | null` - stores winning player

### 3. move handling
updated `handlePlayerMove`:
- processes `game_over` from backend response
- sets appropriate dialog messages based on outcome
- prevents further moves when game ends

updated `handleSquareClick`:
- blocks piece selection when `gameOver` is true

### 4. ui/ux enhancements

**turn indicator:**
- shows game outcome at top when game ends
- displays winner or draw type

**game over overlay:**
- semi-transparent overlay on board
- styled modal with:
  - large title (victory/defeat/stalemate/draw)
  - explanation text
  - "return to menu" button
- gold border and professional styling

**dialog messages:**
- stalemate: "stalemate! the game is a draw - no legal moves available."
- checkmate (win): "checkmate! you won! excellent play!"
- checkmate (loss): "checkmate! you've been defeated. study and try again!"
- insufficient material: "draw by insufficient material. neither side can checkmate."
- fifty move: "draw by the fifty-move rule. no progress in 50 moves."
- threefold: "draw by threefold repetition. position repeated three times."

## testing

created `backend/tests/test_game_outcomes.py` with test cases for:
- stalemate detection (qa6 stalemate position)
- checkmate detection (back rank mate)
- insufficient material (king vs king)
- normal game continuation (ensures no false positives)

## verification steps

to test the implementation:

1. **normal game:**
   - start a game
   - make legal moves
   - verify game continues normally
   - verify no false game-over triggers

2. **stalemate scenario:**
   - create a position with one legal move that causes stalemate
   - execute the move
   - verify overlay appears with "stalemate" message
   - verify board is locked from further moves

3. **checkmate scenario:**
   - play towards checkmate
   - deliver checkmate
   - verify "victory" or "defeat" message
   - verify winner is correctly identified

4. **draw scenarios:**
   - test positions with only kings (insufficient material)
   - verify draw detection and appropriate message

## technical details

**backend:**
- uses python-chess library's built-in game state detection
- `board.is_game_over(claim_draw=True)` checks all end conditions
- separate checks for each outcome type provide specific messages
- game status updated to "finished" in database
- pgn generated with correct result headers

**frontend:**
- chess.js maintains local game state
- backend is source of truth for outcomes
- ui locked after game over to prevent illegal states
- overlay uses portal-style rendering on top of board
- responsive to different outcome types

## files modified

backend:
- `backend/theo_api/schemas/games.py`
- `backend/theo_api/api/games.py`

frontend:
- `frontend/src/lib/api.ts`
- `frontend/src/GameBoard.tsx`

tests:
- `backend/tests/test_game_outcomes.py` (new)

## edge cases handled

1. game ends on player's move (before engine replies)
2. game ends on engine's move
3. multiple draw types (stalemate vs insufficient material)
4. proper winner detection for checkmate
5. locked board prevents moves after game over
6. appropriate messaging for each outcome type
