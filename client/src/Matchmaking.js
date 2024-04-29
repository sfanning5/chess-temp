import { useContext, createContext, useState, useMemo, useEffect } from "react";
import GameContext from "./GameContext";
import socket from './socket';
import { Statistics } from "./Game";

function GameTable(props)
{
    const { games, username } = props

    function joinGame(gameData)
    {
        console.log("Joining game: " + gameData.id)
        let joinMsg = {id: gameData.id, username: username}
        socket.emit("join game", joinMsg)
    }

    function closeGame(gameData)
    {
        socket.emit("close game", gameData.id)
    }

    return (
        <table style={{width: "100%"}}>
            <tbody>
                {games.map(gameData => (
                    <tr key={gameData.id}>
                        <td style={{ width: '80%' }}>{gameData.playerNames[0]}</td>
                        <td style={{ width: '10%'}}><div style={{ marginRight:"-40px"}}><Statistics /></div></td>
                        <td style={{ width: '10%' }}><button onClick={() => { gameData.playerNames[0] === username ? closeGame(gameData) : joinGame(gameData)}} style={{ marginRight: "-30px" }} className="list-button">
                            {gameData.playerNames[0] === username ? "Close" : "Join"}</button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    )
}

export default function Matchmaking ()
{
    const [gameCreated, setGameCreated] = useState(false)
    const [openGames, setOpenGames] = useState([])

    const {page, setPage, gameData, setGameData, username} = useContext(GameContext)

    function createGame() 
    {
        socket.emit("create game", username)
    }

    useEffect(() => {
        socket.on("updated matchmaking", (publicOpenGames) => {
            
            // Checks if current user has a game
            let hasGame = false
            publicOpenGames.forEach(element => {
                if(element.playerNames[0] === username)
                    hasGame = true
            });
            setGameCreated(hasGame)

            console.log("Games updated", publicOpenGames)
            setOpenGames(publicOpenGames)
            console.log(openGames)
        })

        socket.on("start game", (gameData) => {
            console.log("START GAME", gameData)
            setGameData(gameData)
            setPage("game")
        })

        socket.emit("update matchmaking")

    }, [])

    return (
        <>
            <div style={{ display: 'flex', flexDirection: "column", alignItems: "center", justifyContent: 'center', marginBottom: "0px" }}>
                <span className="header-text">Find a Match</span>
                <span style={{ marginTop: "-5px" }} className="username-text">{username}</span>

                <button onClick={createGame} disabled={gameCreated} style={{width: "240px", fontSize: "16px", borderRadius: "10px"}}>Create Game</button>

                <div className="card-outline" style={{ height: "568px", width: "500px", marginTop: "10px" }}>
                    <div className="card" style={{ height: "560px" }}>
                        { openGames.length==0 && (
                        <div style={{ display: "flex", alignItems: "center", justifyContent: 'center', height: "150px" }}>
                                <span className="standard-text">No games yet... Why not make one?</span>
                        </div>
                        )}
                        <GameTable games={openGames} username={username}/>
                    </div>
                </div>

            </div>
        </>
    )
}