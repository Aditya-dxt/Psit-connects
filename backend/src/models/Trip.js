const mongoose = require("mongoose");

const tripSchema = new mongoose.Schema(
  {
    busId: { type: mongoose.Schema.Types.ObjectId, ref: "Bus", required: true },
    driverId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    routeId: { type: mongoose.Schema.Types.ObjectId, ref: "Route", default: null },
    status: {
      type: String,
      enum: ["active", "completed"],
      default: "active"
    },
    startedAt: { type: Date, default: Date.now },
    endedAt: Date
  },
  { timestamps: true }
);

module.exports = mongoose.model("Trip", tripSchema);
