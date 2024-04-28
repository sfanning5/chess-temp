import Game from "./Game";
import Container from "@mui/material/Container";
import socket from './socket';
import { useState, useEffect } from "react";
import GameContext from "./GameContext";

export default function App() {

  return (
    <Container>
      <GameContext.Provider value={null}>
        <Game />
      </GameContext.Provider>
    </Container>
  );
}
