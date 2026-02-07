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
   Coaching messages from eval
========================= */

function generateCoachingMessage(
  evalPlayerCp: number | null,
  matePlayer: number | null,
  prevEvalPlayerCp: number | null,
  _moveNumber: number
): string {
  // Mate situations
  if (matePlayer !== null) {
    if (matePlayer > 0) return "You have a forced checkmate! Find the winning sequence.";
    if (matePlayer < 0) return "Careful — your opponent has a mating threat. Look for a defense.";
  }

  if (evalPlayerCp === null) return "Interesting position. Think about what each side wants to do.";

  const evalPawns = evalPlayerCp / 100;

  // Compare to previous eval to detect blunders / great moves
  if (prevEvalPlayerCp !== null) {
    const swing = evalPlayerCp - prevEvalPlayerCp;
    if (swing >= 200) return "Excellent move! You've gained a significant advantage.";
    if (swing >= 100) return "Good move! You're improving your position.";
    if (swing <= -300) return "That was a mistake — you lost significant ground. Watch for tactics!";
    if (swing <= -150) return "That move wasn't ideal. Try to think about what your opponent threatens.";
  }

  // Positional messages based on current eval
  if (evalPawns > 3) return "You're winning! Stay focused and convert your advantage.";
  if (evalPawns > 1.5) return "You have a nice advantage. Look for ways to press it.";
  if (evalPawns > 0.5) return "Slightly better for you. Keep developing and controlling the center.";
  if (evalPawns > -0.5) return "The position is roughly equal. Good, solid play!";
  if (evalPawns > -1.5) return "Your opponent is slightly better. Look for active moves.";
  if (evalPawns > -3) return "You're behind. Try to create counterplay or simplify carefully.";
  return "Tough position. Stay alert and look for defensive resources.";
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
  onGoToReview?: () => void;
};

