/**
 * Department monthly data submission — validation, normalize, persist.
 */
const { sql } = require('../db');
const { UPSERT_PERFORMANCE, SELECT_OWNED_KPIS } = require('../constants/sql');
const { bindPerformanceUpsert } = require('../utils/performanceUpsert');
const { ensureReportingMonth } = require('../utils/reportingMonths');
const { getDeptSubmission, recordDeptSubmission } = require('../utils/deptSubmissions');
const {
  mergeCycleConfig,
  isAllowedSubmissionMonth,
  isSubmissionWindowOpen,
  getSubmissionStatus,
  getActiveReportingMonth
} = require('../utils/reportingCycle');
const { resolveSubmissionEntry, resolveEntrySpec } = require('../utils/kpiEntrySpec');

function httpError(message, status = 400) {
  const err = new Error(message);
  err.status = status;
  return err;
}

async function loadOwnedKpis(pool, deptId) {
  const result = await pool.request()
    .input('deptId', sql.VarChar, deptId)
    .query(SELECT_OWNED_KPIS);
  return new Map(result.recordset.map((r) => [r.kpi_id, r]));
}

function normalizeEntries(entries, ownedKpis) {
  const normalized = [];
  for (const entry of entries) {
    const kpi = ownedKpis.get(entry.kpi_id);
    const resolved = resolveSubmissionEntry(kpi, entry);
    if (!resolved) {
      const spec = resolveEntrySpec(kpi);
      const hint =
        spec.entryMode === 'RATIO'
          ? `enter both ${spec.field1Label} and ${spec.field2Label}`
          : `enter a valid ${spec.inputLabel}`;
      throw httpError(`Invalid entry for "${kpi.name}": ${hint}.`);
    }
    normalized.push({
      kpi_id: entry.kpi_id,
      actual_value: resolved.actual_value,
      numerator_value: resolved.numerator_value,
      denominator_value: resolved.denominator_value
    });
  }
  return normalized;
}

async function upsertPerformanceRow(transaction, entry, month, year) {
  await bindPerformanceUpsert(new sql.Request(transaction), sql, {
    kpiId: entry.kpi_id,
    value: entry.actual_value,
    numerator: entry.numerator_value,
    denominator: entry.denominator_value,
    month,
    year
  }).query(UPSERT_PERFORMANCE);
}

/**
 * Validate window, upsert PerformanceData, stamp DeptMonthlySubmissions.
 */
async function submitDeptMonthlyData({
  pool,
  deptId,
  userId,
  year,
  month,
  entries,
  districtRow
}) {
  const cycle = mergeCycleConfig(districtRow);
  const activeMonth = getActiveReportingMonth();
  const monthKey = `${year}-${String(month).padStart(2, '0')}`;

  if (!month || !year) throw httpError('Reporting month and year are required');
  if (!isAllowedSubmissionMonth(monthKey)) {
    throw httpError(`You can only submit ${activeMonth} data right now (previous month only).`);
  }
  if (!isSubmissionWindowOpen(monthKey, new Date(), cycle)) {
    throw httpError('Submission window is not open yet for this reporting month.');
  }
  if (!Array.isArray(entries) || entries.length === 0) {
    throw httpError('No entries provided');
  }

  const ownedKpis = await loadOwnedKpis(pool, deptId);
  const invalidIds = entries.map((e) => e.kpi_id).filter((id) => !ownedKpis.has(id));
  if (invalidIds.length > 0) {
    throw httpError('One or more KPIs do not belong to your department', 403);
  }

  const normalized = normalizeEntries(entries, ownedKpis);
  const existing = await getDeptSubmission(pool, deptId, year, month, districtRow);
  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin();
    for (const entry of normalized) {
      await upsertPerformanceRow(transaction, entry, month, year);
    }
    await transaction.commit();
  } catch (err) {
    try { await transaction.rollback(); } catch { /* ignore */ }
    throw err;
  }

  await ensureReportingMonth(pool, year, month);
  const submission = await recordDeptSubmission(pool, deptId, year, month, userId, districtRow);
  const windowStatus = getSubmissionStatus(monthKey, submission.submittedAt, new Date(), cycle);

  return {
    message: existing.exists
      ? (submission.isLate ? 'Monthly data updated (late submission)' : 'Monthly data updated successfully')
      : (submission.isLate ? 'Monthly data submitted (late)' : 'Monthly data submitted successfully'),
    monthKey,
    submission: { ...submission, windowStatus },
    isUpdate: existing.exists,
    reportingMonth: monthKey
  };
}

module.exports = {
  submitDeptMonthlyData
};
