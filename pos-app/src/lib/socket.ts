import { io, type Socket } from "socket.io-client";
import type {
  ServerToClientEvents,
  ClientToServerEvents,
} from "@/types/socket.types";
import type {
  NotificationClientEvents,
  NotificationServerEvents,
} from "@/features/notifications/types";
import { loginApi } from "@/features/authentications/api/loginApi";

export type AppSocket = Socket<
  ServerToClientEvents & NotificationServerEvents,
  ClientToServerEvents & NotificationClientEvents
>;

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL || "http://192.168.8.33:3001";

/**
 * The one and only Socket.io client for the app.
 * - Created once, never connected until connectSocket() is called.
 * - `auth` is a function, so the latest user is read on every (re)connect.
 */
export const socket: AppSocket = io(SOCKET_URL, {
  autoConnect: false,
  transports: ["websocket", "polling"],
  auth: (callback) => {
    const user = loginApi.getUser();
    callback({
      role: user?.role,
      userId: user?.employeeId,
      oicId: user?.employeeId,
      branchId: user?.branchId,
    });
  },
});

socket.on("connect", () => console.log("socket connected", socket.id));
socket.on("connect_error", (err) => console.error("socket connect_error", err));
socket.io.on("reconnect_attempt", (attempt) =>
  console.log("socket reconnect_attempt", attempt),
);

export function connectSocket() {
  if (!socket.connected && !socket.active) socket.connect();
  return socket;
}

export function disconnectSocket() {
  socket.disconnect();
}

/** Call after login / logout so the server sees the new user. */
export function reconnectSocket() {
  socket.disconnect();
  socket.connect();
  return socket;
}
