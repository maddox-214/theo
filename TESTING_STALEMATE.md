# testing stalemate logic - quick reference

## how to test manually

### 1. stalemate scenario
the easiest way to create a stalemate is to play a position where the opponent has no legal moves but is not in check.

**simple stalemate position to test:**
1. start a new game at beginner level
2. play moves to reach this position:
   - white king on a1
   - white queen on c2
   - black king on a3
   - black's turn
   
3. white plays qa2 - this is stalemate (black king has no legal moves, not in check)

**expected behavior:**
- game over overlay appears immediately
- title shows "stalemate"
- message says "no legal moves available"
- board is locked (cannot click pieces)
- dialog updates to stalemate message
- "return to menu" button available

### 2. checkmate scenario
**fool's mate (fastest checkmate):**
1. start new game as white
2. play: f3, e5, g4, qh4# (checkmate)

**expected behavior:**
- game over overlay with "defeat" title (since you let the opponent win)
- message about the outcome
- winner correctly identified
- board locked

### 3. testing from browser console

you can test stalemate detection by making api calls directly:

```javascript
// create a game with a stalemate position (one move away)
const stalemateGame = await fetch('http://localhost:8000/api/games', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    elo: 1200,
    player_color: 'black'
  })
}).then(r => r.json());

// note: you'd need to manually set up the board to a near-stalemate position
// this is just for api testing
```

## visual indicators to check

✅ **before game over:**
- pieces can be selected (highlight appears)
- legal move indicators show
- turn indicator shows whose turn it is
- evaluation score updates

✅ **after game over:**
- dark overlay covers board
- large modal in center with outcome
- gold border on modal
- appropriate title (victory/defeat/stalemate/draw)
- descriptive message explaining outcome
- return to menu button visible
- board completely locked (clicking does nothing)
- instructor dialog updates to match outcome

## outcome types to test

1. **stalemate** - no legal moves, not in check
2. **checkmate** - king is in check and no legal escape
3. **insufficient material** - impossible to checkmate (k vs k, k+b vs k, k+n vs k)
4. **fifty move rule** - 50 moves without capture or pawn move
5. **threefold repetition** - same position occurs 3 times

## common stalemate patterns

### pattern 1: queen vs lone king
- attacker's queen traps defender's king on edge/corner
- queen moves too close, removing all escape squares
- example: black king on a8, white king on c7, white queen plays qa6

### pattern 2: pawn endgame
- defender's king blocked by attacker's pawns
- defender has no legal moves but isn't in check

### pattern 3: underpromotion scenario
- wrong promotion creates stalemate instead of checkmate

## debugging tips

**if game doesn't end when expected:**
- check backend logs (terminal 28188.txt or similar)
- check browser console for response data
- verify `game_over: true` in api response
- confirm `outcome` field has correct value

**if overlay doesn't appear:**
- check react state in devtools
- verify `gameOver` state is true
- check for javascript errors in console

**if wrong message shows:**
- compare `response.outcome` value to expected
- verify dialog logic in `handlePlayerMove`
- check outcome detection in backend `games.py`

## quick verification checklist

- [ ] stalemate detected correctly
- [ ] checkmate detected correctly  
- [ ] winner identified correctly in checkmate
- [ ] board locks after game over
- [ ] overlay appears with correct styling
- [ ] dialog message matches outcome
- [ ] turn indicator shows game over state
- [ ] can return to menu after game ends
- [ ] normal games don't falsely trigger game over
- [ ] draw types (insufficient material, etc) work
