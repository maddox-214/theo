import React, { useEffect, useState } from "react";

/* =========================
   Types
========================= */

type Instructor = {
  level: string;
  piece: string;
};

type PieceType =
  | "pawn"
  | "rook"
  | "knight"
  | "bishop"
  | "queen"
  | "king";

type PieceColor = "white" | "black";

type Piece = {
  id: string;
  type: PieceType;
  color: PieceColor;
  square: string; // e.g. "e4"
};

/* =========================
   Starting position
========================= */

const STARTING_PIECES: Piece[] = [
  // White major pieces
  { id: "w-rook-a1", type: "rook", color: "white", square: "a1" },
  { id: "w-knight-b1", type: "knight", color: "white", square: "b1" },
  { id: "w-bishop-c1", type: "bishop", color: "white", square: "c1" },
  { id: "w-queen-d1", type: "queen", color: "white", square: "d1" },
  { id: "w-king-e1", type: "king", color: "white", square: "e1" },
  { id: "w-bishop-f1", type: "bishop", color: "white", square: "f1" },
  { id: "w-knight-g1", type: "knight", color: "white", square: "g1" },
  { id: "w-rook-h1", type: "rook", color: "white", square: "h1" },

  // White pawns
  ...Array.from({ length: 8 }, (_, i) => ({
    id: `w-pawn-${i}`,
    type: "pawn" as const,
    color: "white" as const,
    square: `${"abcdefgh"[i]}2`,
  })),

  // Black major pieces
  { id: "b-rook-a8", type: "rook", color: "black", square: "a8" },
  { id: "b-knight-b8", type: "knight", color: "black", square: "b8" },
  { id: "b-bishop-c8", type: "bishop", color: "black", square: "c8" },
  { id: "b-queen-d8", type: "queen", color: "black", square: "d8" },
  { id: "b-king-e8", type: "king", color: "black", square: "e8" },
  { id: "b-bishop-f8", type: "bishop", color: "black", square: "f8" },
  { id: "b-knight-g8", type: "knight", color: "black", square: "g8" },
  { id: "b-rook-h8", type: "rook", color: "black", square: "h8" },

  // Black pawns
  ...Array.from({ length: 8 }, (_, i) => ({
    id: `b-pawn-${i}`,
    type: "pawn" as const,
    color: "black" as const,
    square: `${"abcdefgh"[i]}7`,
  })),
];

/* =========================
   Helpers
========================= */

// Converts "e4" → percentage-based board position
function squareToPosition(square: string) {
  const file = square.charCodeAt(0) - 97; // a=0, b=1...
  const rank = 8 - parseInt(square[1], 10); // 8 → 0

  return {
    x: `${file * 100.5}%`,
    y: `${rank * 100.5}%`,
  };
}

/* =========================
   Component
========================= */

const GameBoard: React.FC = () => {
  const [instructor, setInstructor] = useState<Instructor | null>(null);
  const [dialog, setDialog] = useState(
    "Welcome. Let's begin with control of the center."
  );

  const [pieces, setPieces] = useState<Piece[]>(STARTING_PIECES);

  useEffect(() => {
    const saved = localStorage.getItem("instructor");
    if (saved) {
      setInstructor(JSON.parse(saved));
    }
  }, []);

  return (
    <div className="game-root">
      {/* LEFT SIDE: Chess board area (70%) */}
      <div className="game-board-area">
        <div className="board-wrapper">
          <div className="board-frame">
            {/* Checkerboard grid (64 squares) */}
            <div className="board-grid">
              {Array.from({ length: 64 }).map((_, i) => {
                const row = Math.floor(i / 8);
                const col = i % 8;
                const isDark = (row + col) % 2 === 1;

                return (
                  <div
                    key={i}
                    className={`square ${isDark ? "dark" : ""}`}
                  />
                );
              })}
            </div>

            {/* Overlay layer for pieces, highlights, arrows, etc. */}
            <div className="board-overlay">
              {pieces.map((piece) => {
                const { x, y } = squareToPosition(piece.square);

                return (
                  <img
                    key={piece.id}
                    src={`public/images/Tiny_${piece.type}_${piece.color}.png`}
                    className="chess-piece"
                    style={{
                      transform: `translate(${x}, ${y})`,
                    }}
                    alt={`${piece.color} ${piece.type}`}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE: Instructor / mascot area (30%) */}
      <div className="instructor-area">
        {/* Speech / dialogue box */}
        <div className="speech-box">
          <span className="quote left">“</span>
          <p>{dialog}</p>
          <span className="quote right">”</span>
        </div>

        {/* Instructor mascot avatar */}
        <img
          src="/images/tiny_knight_white.png"
          className="mascot"
          alt="Instructor"
        />
      </div>
    </div>
  );
};

export default GameBoard;
