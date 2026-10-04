const express = require("express");

const auth = require("../middleware/auth");
const pool = require("../config/db");

const router = express.Router();

// Driver profile
router.get("/profile", auth(["driver"]), async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        u.id,
        u.name,
        u.mobile,
        u.role,
        u.active,
        b.id AS bus_id,
        b.bus_number,
        b.registration_number,
        b.route_id
      FROM users u
      LEFT JOIN buses b ON b.id = u.bus_id
      WHERE u.id = $1
      `,
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Driver not found"
      });
    }

    const row = result.rows[0];

    res.json({
      success: true,
      user: {
        id: row.id,
        name: row.name,
        mobile: row.mobile,
        role: row.role,
        active: row.active,
        bus: row.bus_id
          ? {
              id: row.bus_id,
              busNumber: row.bus_number,
              registrationNumber: row.registration_number,
              routeId: row.route_id
            }
          : null
      }
    });
  } catch (error) {
    console.error("Driver profile error:", error);

    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
});

// Verify bus QR
router.post("/verify-qr", auth(["driver"]), async (req, res) => {
  try {
    const { qrCode } = req.body;

    if (!qrCode) {
      return res.status(400).json({
        success: false,
        message: "qrCode is required"
      });
    }

    // Get logged-in driver
    const driverResult = await pool.query(
      `
      SELECT id, name, bus_id
      FROM users
      WHERE id = $1
        AND role = 'driver'
        AND active = TRUE
      `,
      [req.user.userId]
    );

    if (driverResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Driver not found"
      });
    }

    const driver = driverResult.rows[0];

    // Find bus using QR
    const busResult = await pool.query(
      `
      SELECT
        id,
        bus_number,
        registration_number,
        route_id,
        qr_code,
        status
      FROM buses
      WHERE qr_code = $1
      `,
      [qrCode]
    );

    if (busResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Invalid bus QR"
      });
    }

    const bus = busResult.rows[0];

    // Driver must be assigned to this bus
    if (
      driver.bus_id !== null &&
      Number(driver.bus_id) !== Number(bus.id)
    ) {
      return res.status(403).json({
        success: false,
        message: "QR does not belong to your assigned bus"
      });
    }

    // If driver doesn't have a bus assigned,
    // assign this verified bus.
    if (driver.bus_id === null) {
      await pool.query(
        `
        UPDATE users
        SET bus_id = $1
        WHERE id = $2
        `,
        [bus.id, driver.id]
      );
    }

    res.json({
      success: true,
      message: "Bus QR verified",
      bus: {
        id: bus.id,
        busNumber: bus.bus_number,
        registrationNumber: bus.registration_number,
        routeId: bus.route_id,
        qrCode: bus.qr_code,
        status: bus.status
      }
    });
  } catch (error) {
    console.error("QR verification error:", error);

    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
});

module.exports = router;