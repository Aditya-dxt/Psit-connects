require("dotenv").config();

const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const pool = require("./config/db");

async function seed() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 0. Ensure schema tables exist
    const schemaPath = path.join(__dirname, "config", "schema.sql");
    const schemaSql = fs.readFileSync(schemaPath, "utf8");
    await client.query(schemaSql);

    // Clear existing demo data in the correct dependency order
    await client.query("DELETE FROM locations");
    await client.query("DELETE FROM trips");
    await client.query("DELETE FROM users");
    await client.query("DELETE FROM stops");
    await client.query("DELETE FROM buses");
    await client.query("DELETE FROM routes");

    // Reset IDs so the seed stays clean
    await client.query("ALTER SEQUENCE routes_id_seq RESTART WITH 1");
    await client.query("ALTER SEQUENCE stops_id_seq RESTART WITH 1");
    await client.query("ALTER SEQUENCE buses_id_seq RESTART WITH 1");
    await client.query("ALTER SEQUENCE users_id_seq RESTART WITH 1");
    await client.query("ALTER SEQUENCE trips_id_seq RESTART WITH 1");
    await client.query("ALTER SEQUENCE locations_id_seq RESTART WITH 1");

    // 1. Create route
    const routeResult = await client.query(
      `
      INSERT INTO routes
        (route_name, route_number, origin, destination)
      VALUES
        ($1, $2, $3, $4)
      RETURNING id
      `,
      [
        "PSIT Campus Route A",
        "A",
        "PSIT",
        "Kanpur City"
      ]
    );

    const routeId = routeResult.rows[0].id;

    // 2. Create stops
    const stop1Result = await client.query(
      `
      INSERT INTO stops
        (name, latitude, longitude, sequence, route_id)
      VALUES
        ($1, $2, $3, $4, $5)
      RETURNING id
      `,
      [
        "PSIT Main Gate",
        26.4499,
        80.3319,
        1,
        routeId
      ]
    );

    const stop2Result = await client.query(
      `
      INSERT INTO stops
        (name, latitude, longitude, sequence, route_id)
      VALUES
        ($1, $2, $3, $4, $5)
      RETURNING id
      `,
      [
        "Kalyanpur",
        26.5123,
        80.2329,
        2,
        routeId
      ]
    );

    console.log(`Created stops: ${stop1Result.rows[0].id}, ${stop2Result.rows[0].id}`);

    // 3. Create buses (PSIT-01 and PSIT-07)
    const bus1Result = await client.query(
      `
      INSERT INTO buses
        (bus_number, registration_number, route_id, qr_code, status, current_lat, current_lng)
      VALUES
        ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
      `,
      [
        "PSIT-01",
        "UP78-BT-0001",
        routeId,
        "PSIT-BUS-01",
        "offline",
        26.4499,
        80.3319
      ]
    );

    const bus2Result = await client.query(
      `
      INSERT INTO buses
        (bus_number, registration_number, route_id, qr_code, status, current_lat, current_lng)
      VALUES
        ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
      `,
      [
        "PSIT-07",
        "UP78-BT-0007",
        routeId,
        "PSIT-BUS-07",
        "offline",
        26.4600,
        80.3200
      ]
    );

    const bus1Id = bus1Result.rows[0].id;
    const bus2Id = bus2Result.rows[0].id;

    // 4. Hash passwords
    const driverPassword = await bcrypt.hash("driver123", 10);
    const studentPassword = await bcrypt.hash("student123", 10);

    // 5. Create driver (assigned to bus PSIT-01)
    await client.query(
      `
      INSERT INTO users
        (name, mobile, password_hash, role, bus_id)
      VALUES
        ($1, $2, $3, $4, $5)
      `,
      [
        "Demo Driver",
        "9999999999",
        driverPassword,
        "driver",
        bus1Id
      ]
    );

    // 6. Create students
    await client.query(
      `
      INSERT INTO users
        (name, mobile, password_hash, role)
      VALUES
        ($1, $2, $3, $4)
      `,
      [
        "Demo Student",
        "8888888888",
        studentPassword,
        "student"
      ]
    );

    // Seed additional student matching frontend prefilled default (9876543210)
    await client.query(
      `
      INSERT INTO users
        (name, mobile, password_hash, role)
      VALUES
        ($1, $2, $3, $4)
      `,
      [
        "Aarav Sharma",
        "9876543210",
        studentPassword,
        "student"
      ]
    );

    await client.query("COMMIT");

    console.log("");
    console.log("==================================================");
    console.log("       PSIT BusTrack Database Seeded Successfully");
    console.log("==================================================");
    console.log("");
    console.log("Route     : PSIT Campus Route A (ID: " + routeId + ")");
    console.log("Buses     : PSIT-01 (QR: PSIT-BUS-01), PSIT-07 (QR: PSIT-BUS-07)");
    console.log("");
    console.log("Driver Credentials:");
    console.log("  Mobile   : 9999999999");
    console.log("  Password : driver123");
    console.log("  Assigned : PSIT-01 (Bus ID: " + bus1Id + ")");
    console.log("");
    console.log("Student Credentials:");
    console.log("  Mobile   : 8888888888");
    console.log("  Password : student123");
    console.log("");
    console.log("  Mobile   : 9876543210 (Default in UI)");
    console.log("  Password : student123");
    console.log("==================================================");
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("❌ Seed failed:");
    console.error(error.message);

    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

seed();