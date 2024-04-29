import { useContext, createContext, useState, useMemo, useEffect } from "react";
import GameContext from "./GameContext";
import { Chessboard } from "react-chessboard";
import { Chess } from "chess.js";
import socket from './socket';

const emptyRecord = {username: "None", wins: 0, draws: 0, losses: 0}

export function Statistics(props)
{
    const { record } = props
    return (
        <span style={{ textAlign: "right", paddingRight: "10px", paddingLeft: "1px" }}>
            <span style={{ color: "#2ECC40" }} className="username-text">{record.wins}</span>
            <span style={{ color: "#333333" }} className="username-text">{"/" + record.draws + "/"}</span>
            <span style={{ color: "#FF4136" }} className="username-text">{record.losses}</span>
        </span>
    )
}

function UsernameDisplay(props)
{
    const { username, indicateTurn, record } = props

    const backgroundColor = indicateTurn ? "#CCE3F7" : null

    return (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: "4px", marginBottom: "4px" }}>
            <span className="flex two" style={{ paddingTop: "2.5px", marginLeft: "0px", width: "500px", height: "35px", backgroundColor: backgroundColor, borderRadius: "10px"}}>
                <span className="username-text">{username}</span>
                <Statistics record={record} />
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
    const [titleText, setTitleText] = useState("Play Chess")
    const [opponentName, setOpponentName] = useState("No Opponent")
    const [playerRecord, setPlayerRecord] = useState(emptyRecord)
    const [opponentRecord, setOpponentRecord] = useState(emptyRecord)

    const { page, setPage, gameData, setGameData, username } = useContext(GameContext)

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

    function returnHome()
    {
        socket.off()
        setPage("matchmaking")
    }

    function endGame()
    {
        setGameActive(false)
    }

    function resign()
    {
        socket.emit("resign", gameData.id)
        setTitleText("Resignation, " + (gameData.playerColor === "white" ? "black" : "white") + " wins!")
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

    function updateRecords(gameData)
    {
        if (gameData.records[0].username === username) {
            setPlayerRecord(gameData.records[0])
            setOpponentRecord(gameData.records[1])
        }
        else {
            setPlayerRecord(gameData.records[1])
            setOpponentRecord(gameData.records[0])
        }
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

            updateRecords(gameData)

            setGameActive(true)
            chess.reset()
            setBoardPos(chess.fen())
            console.log("Starting Game " + gameData.id)
        // })

        socket.on("opponent resigns", () => {
            setTitleText("Resignation, " + (gameData.playerColor === "black" ? "black" : "white") + " wins!")
            endGame()
        })

        socket.on("checkmate", () => {
            setTitleText("Checkmate, " + (chess.turn() === "w" ? "black" : "white") + " wins!")
            endGame()
        })

        socket.on("draw", () => {
            setTitleText("Draw")
            endGame()
        })

        socket.on("offer draw", () => {
            setDrawOfferReceived(true)
        }) 

        socket.on("update records", (gameData) => {
            console.log("UPDATING")
            updateRecords(gameData)
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
                    <span className="header-text">{titleText}</span>
                </div>

                <UsernameDisplay username={opponentName} indicateTurn={gameActive && chess.turn() !== playerColor[0]} record={opponentRecord} />

                <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <div className="board-wrapper">
                        <div className="board">
                            <Chessboard position={boardPos} onPieceDrop={onDrop} animationDuration={0} boardOrientation={playerColor} />
                        </div>
                    </div>
                </div>

                <UsernameDisplay username={username} indicateTurn={gameActive && chess.turn() === playerColor[0]} record={playerRecord} />

                <div style={{ display: 'flex', justifyContent: 'center', marginTop: "-10px" }}>
                    <div style={{ width: '500px', height: '500px'}}>
                        { gameActive && 
                        <span className="flex two" style={flexStyle}>
                            <button className="button" type="button" onClick={resign}>Resign</button>
                            <button className="button" disabled={drawOfferSent} type="button" onClick={drawOfferReceived ? acceptDraw : offerDraw}>{drawOfferReceived ? "Draw offered. Accept?" : "Offer Draw"}</button>
                        </span>
                        }
                        { !gameActive && 
                        <span className="flex one" style={flexStyle}>
                                <button className="button" type="button" onClick={returnHome}>Return Home</button>
                        </span>
                        }
                    </div>
                </div>`
            </div>
        </>
    )
}