const mongoose = require("mongoose");

const stopSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, index: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    sequence: { type: Number, default: 0 },
    routeId: { type: mongoose.Schema.Types.ObjectId, ref: "Route", default: null }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Stop", stopSchema);
