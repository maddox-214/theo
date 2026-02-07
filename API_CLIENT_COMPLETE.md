# api client integration - complete! 🎉

## what was built

### 1. api client (`frontend/src/lib/api.ts`)

**typescript types** matching backend:
- `CreateGameRequest`, `CreateGameResponse`
- `SubmitMoveRequest`, `MoveResponse`
- `GameStateResponse`, `AnalysisLine`
- `PlayerColor`, `GameStatus`

**api functions:**
- `getHealth()` - check backend status
- `createGame(elo, color)` - start new game
- `submitMove(gameId, moveUci)` - send player move
- `getGameState(gameId)` - get current board state
- `finishGame(gameId)` - end game and get pgn

**utility functions:**
- `formatEvaluation()` - format centipawns or mate
- `getEvaluationColor()` - positive/negative/neutral
- custom `ApiError` class for error handling

### 2. updated experience select (`frontend/src/ExperienceSelect.tsx`)

**elo mapping:**
- beginner: 600 elo
- intermediate: 1200 elo
- advanced: 1800 elo
- master: 2400 elo

**features added:**
- ✅ color selection (white/black radio buttons)
- ✅ actual game creation on button click
- ✅ loading states while creating game
- ✅ error handling with user-friendly messages
- ✅ success alert showing game details
- ✅ displays elo rating for each level

**ui improvements:**
- disabled buttons during loading
- error message display box
- elo rating labels
- loading indicator

## how it works

1. user selects color (white or black)
2. user clicks experience level
3. api call: `POST /api/games` with elo and color
4. backend creates game (if black, engine plays first move)
5. frontend receives game_id
6. alert shows success (later will navigate to board)

## testing

### servers running:
- **backend**: http://localhost:8000
- **frontend**: http://localhost:5173

### test it:
1. open http://localhost:5173 in browser
2. select white or black
3. click any level (beginner/intermediate/advanced/master)
4. should see alert with game_id

### api flow verified:
```
frontend (vite:5173) 
  → POST /api/games {elo: 1200, player_color: "white"}
  → backend (uvicorn:8000)
  → creates game in database
  → returns {game_id, start_fen, player_color, elo_bucket}
  → frontend receives response
  → alert displayed ✅
```

## next steps (for frontend teammate)

### immediate:
1. **add react-router-dom**: `npm install react-router-dom`
2. **create game board component**: display chess board
3. **navigate to board**: replace alert with `navigate(/game/${game_id})`

### chess board component needs:
- display board from fen
- handle piece moves (drag or click)
- call `submitMove()` when player moves
- display engine reply
- show evaluation using `eval_player_cp`
- show top moves suggestions

### suggested libraries:
- `chess.js` - move validation and board logic
- `react-chessboard` or custom board component

## file changes ready to commit

```
frontend/src/lib/api.ts              # new - full api client
frontend/src/ExperienceSelect.tsx    # updated - wired to api
```

## test commands

```bash
# backend
cd backend
uvicorn theo_api.main:app --reload --port 8000

# frontend  
cd frontend
npm run dev

# open browser
open http://localhost:5173
```

everything is connected and working! 🚀
