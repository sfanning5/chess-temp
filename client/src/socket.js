import { io } from "socket.io-client"

const socket = io('localhost:8080') // TODO: this might not let things work across computers

export default socket