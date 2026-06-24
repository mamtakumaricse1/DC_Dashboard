/**
 * Department monthly submission tracking (DeptMonthlySubmissions table).
 */
const { sql } = require('../db');
const {
  SELECT_DEPT_SUBMISSION,
  SELECT_SUBMISSION_TIMESTAMP,
  UPSERT_DEPT_SUBMISSION
} = require('../constants/sql');
const { isSubmissionLate, getSubmissionStatus, mergeCycleConfig } = require('./reportingCycle');
const { toMonthKey } = require('./reportingMonths');

async function getDeptSubmission(db, deptId, year, month, cycle) {
  const monthKey = toMonthKey(year, month);
  const mergedCycle = mergeCycleConfig(cycle);

  const result = await db.request()
    .input('dept', sql.VarChar(10), deptId)
    .input('mk', sql.Char(7), monthKey)
    .query(SELECT_DEPT_SUBMISSION);

  const row = result.recordset[0];
  const windowStatus = getSubmissionStatus(monthKey, row?.submitted_at, new Date(), mergedCycle);

  if (!row?.submitted_at) {
    return { exists: false, monthKey, isUpdate: false, windowStatus };
  }

  return {
    exists: true,
    monthKey,
    isUpdate: true,
    submittedAt: row.submitted_at,
    updatedAt: row.updated_at,
    isLate: isSubmissionLate(monthKey, row.submitted_at, mergedCycle),
    windowStatus
  };
}

async function recordDeptSubmission(db, deptId, year, month, userId, cycle) {
  const monthKey = toMonthKey(year, month);
  const mergedCycle = mergeCycleConfig(cycle);
  const now = new Date();

  const existing = await db.request()
    .input('dept', sql.VarChar(10), deptId)
    .input('mk', sql.Char(7), monthKey)
    .query(SELECT_SUBMISSION_TIMESTAMP);

  const firstSubmittedAt = existing.recordset[0]?.submitted_at
    ? new Date(existing.recordset[0].submitted_at)
    : now;
  const late = isSubmissionLate(monthKey, firstSubmittedAt, mergedCycle);

  await db.request()
    .input('dept', sql.VarChar(10), deptId)
    .input('mk', sql.Char(7), monthKey)
    .input('uid', sql.Int, userId || null)
    .input('late', sql.Bit, late ? 1 : 0)
    .query(UPSERT_DEPT_SUBMISSION);

  return getDeptSubmission(db, deptId, year, month, mergedCycle);
}

module.exports = { getDeptSubmission, recordDeptSubmission, toMonthKey };
