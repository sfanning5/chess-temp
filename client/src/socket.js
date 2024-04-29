import { io } from "socket.io-client"

// const socket = io('localhost:8080') // TODO: set it to render
const socket = io('chess-temp.onrender.com', { transports: ['websocket'] }) 

export default socket