# Theo ♟️ — Your Chess AI Teacher (Stockfish + Coaching)

Theo isn’t just “play chess vs an engine.”  
Theo plays you at the level you choose, **teaches while you play**, and then gives you a **post-game breakdown** like a real coach: what mattered, what you missed, and what to focus on next.

Built for fast iteration, clean interfaces, and hackathon demos that actually feel magical.

---

## What Theo Does

- **Plays you at different skill levels** (Elo buckets like 400 / 800 / 1200 / 1600 / 2000)
- **You pick your color**: White or Black
- **Live coaching (during the game)**  
  Theo can surface quick, human hints like:
  - “Develop your knight before grabbing that pawn.”
  - “This move hangs your bishop because the pin breaks.”
- **Post-game review**  
  Theo highlights **key moments** (blunders, missed tactics, turning points) and explains them in plain English:
  - What happened
  - Why it mattered
  - What you should do next time
- **Engine-backed accuracy**  
  Every teaching point is grounded in real analysis from Stockfish.

---

## How It Works (High Level)

Theo is two brains working together:

1. **Stockfish** = the truth machine  
   - Generates best moves
   - Evaluates positions
   - Produces candidate lines (PV) and alternatives (MultiPV)

2. **Coaching layer** = the translator  
   - Turns engine numbers + lines into explanations humans can use
   - Keeps tone consistent with your selected difficulty
   - Powers live hints + post-game summaries

Everything is delivered through a clean backend API so the frontend can stay simple and snappy.

---

## Repo Layout

```text
theo/
├─ backend/                # FastAPI + Stockfish + SQLite
│  ├─ theo_api/
│  │  ├─ api/              # HTTP endpoints (games, health, etc.)
│  │  ├─ services/
│  │  │  ├─ stockfish/     # UCI engine wrapper + difficulty mapping
│  │  │  └─ storage/       # DB models + repo helpers
│  │  └─ schemas/          # Request/response models
├─ frontend/               # React UI (Vite) (WIP)
├─ docs/
│  ├─ api.md               # API contract + payloads
│  └─ architecture.md      # High-level design notes
└─ engine/                 # Stockfish configs + sample positions

