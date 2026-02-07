# frontend integration analysis

## what the frontend team added

### setup complete:
- ✅ react 19 + typescript + vite
- ✅ full package.json with all dependencies
- ✅ eslint configuration
- ✅ chess piece images (regular + tiny versions)
- ✅ basic ui components

### current state:
- **ExperienceSelect component**: level selection ui (beginner → master)
  - currently just logs to console
  - needs to map to elo ratings and create game
- **App.tsx**: renders ExperienceSelect component
- **No API integration yet**: `src/lib/` folder was deleted

## what needs to be connected

### 1. create api client (`src/lib/api.ts`)
needs to implement:
- `createGame(elo: number, playerColor: "white" | "black")` → game_id
- `submitMove(gameId: string, moveUci: string)` → engine reply + analysis
- `getGameState(gameId: string)` → full game state
- `finishGame(gameId: string)` → final pgn

### 2. map experience levels to elo
in `ExperienceSelect.tsx`:
- beginner → 400-800 elo
- intermediate → 1000-1400 elo  
- advanced → 1600-2000 elo
- master → 2200+ elo

### 3. add routing
needs react-router to navigate:
- `/` → ExperienceSelect
- `/game/:gameId` → ChessBoard component

### 4. create game board component
needs:
- display current board state
- handle piece moves (drag & drop or click)
- show engine reply
- display evaluation (use `eval_player_cp` from api)
- show top moves suggestions

### 5. handle player color selection
add color picker ui before starting game

## immediate next steps

1. **create api client** with typescript types
2. **wire up experience select** to create game on button click
3. **add chess.js** dependency for move validation
4. **test api connection** with backend running

ready to implement?
