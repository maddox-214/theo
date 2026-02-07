import React, { useState } from "react";
import { createGame } from "./lib/api";

type Level = {
  name: string;
  piece: string;
  elo: number;
};

type ExperienceSelectProps = {
  onGameCreated: (data: {
    gameId: string;
    eloBucket: number;
    playerColor: 'white' | 'black';
    startFen: string;
  }) => void;
};

const levels: Level[] = [
  { name: "Beginner", piece: "public/images/tiny_bishop_white.png", elo: 400 },
  { name: "Intermediate", piece: "public/images/tiny_knight_white.png", elo: 800 },
  { name: "Advanced", piece: "public/images/tiny_rook_white.png", elo: 1200 },
  { name: "Master", piece: "public/images/tiny_queen_white.png", elo: 2000 },
];

const ExperienceSelect: React.FC<ExperienceSelectProps> = ({ onGameCreated }) => {
  const [loading, setLoading] = useState(false);
  // new animation states (commented out for now)
  // const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  // const [isAnimating, setIsAnimating] = useState(false);

  const handleLevelClick = async (level: Level) => {
    // new animation code (commented out for now)
    // if (loading) return;
    
    setLoading(true);
    // setSelectedLevel(level.name);
    // setIsAnimating(true);
    
    try {
      // create game as white by default
      const game = await createGame(level.elo, "white");
      
      console.log("Game created successfully:", {
        gameId: game.game_id,
        eloBucket: game.elo_bucket,
        color: game.player_color,
        startFen: game.start_fen
      });
      
      // old code - navigate immediately
      onGameCreated({
        gameId: game.game_id,
        eloBucket: game.elo_bucket,
        playerColor: game.player_color,
        startFen: game.start_fen
      });

      // new animation code (commented out for now)
      // wait for animation to complete (1.8s) then navigate
      // setTimeout(() => {
      //   onGameCreated({
      //     gameId: game.game_id,
      //     eloBucket: game.elo_bucket,
      //     playerColor: game.player_color,
      //     startFen: game.start_fen
      //   });
      // }, 1800);
      
    } catch (error) {
      console.error("Failed to create game:", error);
      alert("Failed to create game. Check console for details.");
      setLoading(false);
      // new animation code (commented out for now)
      // setSelectedLevel(null);
      // setIsAnimating(false);
    }
  };

  return (
    <div className="container">
      {/* new animation code (commented out for now)
      <div className="container" style={{
        opacity: isAnimating ? 0 : 1,
        transition: 'opacity 1.8s ease-out'
      }}>
      */}
      <h1 className="title">Choose your experience level</h1>

      <div className="levels">
        {levels.map((level, index) => (
          <div
            key={level.name}
            className={`level ${
              index === 1 || index === 2 ? "front" : ""
            }`}
          >
            <img 
              src={level.piece} 
              alt={level.name}
              onClick={() => handleLevelClick(level)}
              style={{ cursor: loading ? 'default' : 'pointer' }}
              /* new animation code (commented out for now)
              style={{ 
                cursor: loading ? 'default' : 'pointer',
                transform: selectedLevel === level.name ? 'scale(4)' : 'scale(1)',
                transition: 'transform 1.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
                zIndex: selectedLevel === level.name ? 1000 : 1,
                position: 'relative'
              }}
              */
            />
            <button 
              onClick={() => handleLevelClick(level)}
              disabled={loading}
            >
              {loading ? "Starting..." : level.name}
              {/* new animation code (commented out for now)
              {loading && selectedLevel === level.name ? "Starting..." : level.name}
              */}
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
