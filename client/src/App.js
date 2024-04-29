import Game from "./Game";
import Container from "@mui/material/Container";
import socket from './socket';
import { useState, useEffect } from "react";
import GameContext from "./GameContext";
import Matchmaking from "./Matchmaking";

export default function App() {

  const [page, setPage] = useState("matchmaking");
  const [gameData, setGameData] = useState(null);
  const [username, setUsername] = useState((Date.now() % 10000).toString());

  // useEffect(() => {
    
  //   setUsername((Date.now() % 10000).toString())
      
  // }, [])

  return (
    <Container>
      <GameContext.Provider value={{page, setPage, gameData, setGameData, username}}>
        {page === "game" && <Game />}
        {page === "matchmaking" && <Matchmaking />}
      </GameContext.Provider>
    </Container>
  );
}
