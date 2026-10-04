const express = require("express");

const auth = require("../middleware/auth");
const pool = require("../config/db");

const router = express.Router();


// ==========================================
// START TRIP
// ==========================================
router.post("/start", auth(["driver"]), async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Get driver's assigned bus
    const driverResult = await client.query(
      `
      SELECT id, bus_id
      FROM users
      WHERE id = $1
        AND role = 'driver'
        AND active = TRUE
      `,
      [req.user.userId]
    );

    if (driverResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        success: false,
        message: "Driver not found"
      });
    }

    const driver = driverResult.rows[0];

    if (!driver.bus_id) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        success: false,
        message: "Driver has no assigned bus"
      });
    }

    // Check if driver already has an active trip
    const existingTrip = await client.query(
      `
      SELECT id
      FROM trips
      WHERE driver_id = $1
        AND status = 'active'
      LIMIT 1
      `,
      [driver.id]
    );

    if (existingTrip.rows.length > 0) {
      await client.query("ROLLBACK");

      return res.status(409).json({
        success: false,
        message: "Driver already has an active trip",
        tripId: existingTrip.rows[0].id
      });
    }

    // Get bus
    const busResult = await client.query(
      `
      SELECT id, bus_number, route_id
      FROM buses
      WHERE id = $1
      `,
      [driver.bus_id]
    );

    if (busResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        success: false,
        message: "Assigned bus not found"
      });
    }

    const bus = busResult.rows[0];

    // Create trip
    const tripResult = await client.query(
      `
      INSERT INTO trips
        (bus_id, driver_id, route_id, status)
      VALUES
        ($1, $2, $3, 'active')
      RETURNING *
      `,
      [
        bus.id,
        driver.id,
        bus.route_id
      ]
    );

    // Mark bus as running
    await client.query(
      `
      UPDATE buses
      SET
        status = 'running',
        current_speed = 0
      WHERE id = $1
      `,
      [bus.id]
    );

    await client.query("COMMIT");

    res.status(201).json({
      success: true,
      message: "Trip started",
      trip: tripResult.rows[0]
    });

  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Start trip error:", error);

    res.status(500).json({
      success: false,
      message: "Internal server error"
    });

  } finally {
    client.release();
  }
});


// ==========================================
// GET ACTIVE TRIP
// ==========================================
router.get("/active", auth(["driver"]), async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        t.id,
        t.status,
        t.started_at,

        b.id AS bus_id,
        b.bus_number,
        b.registration_number,

        r.id AS route_id,
        r.route_name,
        r.route_number

      FROM trips t

      JOIN buses b
        ON b.id = t.bus_id

      LEFT JOIN routes r
        ON r.id = t.route_id

      WHERE t.driver_id = $1
        AND t.status = 'active'

      ORDER BY t.started_at DESC

      LIMIT 1
      `,
      [req.user.userId]
    );

    res.json({
      success: true,
      trip: result.rows.length
        ? result.rows[0]
        : null
    });

  } catch (error) {
    console.error("Active trip error:", error);

    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
});


// ==========================================
// UPDATE GPS LOCATION
// ==========================================
router.post(
  "/:tripId/location",
  auth(["driver"]),
  async (req, res) => {
    try {
      const {
        lat,
        lng,
        speed = 0,
        accuracy = null
      } = req.body;

      // Validate latitude and longitude
      if (
        !Number.isFinite(Number(lat)) ||
        !Number.isFinite(Number(lng))
      ) {
        return res.status(400).json({
          success: false,
          message: "Valid lat and lng are required"
        });
      }

      // Verify trip belongs to driver and is active
      const tripResult = await pool.query(
        `
        SELECT
          t.id,
          t.bus_id,
          b.bus_number

        FROM trips t

        JOIN buses b
          ON b.id = t.bus_id

        WHERE t.id = $1
          AND t.driver_id = $2
          AND t.status = 'active'
        `,
        [
          req.params.tripId,
          req.user.userId
        ]
      );

      if (tripResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Active trip not found"
        });
      }

      const trip = tripResult.rows[0];

      // Insert GPS location into history
      const locationResult = await pool.query(
        `
        INSERT INTO locations
          (
            trip_id,
            bus_id,
            latitude,
            longitude,
            speed,
            accuracy,
            recorded_at
          )

        VALUES
          ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)

        RETURNING *
        `,
        [
          trip.id,
          trip.bus_id,
          Number(lat),
          Number(lng),
          Number(speed) || 0,
          accuracy == null
            ? null
            : Number(accuracy)
        ]
      );

      const location = locationResult.rows[0];

      // Update current bus location
      const busResult = await pool.query(
        `
        UPDATE buses

        SET
          current_lat = $1,
          current_lng = $2,
          current_speed = $3,
          current_accuracy = $4,
          location_updated_at = CURRENT_TIMESTAMP,
          status = 'running'

        WHERE id = $5

        RETURNING
          id,
          bus_number
        `,
        [
          location.latitude,
          location.longitude,
          location.speed,
          location.accuracy,
          trip.bus_id
        ]
      );

      if (busResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Bus not found"
        });
      }

      const bus = busResult.rows[0];

      // Payload sent to frontend
      const payload = {
        busId: bus.id,
        busNumber: bus.bus_number,
        lat: location.latitude,
        lng: location.longitude,
        speed: location.speed,
        accuracy: location.accuracy,
        updatedAt: location.recorded_at
      };

      // Real-time Socket.IO update
      const io = req.app.get("io");

      if (io) {
        io
          .to("students")
          .emit("bus:location", payload);

        io
          .to(`bus:${bus.id}`)
          .emit("bus:location", payload);
      }

      res.json({
        success: true,
        location: payload
      });

    } catch (error) {
      console.error("GPS update error:", error);

      res.status(500).json({
        success: false,
        message: "Internal server error"
      });
    }
  }
);


// ==========================================
// END TRIP
// ==========================================
router.post(
  "/:tripId/end",
  auth(["driver"]),
  async (req, res) => {

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // Verify active trip belongs to driver
      const tripResult = await client.query(
        `
        SELECT
          id,
          bus_id

        FROM trips

        WHERE id = $1
          AND driver_id = $2
          AND status = 'active'
        `,
        [
          req.params.tripId,
          req.user.userId
        ]
      );

      if (tripResult.rows.length === 0) {
        await client.query("ROLLBACK");

        return res.status(404).json({
          success: false,
          message: "Active trip not found"
        });
      }

      const trip = tripResult.rows[0];

      // Complete trip
      const updatedTrip = await client.query(
        `
        UPDATE trips

        SET
          status = 'completed',
          ended_at = CURRENT_TIMESTAMP

        WHERE id = $1

        RETURNING *
        `,
        [trip.id]
      );

      // Stop bus
      // Keep last known GPS coordinates,
      // but reset speed because the trip has ended.
      const busResult = await client.query(
        `
        UPDATE buses

        SET
          status = 'stopped',
          current_speed = 0

        WHERE id = $1

        RETURNING
          id,
          bus_number,
          status,
          current_lat,
          current_lng,
          current_speed
        `,
        [trip.bus_id]
      );

      await client.query("COMMIT");

      res.json({
        success: true,
        message: "Trip ended",
        trip: updatedTrip.rows[0],
        bus: busResult.rows[0]
      });

    } catch (error) {

      await client.query("ROLLBACK");

      console.error("End trip error:", error);

      res.status(500).json({
        success: false,
        message: "Internal server error"
      });

    } finally {
      client.release();
    }
  }
);


module.exports = router;