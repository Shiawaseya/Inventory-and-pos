// SocketProvider.tsx
import React, { createContext, useContext, useEffect, useState } from "react";
import type { Socket } from "socket.io-client";
import io from "socket.io-client";
import { useQueryClient } from "@tanstack/react-query";
import type {
  ServerToClientEvents,
  ClientToServerEvents,
} from "../types/socket.types";
import { loginApi } from "../features/authentications/api/loginApi";
import { salesOicApi } from "../api/salesOicApi";
import { handleRemoteStockUnitsInserted } from "../features/notifications/utils/stockNotifications";

type SocketType = Socket<ServerToClientEvents, ClientToServerEvents>;

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:3001";

const SocketContext = createContext<SocketType | null>(null);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const queryClient = useQueryClient();
  const [socket, setSocket] = useState<SocketType | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);

  useEffect(() => {
    let newSocket: SocketType | null = null;
    let disposed = false;

    const connect = async () => {
      setIsInitializing(true);
      const user = loginApi.getUser();
      if (!user?.employeeId || !user.branchId) {
        setSocket(null);
        setIsInitializing(false);
        return;
      }

      let oicId: number | string | undefined;
      try {
        const oicResponse = await salesOicApi.getSalesOic(user.branchId);
        const salesOic = oicResponse.data[0];
        oicId = salesOic?.employee_id ?? salesOic?.id;
      } catch (error) {
        console.error("Failed to load branch sales OIC", error);
      }

      if (disposed) return;

      const authPayload = {
        role: user.role,
        userId: user.employeeId,
        oicId,
        branchId: user.branchId,
      };

      newSocket?.disconnect();
      newSocket = io(SOCKET_URL, {
        auth: authPayload,
        transports: ["websocket", "polling"],
      });
      newSocket.on("connect", () =>
        console.log("socket connected", newSocket?.id, "auth=", authPayload),
      );
      newSocket.on("connect_error", (err) =>
        console.error("socket connect_error", err, "auth=", authPayload),
      );
      newSocket.on("item_catalog_updated", () => {
        void queryClient.invalidateQueries({ queryKey: ["branch-items"] });
        void queryClient.invalidateQueries({ queryKey: ["items"] });
      });

      // 2. Listen for branch inventory updates
      newSocket.on("branch_inventory_updated", () => {
        void queryClient.invalidateQueries({
          queryKey: ["branch-inventory-serialized"],
        });
        void queryClient.invalidateQueries({
          queryKey: ["checkout-inventory"],
        });
      });
      newSocket.on("stock_units_inserted", (payload) => {
        handleRemoteStockUnitsInserted(payload);
        void queryClient.invalidateQueries({ queryKey: ["stock-units"] });
        void queryClient.invalidateQueries({
          queryKey: ["branch-inventory-serialized"],
        });
        void queryClient.invalidateQueries({
          queryKey: ["checkout-inventory"],
        });
        void queryClient.invalidateQueries({ queryKey: ["branch-items"] });
      });
      setSocket(newSocket);
      setIsInitializing(false);
    };

    void connect();
    window.addEventListener("auth-state-changed", connect);

    return () => {
      disposed = true;
      window.removeEventListener("auth-state-changed", connect);
      if (newSocket) newSocket.disconnect();
    };
  }, [queryClient]);

  if (loginApi.isAuthenticated() && (isInitializing || !socket)) return null;

  return (
    <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>
  );
};

export const useSocket = (): SocketType => {
  const socket = useContext(SocketContext);
  if (!socket) throw new Error("Socket not initialized");
  return socket;
};
