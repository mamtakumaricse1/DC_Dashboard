/**
 * Opaque refresh tokens — stored hashed in SQL Server; rotated on each refresh.
 */
const crypto = require('crypto');
const { getPool, sql } = require('../db');
const { refreshExpiresIn } = require('../config');

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function parseDurationMs(value) {
  const raw = String(value || '7d').trim();
  const match = raw.match(/^(\d+)([smhd])$/i);
  if (!match) return 7 * MS_PER_DAY;
  const n = Number(match[1]);
  const unit = match[2].toLowerCase();
  if (unit === 's') return n * 1000;
  if (unit === 'm') return n * 60 * 1000;
  if (unit === 'h') return n * 60 * 60 * 1000;
  return n * MS_PER_DAY;
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function createOpaqueToken() {
  return crypto.randomBytes(32).toString('hex');
}

async function storeRefreshToken(userId, token) {
  const db = await getPool();
  const expiresAt = new Date(Date.now() + parseDurationMs(refreshExpiresIn));
  await db.request()
    .input('userId', sql.Int, userId)
    .input('hash', sql.VarChar(64), hashToken(token))
    .input('expiresAt', sql.DateTime2, expiresAt)
    .query(`
      INSERT INTO RefreshTokens (user_id, token_hash, expires_at)
      VALUES (@userId, @hash, @expiresAt)
    `);
  return expiresAt;
}

async function rotateRefreshToken(oldToken) {
  const db = await getPool();
  const hash = hashToken(oldToken);
  const found = await db.request()
    .input('hash', sql.VarChar(64), hash)
    .query(`
      SELECT rt.token_id, rt.user_id, rt.expires_at, rt.revoked_at,
             u.username, u.role, u.dept_id
      FROM RefreshTokens rt
      INNER JOIN Users u ON u.user_id = rt.user_id
      WHERE rt.token_hash = @hash
    `);

  const row = found.recordset[0];
  if (!row || row.revoked_at) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) return null;

  await db.request()
    .input('id', sql.Int, row.token_id)
    .query(`UPDATE RefreshTokens SET revoked_at = SYSUTCDATETIME() WHERE token_id = @id`);

  const newToken = createOpaqueToken();
  await storeRefreshToken(row.user_id, newToken);

  return {
    user: {
      user_id: row.user_id,
      username: String(row.username || '').trim(),
      role: row.role,
      dept_id: row.dept_id
    },
    refreshToken: newToken
  };
}

async function revokeRefreshToken(token) {
  if (!token) return;
  const db = await getPool();
  await db.request()
    .input('hash', sql.VarChar(64), hashToken(token))
    .query(`
      UPDATE RefreshTokens
      SET revoked_at = SYSUTCDATETIME()
      WHERE token_hash = @hash AND revoked_at IS NULL
    `);
}

async function issueRefreshToken(userId) {
  const token = createOpaqueToken();
  await storeRefreshToken(userId, token);
  return token;
}

module.exports = {
  issueRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken
};
