import { useContext, createContext, useState, useMemo, useEffect } from "react";
import GameContext from "./GameContext";
import { Chessboard } from "react-chessboard";
import { Chess } from "chess.js";
import socket from './socket';

function UsernameDisplay(props)
{
    const { username, indicateTurn } = props

    const backgroundColor = indicateTurn ? "#CCE3F7" : null

    return (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: "4px", marginBottom: "4px" }}>
            <span className="flex two" style={{ paddingTop: "2.5px", marginLeft: "0px", width: "500px", height: "35px", backgroundColor: backgroundColor, borderRadius: "10px"}}>
                <text className="username-text">{username}</text>
                <span style={{ textAlign: "right", paddingRight: "10px", paddingLeft: "1px"}}>
                    <text style={{ color: "#2ECC40" }} className="username-text">{"0"}</text>
                    <text style={{ color: "#333333" }} className="username-text">{"/0/"}</text>
                    <text style={{ color: "#FF4136" }} className="username-text">{"0"}</text>
                </span>
            </span>
        </div>
    )
}

export default function Game ()
{
    let chess = useMemo(() => new Chess(), [])
    const [boardPos, setBoardPos] = useState(chess.fen())
    const [playerColor, setPlayerColor] = useState("none")
    const [gameActive, setGameActive] = useState(false)
    const [gameData, setGameData] = useState(null)
    const [drawOffered, setDrawOffered] = useState(false)
    const [displayText, setDisplayText] = useState("Start of game")
    const [opponentName, setOpponentName] = useState("No Opponent")

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
            setOpponentName(gameData.playerColor === "white" ? gameData.black : gameData.white)
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

    // const headerStyle = {
    //     color: "#0074D9",
    //     fontSize: "30px",
    //     fontWeight: "bold"
    // }

    return (
        <>
            <div style={{ marginTop: "10px", justifyContent: 'center' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: "0px"}}>
                    <text className= "header-text">Play Chess</text>
                </div>

                <UsernameDisplay username={opponentName} indicateTurn={gameActive && chess.turn() !== playerColor[0]} />

                <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <div className="board-wrapper">
                        <div className="board">
                            <Chessboard position={boardPos} onPieceDrop={onDrop} animationDuration={0} boardOrientation={playerColor} />
                        </div>
                    </div>
                </div>

                <UsernameDisplay username={socket.id} indicateTurn={gameActive && chess.turn() === playerColor[0]} />

                <div style={{ display: 'flex', justifyContent: 'center', marginTop: "-10px" }}>
                    <div style={{ width: '500px', height: '500px'}}>
                        <span className="flex two" style={flexStyle}>
                            <button className="button" type="button" onClick={resign}>Resign</button>
                            <button className="button" type="button" onClick={drawOffered ? acceptDraw : offerDraw}>{drawOffered ? "Draw offered. Accept?" : "Offer Draw"}</button>
                        </span>
                        {/* <span className="flex one" style={flexStyle}>
                            {false && (
                                <button style={{marginTop: "0px" }} className="button" type="button" onClick={acceptDraw}>Draw offered. Accept?</button>
                            )}
                        </span> */}
                    </div>
                </div>`
            </div>
        </>
    )
}