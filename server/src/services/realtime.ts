import { Server as HttpServer } from "http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { JWTPayload } from "../middleware/auth";

let io: Server | null = null;

// Rooms: "user:<id>" for personal notifications, "staff" for the command center,
// and everyone receives public "issue:*" broadcasts.
export function initRealtime(server: HttpServer) {
  io = new Server(server, {
    cors: { origin: env.corsOrigins.length ? env.corsOrigins : "*" },
  });
  io.on("connection", (socket) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return;
    try {
      const payload = jwt.verify(token, env.jwtSecret) as JWTPayload;
      socket.join(`user:${payload.sub}`);
      if (payload.role === "admin" || payload.role === "staff") socket.join("staff");
    } catch {
      // anonymous socket: only public broadcasts
    }
  });
  return io;
}

export function emitToUser(userId: string, event: string, data: unknown) {
  io?.to(`user:${userId}`).emit(event, data);
}

export function emitToStaff(event: string, data: unknown) {
  io?.to("staff").emit(event, data);
}

export function broadcast(event: string, data: unknown) {
  io?.emit(event, data);
}

export function connectedClients() {
  return io?.engine.clientsCount ?? 0;
}
