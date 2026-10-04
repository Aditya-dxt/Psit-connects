const { io } = require("socket.io-client");

require("dotenv").config();

const TOKEN = process.argv[2];

if (!TOKEN) {
  console.error("Usage: node src/test-socket.js <JWT_TOKEN>");
  process.exit(1);
}

const socket = io("http://localhost:5000", {
  auth: {
    token: TOKEN
  }
});

socket.on("connect", () => {
  console.log("✅ Socket connected:", socket.id);

  socket.emit("join:student");

  console.log("✅ Joined students room");
});

socket.on("bus:location", (data) => {
  console.log("\n🚌 LIVE BUS LOCATION");
  console.log(data);
});

socket.on("connect_error", (error) => {
  console.error("❌ Socket connection error:", error.message);
});

socket.on("disconnect", (reason) => {
  console.log("Socket disconnected:", reason);
});