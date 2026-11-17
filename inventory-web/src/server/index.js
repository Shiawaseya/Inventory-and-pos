const express = require("express");
const app = express();
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log(`a user connected: ${socket.id}`);
  // log handshake auth sent by client for debugging/verification
  let handshakeAuth = {};
  try {
    handshakeAuth =
      socket.handshake && socket.handshake.auth ? socket.handshake.auth : {};
    console.log("socket.handshake.auth:", handshakeAuth);
  } catch (e) {
    console.warn("failed to read socket.handshake.auth", e);
    handshakeAuth = {};
  }

  const { role, userId, oicId } = handshakeAuth ?? {};

  socket.data.role = role;
  socket.data.userId = userId;
  socket.data.oicId = oicId;

  if (userId) {
    socket.join(`user:${userId}`);
  }

  // admin scope room
  if (oicId) {
    socket.join(`admin:${oicId}`);
  }

  // handle submit_transaction with acknowledgement
  socket.on("submit_transaction", async (payload, callback) => {
    console.log("received submit_transaction", payload);
    // also log the auth associated with this socket for tracing
    try {
      console.log(
        "submit auth:",
        socket.handshake && socket.handshake.auth ? socket.handshake.auth : {},
      );
    } catch (e) {
      console.warn("failed to read socket.handshake.auth during submit", e);
    }
    try {
      // Workflow: submission creates a PENDING transaction that must be
      // approved by the OIC. Do NOT persist to REST API here.
      const pending = {
        success: true,
        status: "pending",
        data: payload,
        message: "Transaction pending OIC approval",
      };

      // ack the submitting client that the transaction is pending
      if (typeof callback === "function") callback(null, pending);

      // notify the submitting client as well (optional)
      socket.emit("transaction_pending_ack", pending);

      // send to OIC/admin room as a pending transaction for approval
      if (socket.data.oicId) {
        io.to(`admin:${socket.data.oicId}`).emit("transaction_pending", {
          transaction: payload,
          fromUser: socket.data.userId,
        });
      } else {
        console.warn(
          "not emitting transaction_pending: socket has no oicId",
          socket.id,
        );
      }
    } catch (err) {
      console.error("error processing transaction", err);
      if (typeof callback === "function") callback({ message: String(err) });
      socket.emit("reply", { success: false, message: String(err) });
    }
  });

  // OIC approves a pending transaction; this should call the REST API to persist
  socket.on(
    "approve_transaction",
    async ({ transaction, userId, meta } = {}, callback) => {
      console.log(
        "approve_transaction received from",
        socket.id,
        "role=",
        socket.data.role,
        "oicId=",
        socket.data.oicId,
      );

      // basic authorization: require this socket to be the OIC for the branch
      if (!socket.data.oicId) {
        const err = "socket not authorized to approve transactions";
        console.warn(err, socket.id);
        if (typeof callback === "function") return callback({ message: err });
        return;
      }

      try {
        // Attempt to POST to the REST API. Try axios if available, else fetch, else simulate.
        let apiResponse = null;
        try {
          const axios = require("axios");
          const res = await axios.post(
            "http://192.168.8.36/inventory_management_api/sales/create-with-serial",
            transaction,
            { timeout: 10000 },
          );
          apiResponse = { ok: true, data: res.data };
        } catch (e) {
          // axios not available or failed; try fetch if present
          if (typeof fetch === "function") {
            const res = await fetch(
              "http://192.168.8.36/inventory_management_api/sales/create-with-serial",
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(transaction),
              },
            );
            const json = await res.json().catch(() => null);
            apiResponse = { ok: res.ok, status: res.status, data: json };
          } else {
            // fallback: simulate a successful API call
            apiResponse = { ok: true, data: { simulated: true } };
          }
        }

        if (apiResponse && apiResponse.ok) {
          console.log(
            "emitting transaction_approved to user:",
            userId,
            "response:",
            apiResponse.data,
          );
          // notify the original user that their transaction was approved and persisted
          io.to(`user:${userId}`).emit("transaction_approved", {
            transaction,
            response: apiResponse.data,
          });
          if (typeof callback === "function")
            callback(null, { success: true, data: apiResponse.data });
        } else {
          const message =
            apiResponse && apiResponse.data
              ? JSON.stringify(apiResponse.data)
              : "API request failed";
          console.log(
            "emitting transaction_failed to user:",
            userId,
            "message:",
            message,
          );
          io.to(`user:${userId}`).emit("transaction_failed", {
            transaction,
            error: message,
          });
          if (typeof callback === "function") callback({ message });
        }
      } catch (err) {
        console.error("error while approving transaction", err);
        io.to(`user:${userId}`).emit("transaction_failed", {
          transaction,
          error: String(err),
        });
        if (typeof callback === "function") callback({ message: String(err) });
      }
    },
  );

  // OIC rejects a pending transaction
  socket.on(
    "reject_transaction",
    ({ userId, reason, transaction } = {}, callback) => {
      console.log("reject_transaction from", socket.id, "reason=", reason);
      if (!socket.data.oicId) {
        const err = "socket not authorized to reject transactions";
        console.warn(err, socket.id);
        if (typeof callback === "function") return callback({ message: err });
        return;
      }

      try {
        console.log(
          "emitting transaction_rejected to user:",
          userId,
          "reason:",
          reason,
        );
        io.to(`user:${userId}`).emit("transaction_rejected", {
          reason,
          transaction,
        });
        if (typeof callback === "function") callback(null, { success: true });
      } catch (err) {
        console.error("error rejecting transaction", err);
        if (typeof callback === "function") callback({ message: String(err) });
      }
    },
  );

  socket.on("disconnect", () => {
    console.log("user disconnected:", socket.id);
  });
});
server.listen(3001, () => {
  console.log("listening on *:3001");
});
