import { io } from "socket.io-client"

// const socket = io('localhost:8080')
const socket = io('https://chess-temp.onrender.com') // TODO: this might not let things work across computers

export default socket