const GameBoard: React.FC<GameBoardProps> = ({ 
  avatar,
  gameId, 
  eloBucket, 
  playerColor, 
  startFen,
  onExit,
  onGoToReview
}) => {
  const [_instructor, setInstructor] = useState<Instructor | null>(null);
  const [dialog, setDialog] = useState(
    "Welcome. Let's begin with control of the center."
  );

  const [game] = useState(() => new Chess(startFen));
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [legalMoves, setLegalMoves] = useState<string[]>([]);
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [showMoveHistory, setShowMoveHistory] = useState(false);
  const [isWaitingForAI, setIsWaitingForAI] = useState(false);
  const [evaluation, setEvaluation] = useState<string>("");
  const [prevEvalPlayerCp, setPrevEvalPlayerCp] = useState<number | null>(null);
  const [moveCount, setMoveCount] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [gameOutcome, setGameOutcome] = useState<string | null>(null);
  const [winner, setWinner] = useState<string | null>(null);

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

    if (gameOver) {
      console.log("Game is over!");
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
        
        // Get legal moves for this piece
        const moves = game.moves({ square: square as any, verbose: true });
        const destinations = moves.map(m => m.to);
        setLegalMoves(destinations);
        
        console.log("Selected:", square, "-", piece.type, piece.color);
        console.log("Legal moves:", destinations.join(", "));
      } else {
        console.log("Empty square clicked:", square);
      }
    } else {
      // Try to move
      handlePlayerMove(selectedSquare, square);
      setSelectedSquare(null);
      setLegalMoves([]);
    }
  }

  // Helper to format outcome text
  function getOutcomeText(outcome: string | null): string {
    if (!outcome) return "";
    
    const outcomeMap: Record<string, string> = {
      "checkmate": "Checkmate",
      "stalemate": "Stalemate",
      "insufficient_material": "Insufficient Material",
      "fifty_move": "Fifty Move Rule",
      "threefold": "Threefold Repetition",
      "draw": "Draw"
    };
    
    return outcomeMap[outcome] || outcome;
  }

  async function handlePlayerMove(from: string, to: string) {
    try {
      // Check if this is a promotion move (pawn reaching the last rank)
      const piece = game.get(from as any);
      const isPromotion = piece?.type === 'p' && 
        ((piece.color === 'w' && to[1] === '8') || (piece.color === 'b' && to[1] === '1'));

      const move = game.move({ 
        from: from as any, 
        to: to as any,
        ...(isPromotion ? { promotion: 'q' } : {})
      });
      if (!move) {
        console.log("Illegal move:", from, "→", to);
        return;
      }

      // Update local board
      setPieces(syncPiecesFromGame(game));
      
      // Add to move history
      const promoSuffix = move.promotion ? '=' + move.promotion.toUpperCase() : '';
      const moveNotation = `${playerColor}: ${move.from}-${move.to}${promoSuffix}`;
      setMoveHistory(prev => [...prev, moveNotation]);
      
      console.log("Move successful:", move.from, "→", move.to, "-", move.piece);

      // Send to backend and get AI response
      setIsWaitingForAI(true);
      setDialog("Thinking...");
      try {
        const response = await submitMove(gameId, move.from, move.to, move.promotion || undefined);
        
        console.log("Backend response:", response);
        console.log("Game over check:", {
          game_over: response.game_over,
          outcome: response.outcome,
          winner: response.winner,
          hasGameOverField: 'game_over' in response
        });
        
        // Check for game over
        if (response.game_over) {
          // Apply AI move FIRST so the board shows the final position
          if (response.engine_reply_uci) {
            const aiFrom = response.engine_reply_uci.slice(0, 2);
            const aiTo = response.engine_reply_uci.slice(2, 4);
            const aiPromotion = response.engine_reply_uci.length > 4 
              ? response.engine_reply_uci[4] 
              : undefined;
            
            const aiMove = game.move({ 
              from: aiFrom as any, 
              to: aiTo as any,
              ...(aiPromotion ? { promotion: aiPromotion } : {})
            });
            
            if (aiMove) {
              setPieces(syncPiecesFromGame(game));
              const aiColor = playerColor === 'white' ? 'black' : 'white';
              const aiMoveNotation = `${aiColor}: ${aiMove.from}-${aiMove.to}${aiMove.promotion ? '=' + aiMove.promotion.toUpperCase() : ''}`;
              setMoveHistory(prev => [...prev, aiMoveNotation]);
            } else if (response.fen_after_engine) {
              game.load(response.fen_after_engine);
              setPieces(syncPiecesFromGame(game));
            }
          }

          setGameOver(true);
          setGameOutcome(response.outcome || null);
          setWinner(response.winner || null);
          
          // Set appropriate dialog message
          if (response.outcome === "stalemate") {
            setDialog("Stalemate! The game is a draw — no legal moves available.");
          } else if (response.outcome === "checkmate") {
            if (response.winner === playerColor) {
              setDialog("Checkmate! You won! Excellent play!");
            } else {
              setDialog("Checkmate! You've been defeated. Study and try again!");
            }
          } else if (response.outcome === "insufficient_material") {
            setDialog("Draw by insufficient material. Neither side can checkmate.");
          } else if (response.outcome === "fifty_move") {
            setDialog("Draw by the fifty-move rule. No progress in 50 moves.");
          } else if (response.outcome === "threefold") {
            setDialog("Draw by threefold repetition. Position repeated three times.");
          } else {
            setDialog("The game has ended in a draw.");
          }
          
          setIsWaitingForAI(false);
          return; // Don't run normal continuation logic
        }
        
        // Update evaluation
        if (response.eval_player_cp !== null) {
          const evalScore = (response.eval_player_cp / 100).toFixed(2);
          setEvaluation(`Eval: ${evalScore}`);
        } else if (response.mate_player !== null) {
          setEvaluation(`Mate in ${response.mate_player}`);
        }

        // Update coaching dialog
        const newMoveCount = moveCount + 1;
        setMoveCount(newMoveCount);

        if (response.llm_response) {
          setDialog(response.llm_response);
        } else {
          const coachMsg = generateCoachingMessage(
            response.eval_player_cp,
            response.mate_player ?? null,
            prevEvalPlayerCp,
            newMoveCount
          );
          setDialog(coachMsg);
        }

        setPrevEvalPlayerCp(response.eval_player_cp);
        
        // Apply AI move (non-game-over case)
        if (response.engine_reply_uci) {
          const aiFrom = response.engine_reply_uci.slice(0, 2);
          const aiTo = response.engine_reply_uci.slice(2, 4);
          const aiPromotion = response.engine_reply_uci.length > 4 
            ? response.engine_reply_uci[4] 
            : undefined;
          
          const aiMove = game.move({ 
            from: aiFrom as any, 
            to: aiTo as any,
            ...(aiPromotion ? { promotion: aiPromotion } : {})
          });
          
          if (aiMove) {
            setPieces(syncPiecesFromGame(game));
            const aiColor = playerColor === 'white' ? 'black' : 'white';
            const aiMoveNotation = `${aiColor}: ${aiMove.from}-${aiMove.to}${aiMove.promotion ? '=' + aiMove.promotion.toUpperCase() : ''}`;
            setMoveHistory(prev => [...prev, aiMoveNotation]);
            console.log("AI move:", aiMove.from, "→", aiMove.to, aiMove.promotion ? `(=${aiMove.promotion})` : '');

            // Check if engine move caused game over locally (safety net)
            if (game.isGameOver()) {
              setGameOver(true);
              if (game.isCheckmate()) {
                const localWinner = game.turn() === 'w' ? 'black' : 'white';
                setGameOutcome("checkmate");
                setWinner(localWinner);
                setDialog(localWinner === playerColor 
                  ? "Checkmate! You won! Excellent play!" 
                  : "Checkmate! You've been defeated. Study and try again!");
              } else if (game.isStalemate()) {
                setGameOutcome("stalemate");
                setDialog("Stalemate! The game is a draw — no legal moves available.");
              } else if (game.isInsufficientMaterial()) {
                setGameOutcome("insufficient_material");
                setDialog("Draw by insufficient material.");
              } else if (game.isThreefoldRepetition()) {
                setGameOutcome("threefold");
                setDialog("Draw by threefold repetition.");
              } else if (game.isDraw()) {
                setGameOutcome("draw");
                setDialog("The game has ended in a draw.");
              }
            }
          } else {
            // AI move failed to apply locally — resync from backend FEN
            console.warn("AI move failed locally, resyncing from backend FEN");
            if (response.fen_after_engine) {
              game.load(response.fen_after_engine);
              setPieces(syncPiecesFromGame(game));
            }
          }
        }
      } catch (error) {
        console.error("Failed to submit move:", error);
        // Undo the local move so the player can try again
        game.undo();
        setPieces(syncPiecesFromGame(game));
        setMoveHistory(prev => prev.slice(0, -1));
        setDialog("Connection issue — your move was rolled back. Try again.");
      } finally {
        setIsWaitingForAI(false);
      }
    } catch (error) {
      console.log("Illegal move:", from, "→", to);
    }
  }

  return (
    <div className="game-root">
      {/* LEFT SIDE: Chess board area (70%) */}
      <div className="game-board-area">
        <div className="board-wrapper">
          {/* Turn indicator - hidden when game is over */}
          {!gameOver && (
            <div style={{ 
              textAlign: 'center', 
              marginBottom: '10px', 
              fontSize: '1.2rem',
              fontWeight: 'bold',
              color: '#fff'
            }}>
              {isWaitingForAI ? (
                <span className="turn-block" style={{ opacity: 0.7 }}>AI is thinking...</span>
              ) : (
                <div className="turn-block">
                  {game.turn() === 'w' ? "White's Turn" : "Black's Turn"}
                </div>
              )}
            </div>
          )}
          
          <div className="board-frame">
            {/* Game Over Overlay */}
            {gameOver && (
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0, 0, 0, 0.85)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
                borderRadius: '8px'
              }}>
                <div style={{
                  background: '#3a3a3a',
                  padding: '50px 60px',
                  borderRadius: '12px',
                  textAlign: 'center',
                  minWidth: '400px'
                }}>
                  {/* Title */}
                  <h2 style={{ 
                    fontSize: '2rem', 
                    marginBottom: '10px',
                    color: '#ffffff',
                    fontWeight: '600',
                    letterSpacing: '0.5px'
                  }}>
                    {gameOutcome === "checkmate" && winner !== playerColor && (
                      `${playerColor === 'white' ? 'Black' : 'White'} Won`
                    )}
                    {gameOutcome === "checkmate" && winner === playerColor && "You Won"}
                    {gameOutcome !== "checkmate" && "Draw"}
                  </h2>
                  
                  {/* Subtitle - outcome type */}
                  <p style={{ 
                    fontSize: '1.1rem', 
                    color: '#b0b0b0',
                    marginBottom: '40px',
                    fontWeight: '400'
                  }}>
                    by {getOutcomeText(gameOutcome)}
                  </p>
                  
                  {/* Buttons */}
                  {winner === playerColor || gameOutcome !== "checkmate" ? (
                    // Player won or draw - Game Review is primary
                    <>
                      <button
                        onClick={() => {
                          console.log('Game Review clicked!', { onGoToReview });
                          if (onGoToReview) {
                            onGoToReview();
                          } else {
                            console.error('onGoToReview callback not provided');
                          }
                        }}
                        style={{
                          width: '100%',
                          padding: '16px',
                          background: '#ff8c42',
                          border: 'none',
                          borderRadius: '8px',
                          color: '#ffffff',
                          cursor: 'pointer',
                          fontSize: '1.2rem',
                          fontWeight: '600',
                          marginBottom: '15px',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#8bc34a';
                          e.currentTarget.style.transform = 'translateY(-2px)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = '#ff8c42';
                          e.currentTarget.style.transform = 'translateY(0)';
                        }}
                      >
                        Game Review
                      </button>
                      
                      <div style={{ display: 'flex', gap: '12px' }}>
                        {onExit && (
                          <button
                            onClick={onExit}
                            style={{
                              flex: 1,
                              padding: '12px',
                              background: '#5a5a5a',
                              border: 'none',
                              borderRadius: '8px',
                              color: '#ffffff',
                              cursor: 'pointer',
                              fontSize: '1rem',
                              fontWeight: '500',
                              transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = '#6a6a6a';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = '#5a5a5a';
                            }}
                          >
                            Main Menu
                          </button>
                        )}
                        
                        <button
                          onClick={() => {
                            // Reload to start new game with same settings
                            window.location.reload();
                          }}
                          style={{
                            flex: 1,
                            padding: '12px',
                            background: '#5a5a5a',
                            border: 'none',
                            borderRadius: '8px',
                            color: '#ffffff',
                            cursor: 'pointer',
                            fontSize: '1rem',
                            fontWeight: '500',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#6a6a6a';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = '#5a5a5a';
                          }}
                        >
                          Rematch
                        </button>
                      </div>
                    </>
                  ) : (
                    // Player lost - Rematch is primary
                    <>
                      <button
                        onClick={() => {
                          // Reload to start new game with same settings
                          window.location.reload();
                        }}
                        style={{
                          width: '100%',
                          padding: '16px',
                          background: '#ff8c42',
                          border: 'none',
                          borderRadius: '8px',
                          color: '#ffffff',
                          cursor: 'pointer',
                          fontSize: '1.2rem',
                          fontWeight: '600',
                          marginBottom: '15px',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#f69456';
                          e.currentTarget.style.transform = 'translateY(-2px)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = '#ff8c42';
                          e.currentTarget.style.transform = 'translateY(0)';
                        }}
                      >
                        Rematch
                      </button>
                      
                      <div style={{ display: 'flex', gap: '12px' }}>
                        {onExit && (
                          <button
                            onClick={onExit}
                            style={{
                              flex: 1,
                              padding: '12px',
                              background: '#5a5a5a',
                              border: 'none',
                              borderRadius: '8px',
                              color: '#ffffff',
                              cursor: 'pointer',
                              fontSize: '1rem',
                              fontWeight: '500',
                              transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = '#6a6a6a';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = '#5a5a5a';
                            }}
                          >
                            Main Menu
                          </button>
                        )}
                        
                        <button
                          onClick={() => {
                            console.log('Game Review clicked (loss)!', { onGoToReview });
                            if (onGoToReview) {
                              onGoToReview();
                            } else {
                              console.error('onGoToReview callback not provided');
                            }
                          }}
                          style={{
                            flex: 1,
                            padding: '12px',
                            background: '#5a5a5a',
                            border: 'none',
                            borderRadius: '8px',
                            color: '#ffffff',
                            cursor: 'pointer',
                            fontSize: '1rem',
                            fontWeight: '500',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#6a6a6a';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = '#5a5a5a';
                          }}
                        >
                          Game Review
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
            
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
                    {/* Coordinates: file letters along bottom, ranks along left */}
                    {col === 0 && (
                      <span className="square-rank-label">{square[1]}</span>
                    )}
                    {row === 7 && (
                      <span className="square-file-label">{square[0]}</span>
                    )}
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
