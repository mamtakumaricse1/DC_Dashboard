const express = require('express');
const router = express.Router();

const { getPool, sql } = require('../db');

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).send("Username and password required");
    }

    const db = await getPool();

    const result = await db.request()
      .input('u', sql.VarChar, username.trim())
      .query(`
        SELECT user_id, username, password, role, dept_id
        FROM Users
        WHERE LTRIM(RTRIM(username)) = @u
      `);

    if (!result.recordset.length) {
      return res.status(401).send("Invalid credentials");
    }

    const user = result.recordset[0];

    if ((user.password || "").trim() !== password.trim()) {
      return res.status(401).send("Invalid credentials");
    }

    res.json({
      user_id: user.user_id,
      username: user.username.trim(),
      role: user.role,
      dept_id: user.dept_id
    });

  } catch (err) {
    console.error("Login error:", err.message);
    res.status(500).send("Server error");
  }
});

module.exports = router;