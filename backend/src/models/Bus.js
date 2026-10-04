const mongoose = require("mongoose");

const busSchema = new mongoose.Schema(
  {
    busNumber: { type: String, required: true, unique: true, index: true },
    registrationNumber: String,
    routeId: { type: mongoose.Schema.Types.ObjectId, ref: "Route", default: null },
    qrCode: { type: String, required: true, unique: true },
    status: {
      type: String,
      enum: ["running", "stopped", "offline"],
      default: "offline"
    },
    currentLocation: {
      lat: Number,
      lng: Number,
      speed: Number,
      accuracy: Number,
      updatedAt: Date
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Bus", busSchema);
