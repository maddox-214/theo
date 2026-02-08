import './App.css'
import { useState } from 'react'
import ExperienceSelect from './ExperienceSelect'
import GameBoard from './GameBoard'
import LessonReview from './LessonReview'
import PieceGuide from "./PieceGuide";

type GameData = {
  gameId: string;
  eloBucket: number;
  playerColor: 'white' | 'black';
  startFen: string;
};

function App() {
  const [currentScreen, setCurrentScreen] = useState<'select' | 'game' | 'review' | 'pieceGuide'>('select');
  const [gameData, setGameData] = useState<GameData | null>(null);
  
  const avatar = "public/images/theo_magical.png";
  
  const handleGameCreated = (data: GameData) => {
    setGameData(data);
    setCurrentScreen('game');
  };

  const handleBackToSelect = () => {
    setCurrentScreen('select');
    setGameData(null);
  };

  const handleGoToReview = () => {
    console.log('handleGoToReview called! Switching to review screen...');
    setCurrentScreen('review');
  };

  
  
  return (
    <>
      {currentScreen === 'select' && (
        <ExperienceSelect onGameCreated={handleGameCreated}/>
      )}
      {currentScreen === 'game' && gameData && (
        <GameBoard 
          avatar={avatar}
          gameId={gameData.gameId}
          eloBucket={gameData.eloBucket}
          playerColor={gameData.playerColor}
          startFen={gameData.startFen}
          onExit={handleBackToSelect}
          onGoToReview={handleGoToReview}
        />
      )}
      {currentScreen === 'review' && gameData && (
        <LessonReview 
          gameId={gameData.gameId}
          eloBucket={gameData.eloBucket}
          onNewLesson={handleBackToSelect}
        />
      )}
      {currentScreen === 'pieceGuide' && (
        <PieceGuide />
      )}
      {currentScreen !== 'pieceGuide' && (
        <button
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 1000,
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: '#2d2d2d',
            color: '#fff',
            border: 'none',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2rem',
            transition: 'background 0.2s',
          }}
          title="Chess Piece Guide"
          onClick={() => setCurrentScreen('pieceGuide')}
        >
          {/* Chess piece icon SVG */}
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M16 4c1.1 0 2 .9 2 2v2h-4V6c0-1.1.9-2 2-2zm-4 6h8l1.5 4.5c.2.6-.2 1.3-.8 1.5l-1.7.6V22h-4v-5.4l-1.7-.6c-.6-.2-1-.9-.8-1.5L12 10zm-2 16c0-1.1.9-2 2-2h8c1.1 0 2 .9 2 2v2H10v-2z" fill="currentColor"/>
          </svg>
        </button>
      )}
    </>
  )
}

export default App
