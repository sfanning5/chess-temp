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
    const [displayText, setDisplayText] = useState("Start of game")

    function playMove(move)
    {
        try {
            let newMove = chess.move(move)
            setBoardPos(chess.fen())
            setDisplayText(newMove.lan)

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
        setDrawOffered(false)
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
            setDisplayText("Start of game")
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

    const boardWrapperStyle = {
        width: '500px',
        height: '500px',
        border: "10px solid #0074D9",
        borderRadius: "10px"
    }

    const boardStyle = {
        border: "10px solid white",
    }

    const buttonStyle = {
        width: "240px",
        fontSize: '16px', 
        borderRadius: '10px',
        marginTop: "10px",
        paddingTop: "8px"
    }

    const flexStyle = {
        gap: "20px",
        justifyContent: 'center',
        marginLeft: "-5px"
    }

    const textStyle = {
        color: "#0074D9",
        fontSize: "30px",
        fontWeight: "bold"
    }

    return (
        <>
            <div style={{marginTop: "30px"}}>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <text style={textStyle}>{displayText}</text>
                </div>

                <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <div style={boardWrapperStyle}>
                        <div style={boardStyle}>
                            <Chessboard position={boardPos} onPieceDrop={onDrop} animationDuration={0} boardOrientation={playerColor} />
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <div style={{ width: '500px', height: '500px'}}>
                        <span className="flex two" style={flexStyle}>
                            <button style={buttonStyle} type="button" onClick={resign}>Resign</button>
                            <button style={buttonStyle} type="button" onClick={offerDraw}>Offer Draw</button>
                        </span>
                        <span className="flex one" style={flexStyle}>
                            {drawOffered && (
                                <button style={buttonStyle} type="button" onClick={acceptDraw}>Draw offered. Accept?</button>
                            )}
                        </span>
                    </div>
                </div>`
            </div>
        </>
    )
}