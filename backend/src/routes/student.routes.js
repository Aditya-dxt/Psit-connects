const express = require("express");

const pool = require("../config/db");
const auth = require("../middleware/auth");
const { calculateEtaMinutes } = require("../services/eta.service");

const router = express.Router();


// ==========================================
// GET ALL ROUTES
// ==========================================
router.get("/routes", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        r.id,
        r.route_name,
        r.route_number,
        r.origin,
        r.destination,
        COUNT(s.id)::int AS stop_count
      FROM routes r
      LEFT JOIN stops s
        ON s.route_id = r.id
      GROUP BY
        r.id,
        r.route_name,
        r.route_number,
        r.origin,
        r.destination
      ORDER BY r.id
    `);

    res.json({
      success: true,
      routes: result.rows
    });

  } catch (error) {
    console.error("Get routes error:", error);

    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
});


// ==========================================
// GET ROUTE DETAILS + STOPS
// ==========================================
router.get("/routes/:routeId", async (req, res) => {
  try {
    const routeResult = await pool.query(
      `
      SELECT
        id,
        route_name,
        route_number,
        origin,
        destination
      FROM routes
      WHERE id = $1
      `,
      [req.params.routeId]
    );

    if (routeResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Route not found"
      });
    }

    const stopsResult = await pool.query(
      `
      SELECT
        id,
        name,
        latitude,
        longitude,
        sequence
      FROM stops
      WHERE route_id = $1
      ORDER BY sequence ASC
      `,
      [req.params.routeId]
    );

    res.json({
      success: true,
      route: {
        ...routeResult.rows[0],
        stops: stopsResult.rows
      }
    });

  } catch (error) {
    console.error("Get route details error:", error);

    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
});


// ==========================================
// GET ALL BUSES
// ==========================================
router.get("/buses", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        b.id,
        b.bus_number,
        b.registration_number,
        b.status,
        b.current_lat,
        b.current_lng,
        b.current_speed,
        b.current_accuracy,
        b.location_updated_at,

        r.id AS route_id,
        r.route_name,
        r.route_number

      FROM buses b

      LEFT JOIN routes r
        ON r.id = b.route_id

      ORDER BY b.id
    `);

    res.json({
      success: true,
      buses: result.rows
    });

  } catch (error) {
    console.error("Get buses error:", error);

    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
});


// ==========================================
// GET SINGLE BUS
// ==========================================
router.get("/buses/:busId", async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        b.id,
        b.bus_number,
        b.registration_number,
        b.status,
        b.current_lat,
        b.current_lng,
        b.current_speed,
        b.current_accuracy,
        b.location_updated_at,

        r.id AS route_id,
        r.route_name,
        r.route_number,
        r.origin,
        r.destination

      FROM buses b

      LEFT JOIN routes r
        ON r.id = b.route_id

      WHERE b.id = $1
      `,
      [req.params.busId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Bus not found"
      });
    }

    res.json({
      success: true,
      bus: result.rows[0]
    });

  } catch (error) {
    console.error("Get bus error:", error);

    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
});


// ==========================================
// GET CURRENT BUS LOCATION
// ==========================================
router.get("/buses/:busId/location", async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        id,
        bus_number,
        status,
        current_lat,
        current_lng,
        current_speed,
        current_accuracy,
        location_updated_at
      FROM buses
      WHERE id = $1
      `,
      [req.params.busId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Bus not found"
      });
    }

    const bus = result.rows[0];

    res.json({
      success: true,
      location: {
        busId: bus.id,
        busNumber: bus.bus_number,
        status: bus.status,
        lat: bus.current_lat,
        lng: bus.current_lng,
        speed: bus.current_speed,
        accuracy: bus.current_accuracy,
        updatedAt: bus.location_updated_at
      }
    });

  } catch (error) {
    console.error("Get bus location error:", error);

    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
});


// ==========================================
// GET BUS ETA TO A STOP
// ==========================================
router.get("/buses/:busId/eta/:stopId", async (req, res) => {
  try {
    const { busId, stopId } = req.params;

    const result = await pool.query(
      `
      SELECT
        b.id AS bus_id,
        b.bus_number,
        b.status,
        b.current_lat,
        b.current_lng,
        b.current_speed,
        b.current_accuracy,
        b.location_updated_at,

        s.id AS stop_id,
        s.name AS stop_name,
        s.latitude AS stop_latitude,
        s.longitude AS stop_longitude,
        s.sequence AS stop_sequence

      FROM buses b

      JOIN stops s
        ON s.id = $2

      WHERE b.id = $1
      `,
      [busId, stopId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Bus or stop not found"
      });
    }

    const row = result.rows[0];

    // Bus does not have a valid GPS position yet
    if (
      row.current_lat === null ||
      row.current_lng === null
    ) {
      return res.status(400).json({
        success: false,
        message: "Bus location is not available yet"
      });
    }

    const eta = calculateEtaMinutes(
      {
        lat: Number(row.current_lat),
        lng: Number(row.current_lng),
        speed: Number(row.current_speed) || 0
      },
      {
        latitude: Number(row.stop_latitude),
        longitude: Number(row.stop_longitude)
      }
    );

    res.json({
      success: true,
      eta: {
        busId: row.bus_id,
        busNumber: row.bus_number,
        busStatus: row.status,

        stopId: row.stop_id,
        stopName: row.stop_name,
        stopSequence: row.stop_sequence,

        distanceKm: eta.distanceKm,
        etaMinutes: eta.etaMinutes,
        speedKmh: eta.speedKmh,

        updatedAt: row.location_updated_at
      }
    });

  } catch (error) {
    console.error("Get ETA error:", error);

    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
});


// ==========================================
// GET TRIP LOCATION HISTORY
// ==========================================
router.get("/trips/:tripId/locations", async (req, res) => {
  try {
    const tripResult = await pool.query(
      `
      SELECT
        t.id,
        t.status,
        t.started_at,
        t.ended_at,
        b.bus_number
      FROM trips t
      JOIN buses b
        ON b.id = t.bus_id
      WHERE t.id = $1
      `,
      [req.params.tripId]
    );

    if (tripResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Trip not found"
      });
    }

    const locationsResult = await pool.query(
      `
      SELECT
        id,
        latitude,
        longitude,
        speed,
        accuracy,
        recorded_at
      FROM locations
      WHERE trip_id = $1
      ORDER BY recorded_at ASC
      `,
      [req.params.tripId]
    );

    res.json({
      success: true,
      trip: tripResult.rows[0],
      locations: locationsResult.rows
    });

  } catch (error) {
    console.error("Get trip locations error:", error);

    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
});


// ==========================================
// STUDENT PROFILE
// ==========================================
router.get("/student/profile", auth(["student"]), async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        id,
        name,
        mobile,
        role,
        active,
        created_at
      FROM users
      WHERE id = $1
        AND role = 'student'
      `,
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Student not found"
      });
    }

    res.json({
      success: true,
      user: result.rows[0]
    });

  } catch (error) {
    console.error("Student profile error:", error);

    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
});


module.exports = router;