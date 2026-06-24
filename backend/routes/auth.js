/**
 * Authentication — bcrypt passwords, JWT access tokens, opaque refresh tokens.
 */
const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();

const { getPool, sql } = require('../db');
const { jwtSecret, jwtExpiresIn } = require('../config');
const { verifyPassword } = require('../utils/password');
const { authenticate } = require('../middleware/auth');
const { loginLimiter } = require('../middleware/rateLimit');
const { loadDistrictConfig, toPublicDistrictConfig } = require('../utils/districtConfig');
const {
  issueRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken
} = require('../utils/refreshTokens');

function signAccessToken(user) {
  return jwt.sign(
    {
      user_id: user.user_id,
      username: user.username,
      role: user.role,
      dept_id: user.dept_id
    },
    jwtSecret,
    { expiresIn: jwtExpiresIn }
  );
}

function publicUser(user) {
  return {
    user_id: user.user_id,
    username: user.username.trim(),
    role: user.role,
    dept_id: user.dept_id
  };
}

// GET /api/auth/config — public district branding for login screen
router.get('/config', async (_req, res) => {
  try {
    const db = await getPool();
    const districtRow = await loadDistrictConfig(db);
    res.json({ district: toPublicDistrictConfig(districtRow) });
  } catch (err) {
    console.error('Auth config error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
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
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.recordset[0];
    const valid = await verifyPassword(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const profile = publicUser(user);
    const refreshToken = await issueRefreshToken(user.user_id);
    res.json({
      token: signAccessToken(profile),
      refreshToken,
      user: profile
    });
  } catch (err) {
    console.error('Login error:', err);
    const msg = String(err.message || '');
    if (msg.includes('connect') || msg.includes('ECONNREFUSED') || msg.includes('ETIMEOUT')) {
      return res.status(503).json({
        error: 'Database unavailable. Start SQL Server and run: cd backend && npm run dev'
      });
    }
    if (msg.includes("Invalid object name 'RefreshTokens'")) {
      return res.status(503).json({
        error: 'Database migration required. Run: cd backend && npm run db:migrate'
      });
    }
    res.status(500).json({ error: msg || 'Server error' });
  }
});

// POST /api/auth/refresh — exchange refresh token for new access + refresh pair
router.post('/refresh', loginLimiter, async (req, res) => {
  try {
    const { refreshToken } = req.body || {};
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token required' });
    }

    const rotated = await rotateRefreshToken(refreshToken);
    if (!rotated) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    res.json({
      token: signAccessToken(rotated.user),
      refreshToken: rotated.refreshToken,
      user: rotated.user
    });
  } catch (err) {
    console.error('Refresh error:', err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// POST /api/auth/logout — revoke refresh token
router.post('/logout', async (req, res) => {
  try {
    const { refreshToken } = req.body || {};
    await revokeRefreshToken(refreshToken);
    res.json({ ok: true });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// GET /api/auth/me — validate stored JWT and return user profile
router.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
