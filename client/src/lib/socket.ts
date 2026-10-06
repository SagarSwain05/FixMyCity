import { io, Socket } from "socket.io-client";
import { API_URL } from "./api";

let socket: Socket | null = null;

export function connectSocket(token: string | null) {
  socket?.disconnect();
  socket = io(API_URL, { auth: token ? { token } : {}, transports: ["websocket", "polling"] });
  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
