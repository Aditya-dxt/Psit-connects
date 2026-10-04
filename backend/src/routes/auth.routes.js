const express = require("express");
const bcrypt = require("bcryptjs");

const pool = require("../config/db");
const { createToken } = require("../utils/jwt");

const router = express.Router();

router.post("/login", async (req, res) => {
  try {
    const { mobile, password } = req.body;

    if (!mobile || !password) {
      return res.status(400).json({
        success: false,
        message: "Mobile and password are required"
      });
    }

    const result = await pool.query(
      `
      SELECT
        id,
        name,
        mobile,
        password_hash,
        role,
        bus_id,
        active
      FROM users
      WHERE mobile = $1
      LIMIT 1
      `,
      [mobile]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials"
      });
    }

    const user = result.rows[0];

    if (!user.active) {
      return res.status(403).json({
        success: false,
        message: "Account is inactive"
      });
    }

    const validPassword = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!validPassword) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials"
      });
    }

    const token = createToken({
      _id: user.id,
      mobile: user.mobile,
      role: user.role
    });

    return res.json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        mobile: user.mobile,
        role: user.role,
        busId: user.bus_id
      }
    });

  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
});

module.exports = router;