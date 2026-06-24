/**
 * JWT authentication middleware.
 *
 * Flow:
 *   1. Client sends  Authorization: Bearer <token>
 *   2. authenticate() verifies token → sets req.user
 *   3. requireAdmin() / requireDeptAccess() check role for specific routes
 */
const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config');

/** Required on all /api/dashboard and /api/dept routes. */
function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    req.user = jwt.verify(token, jwtSecret);
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/** Only District Commissioner / admin role. */
function requireAdmin(req, res, next) {
  if (String(req.user?.role || '').toUpperCase() !== 'ADMIN') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  return next();
}

/** Dept users may only access their own department (route param :id). */
function requireDeptAccess(req, res, next) {
  const role = String(req.user?.role || '').toUpperCase();
  if (role === 'ADMIN') return next();

  const routeDeptId = req.params.id || req.body.dept_id;
  if (role === 'DEPT' && req.user.dept_id && req.user.dept_id === routeDeptId) {
    return next();
  }

  return res.status(403).json({ error: 'Access denied for this department' });
}

module.exports = { authenticate, requireAdmin, requireDeptAccess };
