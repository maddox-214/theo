# api client ready for frontend integration

## what was created

### api client (`frontend/src/lib/api.ts`)

**complete typescript api client** with:

#### types (matching backend exactly):
```typescript
PlayerColor = "white" | "black"
GameStatus = "active" | "finished"
CreateGameRequest, CreateGameResponse
SubmitMoveRequest, MoveResponse
GameStateResponse, AnalysisLine
```

#### api functions:
```typescript
getHealth()                          // check backend status
createGame(elo, color)               // start new game
submitMove(gameId, moveUci)          // send player move
getGameState(gameId)                 // get current board
finishGame(gameId)                   // end game, get pgn
```

#### features:
- ✅ configurable base url from `VITE_API_BASE_URL` env var
- ✅ custom `ApiError` class with status codes
- ✅ proper error handling and network error messages
- ✅ json content-type headers
- ✅ utility functions: `formatEvaluation()`, `getEvaluationColor()`

## how to use in components

### example: create a game
```typescript
import { createGame } from './lib/api';

const handleStartGame = async () => {
  try {
    const game = await createGame(1200, "white");
    console.log(game.game_id);        // "abc-123-..."
    console.log(game.elo_bucket);     // 1200
    console.log(game.player_color);   // "white"
    // navigate to game board...
  } catch (error) {
    if (error instanceof ApiError) {
      console.error(error.message, error.status);
    }
  }
};
```

### example: submit a move
```typescript
import { submitMove } from './lib/api';

const handleMove = async (gameId: string, move: string) => {
  try {
    const response = await submitMove(gameId, move);
    console.log(response.engine_reply_uci);  // engine's move
    console.log(response.eval_player_cp);    // evaluation from player's pov
    console.log(response.top_moves);         // top 3 suggested moves
  } catch (error) {
    console.error(error);
  }
};
```

### example: get game state
```typescript
import { getGameState } from './lib/api';

const loadGame = async (gameId: string) => {
  const state = await getGameState(gameId);
  console.log(state.current_fen);    // current position
  console.log(state.moves_uci);      // all moves: ["e2e4", "e7e5", ...]
  console.log(state.status);         // "active" or "finished"
};
```

## evaluation data explained

backend returns **dual perspective evaluations**:

```typescript
{
  eval_white_cp: 150,        // white's perspective (+ = white better)
  mate_white: null,
  eval_player_cp: -150,      // player's perspective (+ = player better)
  mate_player: null,
}
```

**use `eval_player_cp` for ui** - it's always from the player's perspective regardless of color choice.

**utility function:**
```typescript
import { formatEvaluation } from './lib/api';

formatEvaluation(150, null)   // "+1.5"
formatEvaluation(-200, null)  // "-2.0"
formatEvaluation(null, 3)     // "M3"
```

## configuration

### environment variable
```bash
# frontend/.env
VITE_API_BASE_URL=http://localhost:8000/api
```

### change at runtime (optional)
```typescript
// if you need to override
const customUrl = "https://api.production.com/api";
// modify api.ts API_BASE_URL constant
```

## testing the api client

### manual test in component:
```typescript
import { getHealth, createGame } from './lib/api';

// test health
const health = await getHealth();
console.log(health.status);  // "ok"

// test game creation
const game = await createGame(1200, "white");
console.log(game);
```

### servers must be running:
```bash
# terminal 1 - backend
cd backend
uvicorn theo_api.main:app --port 8000

# terminal 2 - frontend
cd frontend
npm run dev
```

## next steps for frontend teammate

1. **wire up experience select** (when ready):
   - import `createGame` function
   - add elo values to levels
   - call api on button click
   - navigate to game board

2. **build chess board component**:
   - display board from fen
   - handle piece moves
   - call `submitMove()` 
   - show `eval_player_cp`
   - display top moves

3. **add dependencies**:
   ```bash
   npm install react-router-dom
   npm install chess.js  # for move validation
   ```

## file ready to commit

```
frontend/src/lib/api.ts  # complete api client
```

commit message:
```
add typescript api client for backend integration

- full type definitions matching backend schemas
- api functions: createGame, submitMove, getGameState, finishGame
- error handling with custom ApiError class
- utility functions for formatting evaluations
- configurable base url from env var
```

everything is ready for integration! 🚀
