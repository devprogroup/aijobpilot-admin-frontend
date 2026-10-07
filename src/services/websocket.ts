import { io, type Socket } from "socket.io-client";
import { getAdminToken } from "../api";

// admin-backend hosts its own Socket.IO server (see
// admin-backend/src/services/socket-server.ts). Auth happens once at the
// handshake via the same JWT the REST API uses. Every
// authenticated socket is auto-joined to the one shared "admin" room.
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4100/api";
const WEBSOCKET_URL = import.meta.env.VITE_WEBSOCKET_URL || API_URL.replace(/\/api\/?$/, "");

let socket: Socket | null = null;

export function disconnectAdminSocket(): void {
  socket?.disconnect();
  socket = null;
}

if (typeof window !== "undefined") {
  window.addEventListener("admin:unauthorized", disconnectAdminSocket);
}

function getSocket(): Socket {
  socket ??= io(WEBSOCKET_URL, {
    transports: ["websocket", "polling"],
    withCredentials: false,
    auth: (callback) => callback({ token: getAdminToken() }),
  });
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
