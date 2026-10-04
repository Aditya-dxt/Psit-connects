const jwt = require("jsonwebtoken");

function registerSocket(io) {
  io.use((socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace("Bearer ", "");

      if (!token) return next(new Error("Authentication required"));

      socket.user = jwt.verify(token, process.env.JWT_SECRET);
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.user.userId}`);

    socket.on("join:bus", (busId) => {
      socket.join(`bus:${busId}`);
    });

    socket.on("join:student", () => {
      socket.join("students");
    });

    socket.on("disconnect", () => {
      console.log(`Socket disconnected: ${socket.user.userId}`);
    });
  });
}

module.exports = { registerSocket };
