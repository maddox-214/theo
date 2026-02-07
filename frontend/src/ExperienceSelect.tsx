import React, { useState } from "react";
import { createGame } from "./lib/api";

type Level = {
  name: string;
  piece: string;
  bigPiece: string;
  elo: number;
};

type ExperienceSelectProps = {
  onGameCreated: (data: {
    gameId: string;
    eloBucket: number;
    playerColor: 'white' | 'black';
    startFen: string;
  }) => void;
  setAvatar: React.Dispatch<React.SetStateAction<string>>;
};

const levels: Level[] = [
  { name: "Beginner", piece: "public/images/tiny_bishop_white.png", bigPiece:"public/images/bishop_white.png", elo: 400 },
  { name: "Intermediate", piece: "public/images/tiny_knight_white.png", bigPiece:"public/images/knight_white.png", elo: 800 },
  { name: "Advanced", piece: "public/images/tiny_rook_white.png", bigPiece:"public/images/rook_white.png", elo: 1200 },
  { name: "Master", piece: "public/images/tiny_queen_white.png", bigPiece:"public/images/queen_white.png", elo: 2000 },
];

const ExperienceSelect: React.FC<ExperienceSelectProps> = ({ onGameCreated, setAvatar }) => {
  const [loading, setLoading] = useState(false);

  const handleLevelClick = async (level: Level) => {
    setLoading(true);
    
    try {
      // create game as white by default
      const game = await createGame(level.elo, "white");
      
      console.log("Game created successfully:", {
        gameId: game.game_id,
        eloBucket: game.elo_bucket,
        color: game.player_color,
        startFen: game.start_fen
      });

      setAvatar(level.bigPiece);
      
      // Navigate to game board
      onGameCreated({
        gameId: game.game_id,
        eloBucket: game.elo_bucket,
        playerColor: game.player_color,
        startFen: game.start_fen
      });
      
    } catch (error) {
      console.error("Failed to create game:", error);
      alert("Failed to create game. Check console for details.");
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <h1 className="title">Choose your experience level</h1>

      <div className="levels">
        {levels.map((level, index) => (
          <div
            key={level.name}
            className={`level ${
              index === 1 || index === 2 ? "front" : ""
            }`}
          >
            <button 
            className="exp-button"
              onClick={() => handleLevelClick(level)}
              disabled={loading}
            >
              <img src={level.piece} alt={level.name} />
              {loading ? "Starting..." : level.name}
            </button>
            <small style={{ display: "block", marginTop: "0.5rem", opacity: 0.7 }}>
              ~{level.elo} ELO
            </small>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ExperienceSelect;
