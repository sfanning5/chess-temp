import { useContext, createContext, useState, useMemo, useEffect } from "react";
import GameContext from "./GameContext";
import { Chessboard } from "react-chessboard";
import { Chess } from "chess.js";
import socket from './socket';

export function Statistics(props)
{
    return (
        <span style={{ textAlign: "right", paddingRight: "10px", paddingLeft: "1px" }}>
            <span style={{ color: "#2ECC40" }} className="username-text">{"0"}</span>
            <span style={{ color: "#333333" }} className="username-text">{"/0/"}</span>
            <span style={{ color: "#FF4136" }} className="username-text">{"0"}</span>
        </span>
    )
}

function UsernameDisplay(props)
{
    const { username, indicateTurn } = props

    const backgroundColor = indicateTurn ? "#CCE3F7" : null

    return (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: "4px", marginBottom: "4px" }}>
            <span className="flex two" style={{ paddingTop: "2.5px", marginLeft: "0px", width: "500px", height: "35px", backgroundColor: backgroundColor, borderRadius: "10px"}}>
                <span className="username-text">{username}</span>
                <Statistics />
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
    const [drawOfferReceived, setDrawOfferReceived] = useState(false)
    const [drawOfferSent, setDrawOfferSent] = useState(false)
    const [displayText, setDisplayText] = useState("Start of game")
    const [opponentName, setOpponentName] = useState("No Opponent")

    const { page, setPage, gameData, setGameData, username } = useContext(GameContext)

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
        // setGameActive(false)
        // setDrawOffered(false)
        socket.off()
        setPage("matchmaking")
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
        setDrawOfferSent(true)
    }

    function acceptDraw() 
    {
        socket.emit("draw", gameData.id)
        setDrawOfferReceived(false)
    }

    useEffect(() => {
        socket.on("move", (move) => {
            console.log("Got Move " + move.lan)
            playMove(move)
        })

        // socket.on("start game", (gameData) => {
            setGameData(gameData)
            setPlayerColor(gameData.playerColor)
            setOpponentName(gameData.playerColor === "white" ? gameData.black : gameData.white)
            setDisplayText("Start of game")
            setGameActive(true)
            chess.reset()
            setBoardPos(chess.fen())
            console.log("Starting Game " + gameData.id)
        // })

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
            console.log("Received draw")
            alert("Draw")
            endGame()
        })

        socket.on("offer draw", () => {
            setDrawOfferReceived(true)
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
            console.log("Game ID: " + gameData.id)
            socket.emit("move", moveData)
        }
    }

    const flexStyle = {
        gap: "20px",
        justifyContent: 'center',
        marginLeft: "-5px"
    }

    return (
        <>
            <div style={{ marginTop: "10px", justifyContent: 'center' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: "0px"}}>
                    <span className="header-text">Play Chess</span>
                </div>

                <UsernameDisplay username={opponentName} indicateTurn={gameActive && chess.turn() !== playerColor[0]} />

                <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <div className="board-wrapper">
                        <div className="board">
                            <Chessboard position={boardPos} onPieceDrop={onDrop} animationDuration={0} boardOrientation={playerColor} />
                        </div>
                    </div>
                </div>

                <UsernameDisplay username={username} indicateTurn={gameActive && chess.turn() === playerColor[0]} />

                <div style={{ display: 'flex', justifyContent: 'center', marginTop: "-10px" }}>
                    <div style={{ width: '500px', height: '500px'}}>
                        <span className="flex two" style={flexStyle}>
                            <button className="button" type="button" onClick={resign}>Resign</button>
                            <button className="button" disabled={drawOfferSent} type="button" onClick={drawOfferReceived ? acceptDraw : offerDraw}>{drawOfferReceived ? "Draw offered. Accept?" : "Offer Draw"}</button>
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