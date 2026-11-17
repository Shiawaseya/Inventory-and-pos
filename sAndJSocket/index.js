const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);

const API_BASE_URL =
  process.env.API_BASE_URL || "";

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Helper for HTTP requests using Node's native fetch
async function postToApi(endpoint, body) {
  try {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000), // 10s timeout
    });

    const data = await res.json().catch(() => null);
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    return { ok: false, status: 500, error: err.message };
  }
}

io.on("connection", (socket) => {
  let handshakeAuth = {};
  try {
    handshakeAuth = socket.handshake?.auth || {};
  } catch (e) {
    console.warn("[Socket Auth Error] Failed reading handshake auth", e);
  }

  const { role, userId, oicId, branchId } = handshakeAuth;

  socket.data.role = role;
  socket.data.userId = userId ? String(userId) : null;
  socket.data.oicId = oicId ? String(oicId) : null;
  socket.data.branchId = branchId ? String(branchId) : null;

  console.log(
    `[Socket Connected] ID: ${socket.id} | Role: ${role || "N/A"} | UserID: ${userId || "N/A"} | OIC_ID: ${oicId || "N/A"}`,
  );

  if (socket.data.userId) {
    socket.join(`user:${socket.data.userId}`);
  }

  if (socket.data.branchId) {
    socket.join(`branch:${socket.data.branchId}`);
  }

  if (socket.data.oicId && socket.data.role === "sales-oic") {
    socket.join(`admin:${socket.data.oicId}`);
    console.log(
      `[Room Joined] Socket ${socket.id} joined admin:${socket.data.oicId}`,
    );
  }

  // --- STOCK UNITS INSERTED (notify everyone else in the same branch) ---
  socket.on("stock_units_inserted", (payload = {}, callback) => {
    const branchRoom = socket.data.branchId
      ? `branch:${socket.data.branchId}`
      : null;
    const items = Array.isArray(payload.items) ? payload.items : [];

    if (!branchRoom || items.length === 0) {
      if (typeof callback === "function")
        callback({ message: "INVALID_STOCK_NOTIFICATION" });
      return;
    }

    // Only forward known fields; identity comes from the socket, not the client.
    const safeItems = items.slice(0, 20).map((item) => ({
      variant_id: Number(item.variant_id),
      name: String(item.name ?? "").slice(0, 120),
      model: item.model ? String(item.model).slice(0, 120) : null,
      serials: Math.max(0, Number(item.serials) || 0),
    }));

    // socket.to(...) excludes the sender, who already got a local toast.
    socket.to(branchRoom).emit("stock_units_inserted", {
      branchId: socket.data.branchId,
      totalSerials: safeItems.reduce((sum, item) => sum + item.serials, 0),
      items: safeItems,
      insertedBy: socket.data.userId,
      insertedAt: new Date().toISOString(),
    });

    if (typeof callback === "function") callback(null);
  });

  // --- ITEM CATALOG UPDATED (invalidate item lists for everyone else in the branch) ---
  socket.on("item_catalog_updated", (payload = {}, callback) => {
    const branchRoom = socket.data.branchId
      ? `branch:${socket.data.branchId}`
      : null;

    if (!branchRoom) {
      if (typeof callback === "function")
        callback({ message: "INVALID_ITEM_CATALOG_NOTIFICATION" });
      return;
    }

    socket.to(branchRoom).emit("item_catalog_updated", {
      branchId: socket.data.branchId,
      itemId: Number.isFinite(Number(payload.itemId))
        ? Number(payload.itemId)
        : undefined,
      updatedBy: socket.data.userId,
      updatedAt: new Date().toISOString(),
    });

    if (typeof callback === "function") callback(null);
  });

  // --- BRANCH INVENTORY UPDATED (invalidate serialized inventory for the branch) ---
  socket.on("branch_inventory_updated", (payload = {}, callback) => {
    const branchRoom = socket.data.branchId
      ? `branch:${socket.data.branchId}`
      : null;

    if (!branchRoom) {
      if (typeof callback === "function")
        callback({ message: "INVALID_BRANCH_INVENTORY_NOTIFICATION" });
      return;
    }

    socket.to(branchRoom).emit("branch_inventory_updated", {
      branchId: socket.data.branchId,
      itemId: Number.isFinite(Number(payload.itemId))
        ? Number(payload.itemId)
        : undefined,
      variantId: Number.isFinite(Number(payload.variantId))
        ? Number(payload.variantId)
        : undefined,
      branchItemId: Number.isFinite(Number(payload.branchItemId))
        ? Number(payload.branchItemId)
        : undefined,
      updatedBy: socket.data.userId,
      updatedAt: new Date().toISOString(),
    });

    if (typeof callback === "function") callback(null);
  });

  // --- SUBMIT TRANSACTION ---
  socket.on("submit_transaction", async (payload, callback) => {
    const targetOicId = socket.data.oicId;
    const targetRoom = targetOicId ? `admin:${targetOicId}` : null;

    if (!targetOicId || !targetRoom) {
      if (typeof callback === "function") {
        return callback({ message: "NO_OIC_ASSIGNED" });
      }
      return;
    }

    try {
      const activeOicSockets = await io.in(targetRoom).fetchSockets();

      if (activeOicSockets.length === 0) {
        console.log(
          `[SUBMIT] Target OIC #${targetOicId} is offline. Replying with error callback.`,
        );
        if (typeof callback === "function") {
          return callback({ message: "OIC_OFFLINE" });
        }
        return;
      }

      // OIC is online: Forward transaction
      io.to(targetRoom).emit("transaction_pending", {
        transaction: payload,
        fromUser: socket.data.userId,
      });

      if (typeof callback === "function") {
        callback(null, { status: "pending" });
      }
    } catch (err) {
      if (typeof callback === "function") {
        callback({
          message: err instanceof Error ? err.message : "SUBMIT_FAILED",
        });
      }
    }
  });

  // --- APPROVE TRANSACTION ---
  socket.on(
    "approve_transaction",
    async ({ transaction, userId } = {}, callback) => {
      console.log(`\n--- [APPROVE TRANSACTION] ---`);
      console.log(
        `OIC ID: ${socket.data.oicId} approving for Cashier: ${userId}`,
      );

      if (!socket.data.oicId) {
        const err = "Socket not authorized as an OIC to approve transactions";
        console.warn(`[REJECTED]: ${err}`);
        if (typeof callback === "function") return callback({ message: err });
        return;
      }

      try {
        const approvedTransaction = {
          ...transaction,
          authorized_by_employee_id: Number(socket.data.oicId),
        };

        const result = await postToApi(
          "/sales/create-with-serial",
          approvedTransaction,
        );

        if (result.ok) {
          console.log(
            `[DB SUCCESS] Invoice created. Notifying Cashier #${userId}`,
          );
          io.to(`user:${userId}`).emit("transaction_approved", {
            transaction,
            response: result.data,
          });
          if (typeof callback === "function")
            callback(null, { success: true, data: result.data });
        } else {
          const errMsg =
            result.data?.message ||
            result.error ||
            "Failed to persist approved transaction";
          console.error(`[DB ERROR] ${errMsg}`);
          io.to(`user:${userId}`).emit("transaction_failed", {
            transaction,
            error: errMsg,
          });
          if (typeof callback === "function") callback({ message: errMsg });
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.error(`[APPROVE EXCEPTION] ${errMsg}`);
        io.to(`user:${userId}`).emit("transaction_failed", {
          transaction,
          error: errMsg,
        });
        if (typeof callback === "function") callback({ message: errMsg });
      }
    },
  );

  // --- LATER TRANSACTION (Saves as pending_authorization in DB) ---
  socket.on(
    "later_transaction",
    async ({ transaction, userId, isPrint = true } = {}, callback) => {
      console.log(`\n--- [LATER TRANSACTION] ---`);
      console.log(
        `OIC ID: ${socket.data.oicId} deferred transaction for Cashier: ${userId} | isPrint: ${isPrint}`,
      );

      try {
        const payload = {
          ...transaction,
          isPrint: isPrint !== false, // Defaults to true
        };

        const result = await postToApi(
          "/sales/create-without-authorization",
          payload,
        );

        if (result.ok) {
          console.log(
            `[DB SUCCESS] Pending Authorization Invoice created. Notifying Cashier #${userId}`,
          );
          io.to(`user:${userId}`).emit("transaction_pending_authorization", {
            transaction,
            response: result.data,
            message: `Sale marked for later authorization. Invoice: ${
              result.data?.data?.sales_invoice_number || ""
            }`,
          });
          if (typeof callback === "function")
            callback(null, { success: true, data: result.data });
        } else {
          const errMsg =
            result.data?.message ||
            result.error ||
            "Failed to defer transaction";
          console.error(`[DB ERROR] ${errMsg}`);
          io.to(`user:${userId}`).emit("transaction_failed", {
            transaction,
            error: errMsg,
          });
          if (typeof callback === "function") callback({ message: errMsg });
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.error(`[LATER EXCEPTION] ${errMsg}`);
        io.to(`user:${userId}`).emit("transaction_failed", {
          transaction,
          error: errMsg,
        });
        if (typeof callback === "function") callback({ message: errMsg });
      }
    },
  );

  // --- REJECT / VOID TRANSACTION (Records status = 'voided' in DB) ---
  socket.on(
    "reject_transaction",
    async ({ userId, reason, transaction } = {}, callback) => {
      console.log(`\n--- [REJECT / VOID TRANSACTION] ---`);
      console.log(
        `OIC #${socket.data.oicId} voided transaction for Cashier #${userId}. Reason: ${reason}`,
      );

      try {
        const result = await postToApi("/sales/create-voided", {
          ...transaction,
          reference_note: reason || "Voided by Sales OIC",
        });

        if (result.ok) {
          console.log(`[DB SUCCESS] Voided invoice recorded in DB.`);
          io.to(`user:${userId}`).emit("transaction_rejected", {
            reason: reason || "Voided by Sales OIC",
            transaction,
            response: result.data,
          });
          if (typeof callback === "function")
            callback(null, { success: true, data: result.data });
        } else {
          const errMsg =
            result.data?.message ||
            result.error ||
            "Failed to record voided transaction";
          console.error(`[DB ERROR] ${errMsg}`);
          if (typeof callback === "function") callback({ message: errMsg });
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.error(`[VOID EXCEPTION] ${errMsg}`);
        if (typeof callback === "function") callback({ message: errMsg });
      }
    },
  );

  // --- REQUEST INVOICE AUTHORIZATION ---
  socket.on(
    "request_invoice_authorization",
    (
      { invoiceId, invoiceNumber, totalAmount, customerName } = {},
      callback,
    ) => {
      console.log(`\n--- [REQUEST INVOICE AUTHORIZATION] ---`);
      console.log(
        `Invoice #${invoiceId} (${invoiceNumber}) by Cashier #${socket.data.userId}`,
      );

      if (!invoiceId || !socket.data.oicId) {
        const err = "Missing invoice ID or socket has no assigned OIC ID";
        console.warn(`[ERROR] ${err}`);
        if (typeof callback === "function") callback({ message: err });
        return;
      }

      io.to(`admin:${socket.data.oicId}`).emit(
        "invoice_authorization_requested",
        {
          invoiceId,
          invoiceNumber,
          totalAmount,
          customerName,
          requesterId: socket.data.userId,
        },
      );

      if (typeof callback === "function") callback(null, { success: true });
    },
  );

  // --- APPROVE INVOICE AUTHORIZATION ---
  // --- APPROVE INVOICE AUTHORIZATION ---
  socket.on(
    "approve_invoice_authorization",
    async (
      { invoiceId, requesterId, invoiceNumber, isPrint = true } = {},
      callback,
    ) => {
      console.log(`\n--- [APPROVE INVOICE AUTHORIZATION] ---`);
      console.log(
        `Invoice #${invoiceId} approved by OIC #${socket.data.oicId} | isPrint: ${isPrint}`,
      );

      if (!socket.data.oicId) {
        const err =
          "Only authenticated OICs can approve invoice authorizations";
        if (typeof callback === "function") return callback({ message: err });
        return;
      }

      const result = await postToApi(`/sales/${invoiceId}/authorize`, {
        authorized_by: Number(socket.data.oicId),
        isPrint: isPrint !== false, // Defaults to true
      });

      io.to(`user:${requesterId}`).emit("invoice_authorization_approved", {
        invoiceId,
        invoiceNumber,
        authorizedBy: socket.data.oicId,
        data: result.data,
      });

      if (typeof callback === "function")
        callback(null, { success: true, data: result.data });
    },
  );

  // --- REJECT INVOICE AUTHORIZATION ---
  socket.on(
    "reject_invoice_authorization",
    ({ invoiceId, requesterId, invoiceNumber, reason } = {}, callback) => {
      console.log(`\n--- [REJECT INVOICE AUTHORIZATION] ---`);
      console.log(
        `Invoice #${invoiceId} rejected by OIC #${socket.data.oicId}`,
      );

      if (!socket.data.oicId) {
        const err = "Only authenticated OICs can reject invoice authorizations";
        if (typeof callback === "function") return callback({ message: err });
        return;
      }

      io.to(`user:${requesterId}`).emit("invoice_authorization_rejected", {
        invoiceId,
        invoiceNumber,
        reason: reason || "Resumption denied by Sales OIC",
      });

      if (typeof callback === "function") callback(null, { success: true });
    },
  );

  socket.on("disconnect", () => {
    console.log(
      `[Socket Disconnected] ID: ${socket.id} | User: ${socket.data.userId || "N/A"}`,
    );
  });
});

process.on("unhandledRejection", (reason) => {
  console.error("[Unhandled Rejection]", reason);
});

process.on("uncaughtException", (err) => {
  console.error("[Uncaught Exception]", err);
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Socket server listening on port ${PORT}`);
});
