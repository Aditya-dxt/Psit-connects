const mongoose = require("mongoose");

const locationSchema = new mongoose.Schema(
  {
    tripId: { type: mongoose.Schema.Types.ObjectId, ref: "Trip", required: true, index: true },
    busId: { type: mongoose.Schema.Types.ObjectId, ref: "Bus", required: true, index: true },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    speed: { type: Number, default: 0 },
    accuracy: Number,
    recordedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Location", locationSchema);
