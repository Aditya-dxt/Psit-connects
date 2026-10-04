require("dotenv").config();

const bcrypt = require("bcryptjs");
const pool = require("./config/db");

async function seed() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Clear existing demo data in the correct dependency order
    await client.query("DELETE FROM locations");
    await client.query("DELETE FROM trips");
    await client.query("DELETE FROM users");
    await client.query("DELETE FROM stops");
    await client.query("DELETE FROM buses");
    await client.query("DELETE FROM routes");

    // Reset IDs so the seed stays clean
    await client.query(
      "ALTER SEQUENCE routes_id_seq RESTART WITH 1"
    );
    await client.query(
      "ALTER SEQUENCE stops_id_seq RESTART WITH 1"
    );
    await client.query(
      "ALTER SEQUENCE buses_id_seq RESTART WITH 1"
    );
    await client.query(
      "ALTER SEQUENCE users_id_seq RESTART WITH 1"
    );
    await client.query(
      "ALTER SEQUENCE trips_id_seq RESTART WITH 1"
    );
    await client.query(
      "ALTER SEQUENCE locations_id_seq RESTART WITH 1"
    );

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

    // Prevent unused-variable warnings in some editors
    const stop1Id = stop1Result.rows[0].id;
    const stop2Id = stop2Result.rows[0].id;

    console.log(`Created stops: ${stop1Id}, ${stop2Id}`);

    // 3. Create bus
    const busResult = await client.query(
      `
      INSERT INTO buses
        (bus_number, registration_number, route_id, qr_code, status)
      VALUES
        ($1, $2, $3, $4, $5)
      RETURNING id
      `,
      [
        "PSIT-01",
        "UPXX-0001",
        routeId,
        "PSIT-BUS-01",
        "offline"
      ]
    );

    const busId = busResult.rows[0].id;

    // 4. Hash passwords
    const driverPassword = await bcrypt.hash("driver123", 10);
    const studentPassword = await bcrypt.hash("student123", 10);

    // 5. Create driver
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
        busId
      ]
    );

    // 6. Create student
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

    await client.query("COMMIT");

    console.log("");
    console.log("=================================");
    console.log("      PSIT BusTrack Seeded");
    console.log("=================================");
    console.log("");
    console.log("Route : PSIT Campus Route A");
    console.log("Bus   : PSIT-01");
    console.log("QR    : PSIT-BUS-01");
    console.log("");
    console.log("Driver Login:");
    console.log("Mobile   : 9999999999");
    console.log("Password : driver123");
    console.log("");
    console.log("Student Login:");
    console.log("Mobile   : 8888888888");
    console.log("Password : student123");
    console.log("");
    console.log("=================================");
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