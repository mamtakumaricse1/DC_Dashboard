/**
 * Shared SQL fragments — re-exports from constants/sql for backward compatibility.
 */
const { sql } = require('../db');
const {
  DASHBOARD_ROWS_SELECT,
  DASHBOARD_ROWS_DEPT_FILTER
} = require('./sql');

const DASHBOARD_ROWS_SQL = DASHBOARD_ROWS_SELECT;

async function loadDashboardRows(db, deptId = null) {
  const request = db.request();
  if (deptId) {
    request.input('deptId', sql.VarChar, deptId);
    return request.query(DASHBOARD_ROWS_SELECT + DASHBOARD_ROWS_DEPT_FILTER);
  }
  return request.query(DASHBOARD_ROWS_SQL);
}

module.exports = {
  DASHBOARD_ROWS_SQL,
  DASHBOARD_ROWS_SELECT,
  DASHBOARD_ROWS_DEPT_FILTER,
  loadDashboardRows
};
