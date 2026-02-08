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
    <div className='starfield'>
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
    </>
  )
}

export default App
