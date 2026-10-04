require("dotenv").config();

const http = require("http");
const express = require("express");
const cors = require("cors");
const { Server } = require("socket.io");

const pool = require("./config/db");

const authRoutes = require("./routes/auth.routes");
const driverRoutes = require("./routes/driver.routes");
const tripRoutes = require("./routes/trip.routes");
const studentRoutes = require("./routes/student.routes");
const { registerSocket } = require("./socket");

const app = express();
const server = http.createServer(app);

const allowedOrigin = process.env.CLIENT_ORIGIN || "*";

const io = new Server(server, {
  cors: {
    origin: allowedOrigin,
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});

app.set("io", io);

app.use(
  cors({
    origin: allowedOrigin === "*" ? true : allowedOrigin
  })
);

app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    name: "PSIT BusTrack Backend",
    status: "running"
  });
});

app.get("/api/health", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW() AS current_time");

    res.json({
      success: true,
      message: "Backend is healthy",
      database: "connected",
      serverTime: result.rows[0].current_time
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Database connection failed"
    });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/driver", driverRoutes);
app.use("/api/trips", tripRoutes);
app.use("/api", studentRoutes);

registerSocket(io);

const PORT = process.env.PORT || 5000;

async function start() {
  try {
    // Verify PostgreSQL before starting the HTTP server
    await pool.query("SELECT 1");

    console.log("PostgreSQL connected");

    server.listen(PORT, () => {
      console.log(
        `PSIT BusTrack backend running on http://localhost:${PORT}`
      );
    });
  } catch (error) {
    console.error("Startup failed:", error.message);
    process.exit(1);
  }
}

start();