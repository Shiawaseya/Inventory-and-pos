import React, { createContext, useContext, useEffect } from "react";
import {
  socket,
  connectSocket,
  disconnectSocket,
  type AppSocket,
} from "@/lib/socket";

const SocketContext = createContext<AppSocket>(socket);

/**
 * Thin wrapper kept for backwards compatibility: existing code can keep
 * calling useSocket(). The actual client lives in lib/socket.ts.
 */
export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  useEffect(() => {
    connectSocket();
    return () => disconnectSocket();
  }, []);

  return (
    <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>
  );
};

export const useSocket = (): AppSocket => useContext(SocketContext);
