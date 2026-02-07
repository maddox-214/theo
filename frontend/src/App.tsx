import './App.css'
import { useState } from 'react'
import ExperienceSelect from './ExperienceSelect'
import GameBoard from './GameBoard'

type GameData = {
  gameId: string;
  eloBucket: number;
  playerColor: 'white' | 'black';
  startFen: string;
};

function App() {
  const [currentScreen, setCurrentScreen] = useState<'select' | 'game'>('select');
  const [gameData, setGameData] = useState<GameData | null>(null);
  const [avatar, setAvatar] = useState("public/images/bishop_white.png");
  const handleGameCreated = (data: GameData) => {
    setGameData(data);
    setCurrentScreen('game');
  };

  const handleBackToSelect = () => {
    setCurrentScreen('select');
    setGameData(null);
  };

  return (
    <>
      {currentScreen === 'select' && (
        <ExperienceSelect onGameCreated={handleGameCreated} setAvatar={setAvatar}/>
      )}
      {currentScreen === 'game' && gameData && (
        <GameBoard 
          avatar={avatar}
          gameId={gameData.gameId}
          eloBucket={gameData.eloBucket}
          playerColor={gameData.playerColor}
          startFen={gameData.startFen}
          onExit={handleBackToSelect}
        />
      )}
    </>
  )
}

export default App
