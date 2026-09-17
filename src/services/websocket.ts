import { io, type Socket } from "socket.io-client";

// admin-backend hosts its own Socket.IO server (see
// admin-backend/src/services/socket-server.ts). Auth happens once at the
// handshake via the same admin session cookie the REST API uses -- no
// per-room token/join dance like client-frontend's socket needs, every
// authenticated socket is auto-joined to the one shared "admin" room.
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4100/api";
const WEBSOCKET_URL = import.meta.env.VITE_WEBSOCKET_URL || API_URL.replace(/\/api\/?$/, "");

let socket: Socket | null = null;

function getSocket(): Socket {
  socket ??= io(WEBSOCKET_URL, { transports: ["websocket", "polling"], withCredentials: true });
  return socket;
}

/** Subscribes to a Socket.IO event; returns an unsubscribe function for effect cleanup. */
export function onSocketEvent<T>(event: string, handler: (data: T) => void): () => void {
  const activeSocket = getSocket();
  activeSocket.on(event, handler);
  return () => {
    activeSocket.off(event, handler);
  };
}
