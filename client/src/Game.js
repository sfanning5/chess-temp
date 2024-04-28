import { useContext, createContext, useState, useMemo, useEffect } from "react";
import GameContext from "./GameContext";
import { Chessboard } from "react-chessboard";
import { Chess } from "chess.js";
import socket from './socket';

export default function Game ()
{
    let chess = useMemo(() => new Chess(), [])
    const [boardPos, setBoardPos] = useState(chess.fen())
    const [playerColor, setPlayerColor] = useState("none")
    const [gameActive, setGameActive] = useState(false)
    const [gameData, setGameData] = useState(null)
    const [drawOffered, setDrawOffered] = useState(false)

    function playMove(move)
    {
        try {
            let newMove = chess.move(move)
            setBoardPos(chess.fen())

            if (chess.isCheckmate()) {
                socket.emit("checkmate", gameData.id)
                // alert("Checkmate, " + (chess.turn() === "w" ? "black" : "white") + " wins!")  
            }
            else if (chess.isDraw()) {
                socket.emit("draw", gameData.id)
            }
            return newMove
        }
        catch (error) {
            // Invalid move
            return null
        }
    }

    function endGame()
    {
        setGameActive(false)
    }

    function resign()
    {
        socket.emit("resign", gameData.id)
        alert("You resign")
        endGame()
    }

    function offerDraw() 
    {
        socket.emit("offer draw", gameData.id)
    }

    function acceptDraw() 
    {
        socket.emit("draw", gameData.id)
        setDrawOffered(false)
    }

    useEffect(() => {
        socket.on("move", (move) => {
            console.log("Got Move " + move.lan)
            playMove(move)
        })

        socket.on("start game", (gameData) => {
            setGameData(gameData)
            setPlayerColor(gameData.playerColor)
            setGameActive(true)
            chess.reset()
            setBoardPos(chess.fen())
            console.log("Starting Game " + gameData.id)
        })

        socket.on("opponent resigns", () => {
            alert("You win by resignation")
            console.log("Win by resignation")
            endGame()
        })

        socket.on("checkmate", () => {
            alert("Checkmate, " + (chess.turn() === "w" ? "black" : "white") + " wins!")
            endGame()
        })

        socket.on("draw", () => {
            alert("Draw")
            endGame()
        })

        socket.on("offer draw", () => {
            setDrawOffered(true)
        }) 

    }, [])

    function onDrop(fromSq, toSq) 
    {
        // Ensure game is active
        if(!gameActive)
            return

        // Ensure it is this player's turn
        if (chess.turn() !== playerColor[0]) {
            return null
        }

        // If valid move, play it, then send to server
        let move = playMove({ from: fromSq, to: toSq, color: chess.turn() })
        if(move)
        {
            let moveData = {}
            moveData.move = move
            moveData.gameID = gameData.id
            socket.emit("move", moveData)
        }
    }

    const buttonStyle = {
        width: '400px', 
        height: '100px',
        fontSize: '18px', 
    };

    return (
        <>
            <div>
                <Chessboard position={boardPos} onPieceDrop={onDrop} animationDuration={0} boardOrientation={playerColor} />
            </div>
            <div style={{ textAlign: 'center' }}>
                <button style={buttonStyle} type="button" onClick={resign}>Resign</button>
                <button style={buttonStyle} type="button" onClick={offerDraw}>Offer Draw</button>
                {drawOffered && (
                    <button style={buttonStyle} type="button" onClick={acceptDraw}>Draw offered. Accept?</button>
                    )}
            </div>
        </>
    )
}