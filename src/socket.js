import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const initializeSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL
        ? process.env.FRONTEND_URL.split(",").map((url) => url.trim())
        : ["http://localhost:3000", "http://localhost:5173"],
      credentials: true,
    },
  });

  // Authentication middleware for Socket.io
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth.token ||
        socket.handshake.headers.authorization?.replace("Bearer ", "");

      if (!token) {
        // Allow connection without token (for public notifications)
        return next();
      }

      // Development mode: Allow mock admin token
      if (
        process.env.NODE_ENV === "development" &&
        token === "mock-admin-token"
      ) {
        const admin = await prisma.user.findFirst({
          where: {
            role: "admin",
            status: "active",
          },
        });

        if (admin) {
          socket.user = admin;
          return next();
        }
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
      });

      if (!user || user.status !== "active") {
        return next(new Error("Authentication failed"));
      }

      socket.user = user;
      next();
    } catch (error) {
      // Allow connection even if auth fails (for public notifications)
      next();
    }
  });

  io.on("connection", (socket) => {
    console.log(
      "🔌 Client connected:",
      socket.id,
      "User:",
      socket.user?.name || "Anonymous",
      "Role:",
      socket.user?.role || "None",
    );

    // Join admin room if user is admin
    if (socket.user && socket.user.role === "admin") {
      socket.join("admin");
      console.log(
        "👑 Admin joined admin room:",
        socket.user.name,
        "Socket ID:",
        socket.id,
      );
      console.log(
        "📊 Current admin room members:",
        io.sockets.adapter.rooms.get("admin")?.size || 0,
      );
    } else {
      console.log(
        "⚠️  User is not admin or not authenticated. Role:",
        socket.user?.role || "None",
      );
    }

    // Join user room for personal notifications
    if (socket.user) {
      socket.join(`user:${socket.user.id}`);
      console.log("👤 User joined user room:", socket.user.id);
    }

    socket.on("disconnect", (reason) => {
      console.log("🔌 Client disconnected:", socket.id, "Reason:", reason);
    });
  });

  // Helper function to emit notifications
  const emitNotification = (room, notification) => {
    io.to(room).emit("notification", notification);
    console.log("📢 Notification sent to", room, ":", notification.type);
  };

  return { io, emitNotification };
};

// Export getIo function for external use (e.g., test scripts)
export const getIo = () => {
  if (!io) {
    throw new Error("Socket.io not initialized! Call initializeSocket first.");
  }
  return io;
};

// Export notification emitter functions
export const notifyAdmin = (io, notification) => {
  io.to("admin").emit("notification", notification);
};

export const notifyUser = (io, userId, notification) => {
  io.to(`user:${userId}`).emit("notification", notification);
};

export const notifyAll = (io, notification) => {
  io.emit("notification", notification);
};
