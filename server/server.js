const express = require('express');
const { Server } = require("socket.io");
const http = require('http');
const { v4: uuidV4 } = require('uuid');
const { start } = require('repl');

const app = express(); // initialize express
const server = http.createServer(app);
const port = process.env.PORT || 8080

unpairedPlayers = []

activeGames = new Map()

const socketServer = new Server(server, 
{
    cors: '*', // allow connection from any origin
});

function startGame() 
{
    // Sets up game
    let white = unpairedPlayers[0]
    let black = unpairedPlayers[1]

    let gameData = {}
    gameData.id = uuidV4()
    console.log("Starting Game " + gameData.id)
    gameData.white = white.username
    gameData.black = black.username

    // Emits messages
    for (let i = 0; i < 2; i++)
    {
        gameData.playerColor = i === 0 ? "white" : "black"
        unpairedPlayers[i].emit("start game", gameData)
    }

    // Adds additional server info
    gameData.whiteSocket = white
    gameData.blackSocket = black
    gameData.players = [gameData.whiteSocket, gameData.blackSocket]
    unpairedPlayers.splice(0, 2) // removes players from list

    // Stores
    activeGames.set(gameData.id, gameData)
}

function makeMove(moveData, playerSocket) 
{
    let gameData = activeGames.get(moveData.gameID)
    gameData.players.forEach(element => {
        if (element !== playerSocket) {
            element.emit("move", moveData.move)
            console.log("sending to " + element.id)
        }
    });
}

function endGame(gameID, winner=null, resigned=null)
{
    let gameData = activeGames.get(gameID)
    // Test
    // Sends socket messages
    if(winner !== null)
    {
        gameData.players.forEach(element => {
            element.emit("checkmate")
        })
    }
    else if (resigned !== null)
    {
        gameData.players.forEach(element => {
            console.log(element.id)
            if(element !== resigned)
                element.emit("opponent resigns")
        })
    }
    else // If draw
    {
        gameData.players.forEach(element => {
            element.emit("draw")
        })
    }
    
    // Unpairs players
    gameData.players.forEach(element => {
        addUnpairedPlayer(element)
    })

    // Removes game
    activeGames.delete(gameID)
}

function addUnpairedPlayer(socket)
{
    unpairedPlayers.push(socket)

    if (unpairedPlayers.length >= 2) {
        startGame()
    }
}

socketServer.on("connection", (socket) => 
{
    console.log(socket.id + " connected")

    socket.username = socket.id
    socket.on("username", (username) => 
    {
        socket.username = username
        console.log("Setting username " + username)
    })

    socket.on("move", (moveData) => 
    {
        makeMove(moveData, socket)
    })

    socket.on("checkmate", (gameID) => {
        endGame(gameID, socket)
    })

    socket.on("draw", (gameID) => {
        endGame(gameID)
    })

    socket.on("resign", (gameID) => {
        endGame(gameID, null, socket)
    })

    socket.on("offer draw", (gameID) => {
        let gameData = activeGames.get(gameID)
        gameData.players.forEach(element => {
            if (element !== socket)
                element.emit("offer draw")
        })
    })

    socket.on("disconnect", () => {
        console.log(socket.id + " disconnected")
        if (unpairedPlayers.includes(socket)) // Player not in a game
        {
            unpairedPlayers.splice(unpairedPlayers.indexOf(socket))
            console.log(socket.id + " removed from unpairedPlayers")
            return
        }
        else // Player in a game
        {
            activeGames.forEach(gameData => {
                if(gameData.players.includes(socket))
                {
                    gameData.players.splice(gameData.players.indexOf(socket), 1)
                    endGame(gameData.id, null, socket)
                    console.log(socket.id + " resigned game " + gameData.id + " due to disconnect")
                    return
                }
            })
        }
    })

    addUnpairedPlayer(socket)
})

server.listen(port, () => {
    console.log(`listening on *:${port}`);
});