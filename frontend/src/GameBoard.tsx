import React, { useEffect, useState } from "react";
import { Chess } from "chess.js";
import { submitMove } from "./lib/api";

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

// Converts board index (0-63) to square notation (a8-h1)
function getSquareFromIndex(index: number): string {
  const row = Math.floor(index / 8);
  const col = index % 8;
  const file = "abcdefgh"[col];
  const rank = 8 - row;
  return `${file}${rank}`;
}

// Sync pieces from chess.js game state
function syncPiecesFromGame(chessGame: Chess): Piece[] {
  const board = chessGame.board();
  const newPieces: Piece[] = [];

  // Map chess.js piece types (single letters) to our PieceType
  const typeMap: Record<string, PieceType> = {
    p: "pawn",
    r: "rook",
    n: "knight",
    b: "bishop",
    q: "queen",
    k: "king",
  };

  board.forEach((row, rowIndex) => {
    row.forEach((square, colIndex) => {
      if (square) {
        const file = "abcdefgh"[colIndex];
        const rank = 8 - rowIndex;
        const squareNotation = `${file}${rank}`;
        newPieces.push({
          id: `${square.color}-${square.type}-${squareNotation}`,
          type: typeMap[square.type],
          color: square.color === "w" ? "white" : "black",
          square: squareNotation,
        });
      }
    });
  });

  return newPieces;
}

/* =========================
   Component
========================= */

type GameBoardProps = {
  avatar: string;
  gameId: string;
  eloBucket: number;
  playerColor: 'white' | 'black';
  startFen: string;
  onExit?: () => void;
};

