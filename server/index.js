const express = require('express');
const { Server } = require("socket.io");
const http = require('http');
const { v4: uuidV4 } = require('uuid');
const { start } = require('repl');

const app = express(); // initialize express
const server = http.createServer(app);
const port = process.env.PORT || 8080
const path = require('path');

let unpairedPlayers = []

const openGames = new Map() // Sent to every player after a new game is posted/removed
const publicOpenGames = new Map() // Stores socket data as well as public data

const activeGames = new Map()

const socketServer = new Server(server,
  {
    cors: {
      origins: "*:*",
      methods: ["GET", "POST"]
    }
  });

function broadcastUpdate() 
{
  unpairedPlayers.forEach(element => {
    element.emit("updated matchmaking", [...publicOpenGames.values()])
  })
}

function createGame(username, socket)
{
  // Inits game
  let gameData = {}
  gameData.id = uuidV4()
  console.log("Creating Game " + gameData.id)
  gameData.playerNames = [username]

  publicOpenGames.set(gameData.id, {...gameData}) // Stores copy of current data

  // Broadcasts new game
  broadcastUpdate()

  // Stores server-side data
  gameData.players = [socket]

  // Stores new game
  openGames.set(gameData.id, gameData)
}

function removeOpenGames(socketID)
{
  let changed = false
  for (const element of openGames.values()) {
    if (element.players[0].id == socketID) {
      openGames.delete(element.id)
      publicOpenGames.delete(element.id)
      changed = true
    }
  }

  if(changed)
    broadcastUpdate()
}

function startGame(gameID, socket, username) 
{
  // Sets up game
  let publicGameData = publicOpenGames.get(gameID)
  let gameData = openGames.get(gameID)

  publicGameData.playerNames.push(username)

  gameData.playerNames = publicGameData.playerNames
  gameData.players.push(socket)

  // Chooses colors
  if(Math.random() > 0.5)
  {
    publicGameData.white = publicGameData.playerNames[0]
    publicGameData.black = publicGameData.playerNames[1]
  }
  else
  {
    publicGameData.white = publicGameData.playerNames[1]
    publicGameData.black = publicGameData.playerNames[0]
  }

  console.log("Starting Game " + gameData.id)

  // Emits messages
  for (let i = 0; i < 2; i++) {
    publicGameData.playerColor = publicGameData.playerNames[i] === publicGameData.white ? "white" : "black"
    gameData.players[i].emit("start game", publicGameData)
  }

  // Adds additional server info
  unpairedPlayers = unpairedPlayers.filter(item => (item.id !== gameData.players[0].id && item.id !== gameData.players[1].id)) // removes players from list

  // Stores
  activeGames.set(gameData.id, gameData)

  // Removes open games
  openGames.delete(gameID)
  publicOpenGames.delete(gameID)
  broadcastUpdate()

  // Removes other open games with current players
  removeOpenGames(gameData.players[0].id)
  removeOpenGames(gameData.players[1].id)
}

function makeMove(moveData, playerSocket) {
  let gameData = activeGames.get(moveData.gameID)
  gameData.players.forEach(element => {
    if (element !== playerSocket) {
      element.emit("move", moveData.move)
      console.log("sending to " + element.id)
    }
  });
}

function endGame(gameID, winner = null, resigned = null) {
  let gameData = activeGames.get(gameID)
  for (const soc of gameData.players)
  {
    console.log("GAME", soc.id)
  }

  // Sends socket messages
  if (winner !== null) {
    gameData.players.forEach(element => {
      element.emit("checkmate")
    })
  }
  else if (resigned !== null) {
    gameData.players.forEach(element => {
      console.log(element.id)
      if (element !== resigned)
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

function addUnpairedPlayer(socket) {
  unpairedPlayers.push(socket)
}

socketServer.on("connection", (socket) => {
  console.log(socket.id + " connected")

  // Matchmaking
  socket.on("update matchmaking", () => {
    socket.emit("updated matchmaking", [...publicOpenGames.values()]) // Updates game list
  })
  
  socket.on("create game", (username) => {
    createGame(username, socket)
  })

  socket.on("close game", (gameID) => {
    console.log("closing game " + gameID)
    publicOpenGames.delete(gameID)
    openGames.delete(gameID)
    broadcastUpdate()
  })

  socket.on("join game", (joinMsg) => {
    startGame(joinMsg.id, socket, joinMsg.username)
  })

  // Gameplay
  socket.on("move", (moveData) => {
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
      unpairedPlayers.splice(unpairedPlayers.indexOf(socket), 1)
      removeOpenGames(socket.id)
      console.log(socket.id + " removed from unpairedPlayers")
      return
    }
    else // Player in a game
    {
      activeGames.forEach(gameData => {
        if (gameData.players.includes(socket)) {
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

app.use(express.static(path.resolve(__dirname, '../client/build')));

app.get('*', (req, res) => {
  res.sendFile(path.resolve(__dirname, '../client/build', 'index.html'));
});

server.listen(port, () => {
  console.log(`listening on *:${port}`);
});