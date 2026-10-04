require("dotenv").config();

const pool = require("./db");

async function testDatabase() {
  try {
    const result = await pool.query("SELECT NOW() AS current_time");

    console.log("✅ PostgreSQL connection successful");
    console.log("Database time:", result.rows[0].current_time);

    await pool.end();
  } catch (error) {
    console.error("❌ PostgreSQL connection failed");
    console.error(error.message);
    process.exit(1);
  }
}

testDatabase();