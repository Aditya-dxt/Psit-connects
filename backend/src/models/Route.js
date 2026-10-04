const mongoose = require("mongoose");

const routeSchema = new mongoose.Schema(
  {
    routeName: { type: String, required: true },
    routeNumber: { type: String, required: true },
    origin: String,
    destination: String,
    stops: [{ type: mongoose.Schema.Types.ObjectId, ref: "Stop" }]
  },
  { timestamps: true }
);

module.exports = mongoose.model("Route", routeSchema);