const GameBoard: React.FC<GameBoardProps> = ({ 
  avatar,
  gameId, 
  eloBucket, 
  playerColor, 
  startFen,
  onExit 
}) => {
  const [_instructor, setInstructor] = useState<Instructor | null>(null);
  const [dialog, setDialog] = useState(
    "Welcome. Let's begin with control of the center."
  );

  const [game] = useState(() => new Chess(startFen));
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [legalMoves, setLegalMoves] = useState<string[]>([]);
  const [legalMovesVerbose, setLegalMovesVerbose] = useState<any[]>([]);
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [showMoveHistory, setShowMoveHistory] = useState(false);
  const [isWaitingForAI, setIsWaitingForAI] = useState(false);
  const [evaluation, setEvaluation] = useState<string>("");
  const [pendingPromotion, setPendingPromotion] = useState<{ from: string; to: string } | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("instructor");
    if (saved) {
      setInstructor(JSON.parse(saved));
    }
    
    // Initialize pieces from chess.js
    const initialPieces = syncPiecesFromGame(game);
    console.log("Initializing board with", initialPieces.length, "pieces");
    console.log("Game ID:", gameId, "| ELO:", eloBucket, "| Color:", playerColor);
    setPieces(initialPieces);
  }, [game, gameId, eloBucket, playerColor]);

  function handleSquareClick(square: string) {
    if (isWaitingForAI) {
      console.log("Waiting for AI response...");
      return;
    }

    if (!selectedSquare) {
      // Select piece
      const piece = game.get(square as any);
      if (piece) {
        // Only allow player to move their own pieces
        const isPlayerTurn = (playerColor === 'white' && game.turn() === 'w') || 
                            (playerColor === 'black' && game.turn() === 'b');
        
        if (!isPlayerTurn) {
          console.log("Not your turn!");
          return;
        }

        const pieceColor = piece.color === 'w' ? 'white' : 'black';
        if (pieceColor !== playerColor) {
          console.log("That's not your piece!");
          return;
        }

        setSelectedSquare(square);
        
        // Get legal moves for this piece (verbose so we can detect promotions)
        const moves = game.moves({ square: square as any, verbose: true });
        const destinations = moves.map((m: any) => m.to);
        setLegalMoves(destinations);
        setLegalMovesVerbose(moves);
        
        console.log("Selected:", square, "-", piece.type, piece.color);
        console.log("Legal moves:", destinations.join(", "));
      } else {
        console.log("Empty square clicked:", square);
      }
    } else {
      // Try to move (check for promotion first)
      const matching = (legalMovesVerbose || []).find(m => m.to === square && m.from === selectedSquare);
      if (matching && matching.promotion) {
        // show promotion picker
        setPendingPromotion({ from: selectedSquare, to: square });
      } else {
        // regular move
        handlePlayerMove(selectedSquare, square);
      }
      setSelectedSquare(null);
      setLegalMoves([]);
      setLegalMovesVerbose([]);
    }
  }

  async function handlePlayerMove(from: string, to: string, promotion?: string) {
    try {
      const move = game.move({ from: from as any, to: to as any, promotion: promotion as any });
      if (!move) {
        console.log("Illegal move:", from, "→", to);
        return;
      }

      // Update local board
      setPieces(syncPiecesFromGame(game));
      
      // Add to move history
      const moveNotation = `${playerColor}: ${move.from}-${move.to}`;
      setMoveHistory(prev => [...prev, moveNotation]);
      
      console.log("Move successful:", move.from, "→", move.to, "-", move.piece);

      // Send to backend and get AI response
      setIsWaitingForAI(true);
      try {
        // include promotion char in UCI if present
        const promotionChar = (move as any).promotion || promotion;
        const response = await submitMove(gameId, move.from, move.to, promotionChar);

        console.log("Backend response:", response);

        // Update evaluation
        if (response.eval_player_cp !== null) {
          const evalScore = (response.eval_player_cp / 100).toFixed(2);
          setEvaluation(`Eval: ${evalScore}`);
        } else if (response.mate_player !== null) {
          setEvaluation(`Mate in ${response.mate_player}`);
        }

        // Show Theo's LLM response
        if (response.llm_response) {
          setDialog(response.llm_response);
        }

        // Apply AI move
        if (response.engine_reply_uci) {
          // handle possible promotion in UCI (e.g., e7e8q)
          const uci = response.engine_reply_uci;
          if (uci && uci.length >= 4) {
            const aiFrom = uci.slice(0, 2);
            const aiTo = uci.slice(2, 4);
            const aiPromotion = uci.length >= 5 ? uci[4] : undefined;

            const aiMove = game.move({
              from: aiFrom as any,
              to: aiTo as any,
              promotion: aiPromotion as any,
            });

            if (aiMove) {
              setPieces(syncPiecesFromGame(game));
              const aiColor = playerColor === 'white' ? 'black' : 'white';
              const aiMoveNotation = `${aiColor}: ${aiMove.from}-${aiMove.to}`;
              setMoveHistory(prev => [...prev, aiMoveNotation]);
              console.log("AI move:", aiMove.from, "→", aiMove.to);
            }
          }
        }
      } catch (error) {
        console.error("Failed to submit move:", error);
        alert("Failed to get AI response. Check console.");
      } finally {
        setIsWaitingForAI(false);
      }
    } catch (error) {
      console.log("Illegal move:", from, "→", to);
    }
  }

  function handlePromotionSelect(piece: string) {
    if (!pendingPromotion) return;
    // piece is one of 'q','r','b','n'
    handlePlayerMove(pendingPromotion.from, pendingPromotion.to, piece);
    setPendingPromotion(null);
  }

  return (
    <div className="game-root">
      {/* LEFT SIDE: Chess board area (70%) */}
      <div className="game-board-area">
        <div className="board-wrapper">
          {/* Turn indicator */}
          <div style={{ 
            textAlign: 'center', 
            marginBottom: '10px', 
            fontSize: '1.2rem',
            fontWeight: 'bold',
            color: '#fff'
          }}>
            {isWaitingForAI ? (
              <span style={{ opacity: 0.7 }}>AI is thinking...</span>
            ) : (
              <div className="turn-block">
                {game.turn() === 'w' ? "White's Turn" : "Black's Turn"}
              </div>
            )}
          </div>
          
          <div className="board-frame" style={{ position: 'relative' }}>
            {/* File (a-h) labels */}
            <div style={{
              position: 'absolute',
              bottom: '-22px',
              left: '0',
              width: '100%',
              display: 'flex',
              justifyContent: 'space-between',
              padding: '0 2px',
              fontSize: '1rem',
              color: '#fff',
              fontWeight: 500,
              zIndex: 10
            }}>
              {Array.from('abcdefgh').map((file, idx) => (
                <span key={file} style={{ width: '12.5%', textAlign: 'center' }}>{file}</span>
              ))}
            </div>

            {/* Rank (1-8) labels */}
            <div style={{
              position: 'absolute',
              left: '-22px',
              top: '0',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              fontSize: '1rem',
              color: '#fff',
              fontWeight: 500,
              zIndex: 10
            }}>
              {Array.from({ length: 8 }).map((_, idx) => (
                <span key={idx} style={{ height: '12.5%', textAlign: 'center' }}>{8 - idx}</span>
              ))}
            </div>

            {/* Checkerboard grid (64 squares) */}
            <div className="board-grid">
              {Array.from({ length: 64 }).map((_, i) => {
                const row = Math.floor(i / 8);
                const col = i % 8;
                const isDark = (row + col) % 2 === 1;
                const square = getSquareFromIndex(i);
                const isSelected = selectedSquare === square;
                const isLegalMove = legalMoves.includes(square);

                return (
                  <div
                    key={i}
                    className={`square ${isDark ? "dark" : ""} ${isSelected ? "selected" : ""} ${isLegalMove ? "legal-move" : ""}`}
                    onClick={() => handleSquareClick(square)}
                  >
                    {isLegalMove && (
                      <div className="move-indicator" />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Overlay layer for pieces, highlights, arrows, etc. */}
            <div className="board-overlay">
              {pieces.map((piece) => {
                const { x, y } = squareToPosition(piece.square);
                
                // map piece types to image file names
                const pieceNames: Record<PieceType, string> = {
                  pawn: "Pawn",
                  rook: "Rook",
                  knight: "Knight",
                  bishop: "Bishop",
                  queen: "Queen",
                  king: "King"
                };
                
                const colorName = piece.color === "white" ? "White" : "Black";
                const imagePath = `/images/Tiny_${pieceNames[piece.type]}_${colorName}.png`;

                return (
                  <img
                    key={piece.id}
                    src={imagePath}
                    className="chess-piece"
                    style={{
                      transform: `translate(${x}, ${y})`,
                    }}
                    alt={`${piece.color} ${piece.type}`}
                  />
                );
              })}
            </div>
            {/* Promotion picker */}
            {pendingPromotion && (
              <div className="promotion-picker" style={{
                position: 'absolute',
                left: '50%',
                top: '40%',
                transform: 'translate(-50%, -50%)',
                background: 'rgba(0,0,0,0.85)',
                padding: '12px',
                borderRadius: '8px',
                display: 'flex',
                gap: '8px',
                zIndex: 50
              }}>
                <button onClick={() => handlePromotionSelect('q')}>Queen</button>
                <button onClick={() => handlePromotionSelect('r')}>Rook</button>
                <button onClick={() => handlePromotionSelect('b')}>Bishop</button>
                <button onClick={() => handlePromotionSelect('n')}>Knight</button>
              </div>
            )}
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
          src={avatar}
          className="mascot"
          alt="Instructor"
        />
        
        {/* Move history */}
        <div style={{
          background: 'rgba(0, 0, 0, 0.2)',
          padding: '8px 12px',
          borderRadius: '6px',
          marginTop: '15px',
        }}>
          <div 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              cursor: 'pointer',
              marginBottom: showMoveHistory ? '8px' : '0'
            }}
            onClick={() => setShowMoveHistory(!showMoveHistory)}
          >
            <h3 style={{ margin: 0, fontSize: '0.85rem', color: '#fff', fontWeight: '500' }}>Move History</h3>
            <span style={{ 
              fontSize: '0.7rem', 
              color: '#fff',
              transform: showMoveHistory ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s'
            }}>
              ▼
            </span>
          </div>
          
          {showMoveHistory && (
            <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
              {moveHistory.length === 0 ? (
                <p style={{ margin: 0, opacity: 0.5, fontSize: '0.75rem' }}>No moves yet</p>
              ) : (
                <div style={{ fontSize: '0.75rem', lineHeight: '1.4' }}>
                  {moveHistory.map((move, index) => (
                    <div key={index} style={{ marginBottom: '2px', color: '#ddd' }}>
                      {index + 1}. {move}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Exit button */}
        {onExit && (
          <button
            onClick={onExit}
            style={{
              marginTop: '20px',
              padding: '10px 20px',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '8px',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '1rem'
            }}
          >
            Back to Menu
          </button>
        )}
      </div>
    </div>
  );
};

export default GameBoard;
