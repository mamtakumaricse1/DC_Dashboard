/**
 * Action Tracker persistence — RED indicators and DC commitments (ActionItems table).
 */
const { sql } = require('../db');
const { EQUAL_KPI_TPI_PCT } = require('../constants/kpiCatalog');
const {
  UPSERT_RED_ACTION_ITEM,
  SELECT_RED_ACTION_ITEMS_BY_MONTH,
  SELECT_PRIOR_OPEN_COMMITMENTS,
  UPDATE_ACTION_REVIEW_SCORE,
  MARK_ACTION_MISSED,
  UPDATE_ACTION_ITEM,
  UPDATE_ACTION_DEVIATION
} = require('../constants/sql');
const {
  evaluateTargetDueStatus,
  getTargetDueDate,
  formatDueDateISO,
  buildCommitmentTimeline,
  mergeCycleConfig
} = require('./reportingCycle');

function formatDateISO(date) {
  if (!date) return null;
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function enrichActionRow(row, entry, section, reviewMonthKey, cycle) {
  const actual = row.actual_score != null ? Number(row.actual_score) : null;
  const target = row.target_score != null ? Number(row.target_score) : null;
  let deviation = row.deviation != null ? Number(row.deviation) : null;

  if (deviation == null && actual != null && target != null) {
    deviation = Number((actual - target).toFixed(2));
  }

  const targetDate = formatDateISO(row.target_date);
  const dueMeta = evaluateTargetDueStatus(targetDate, row.completion_status, deviation);
  const originMonth = row.month_key;
  const timeline = buildCommitmentTimeline(originMonth, reviewMonthKey || originMonth, cycle);

  return {
    actionId: row.action_id,
    section,
    deptId: row.dept_id,
    kpiId: row.kpi_id,
    kra: entry?.kra,
    owner: entry?.owner || row.action_owner,
    actionOwner: row.action_owner || entry?.owner,
    indicator: row.indicator_name,
    indicatorScore: Number(row.indicator_score),
    status: row.status || 'RED',
    month: row.month_key,
    originMonth,
    reviewMonth: row.review_month || reviewMonthKey,
    targetDate,
    targetScore: target,
    targetType: row.target_type || 'SCORE',
    targetActual: row.target_actual != null ? Number(row.target_actual) : null,
    targetQuarter: row.target_quarter || null,
    actionPlan: row.action_plan || '',
    completionStatus: row.completion_status || 'PENDING',
    actualScore: actual,
    deviation,
    dcRemarks: row.dc_remarks || '',
    dueStatus: dueMeta.status,
    dueLabel: dueMeta.label,
    isOverdue: dueMeta.isOverdue,
    timeline,
    shareInTpiPct: EQUAL_KPI_TPI_PCT,
    ownerPhone: entry?.ownerPhone || null,
    ownerEmail: entry?.ownerEmail || null,
    recommendedTargetType: entry?.recommendedTargetType || 'SCORE',
    freq: entry?.freq,
    freqLabel: entry?.freqLabel,
    unit: entry?.unit,
    unitLabel: entry?.unitLabel,
    reportedUnit: entry?.reportedUnit,
    reportedUnitLabel: entry?.reportedUnitLabel,
    field1Label: entry?.field1Label,
    field2Label: entry?.field2Label,
    numerator: entry?.numerator,
    denominator: entry?.denominator,
    actualValue: entry?.actualValue,
    catalogTarget: entry?.catalogTarget,
    scoreExplanation: entry?.scoreExplanation,
    tpiContributionNote: entry?.tpiContributionNote,
    evaluationNote: entry?.evaluationNote
  };
}

function mapActionRow(row, entry, section = 'CURRENT', reviewMonthKey = null, cycle = null) {
  return enrichActionRow(row, entry, section, reviewMonthKey, mergeCycleConfig(cycle));
}

async function runInTransaction(db, operations) {
  if (!operations.length) return;

  const transaction = new sql.Transaction(db);
  await transaction.begin();

  try {
    for (const op of operations) {
      await op(new sql.Request(transaction));
    }
    await transaction.commit();
  } catch (err) {
    try { await transaction.rollback(); } catch { /* ignore */ }
    throw err;
  }
}

async function syncAndLoadActionItems(db, redEntries, monthKey) {
  if (!monthKey || !Array.isArray(redEntries)) return new Map();

  await runInTransaction(db, redEntries.map((entry) => (request) =>
    request
      .input('dept', sql.VarChar(10), entry.deptId)
      .input('kid', sql.VarChar(400), entry.kpi_id)
      .input('mk', sql.Char(7), monthKey)
      .input('name', sql.NVarChar(255), entry.name)
      .input('score', sql.Float, entry.score)
      .input('owner', sql.NVarChar(150), entry.owner || '')
      .query(UPSERT_RED_ACTION_ITEM)
  ));

  const result = await db.request()
    .input('mk', sql.Char(7), monthKey)
    .query(SELECT_RED_ACTION_ITEMS_BY_MONTH);

  const map = new Map();
  for (const row of result.recordset) {
    if (row.kpi_id) map.set(row.kpi_id, row);
  }
  return map;
}

async function loadPriorCommitments(db, selectedMonthKey, currentKpiScores, kraLookup, cycle) {
  if (!selectedMonthKey) return [];

  const mergedCycle = mergeCycleConfig(cycle);
  const result = await db.request()
    .input('mk', sql.Char(7), selectedMonthKey)
    .query(SELECT_PRIOR_OPEN_COMMITMENTS);

  const items = [];
  const today = new Date();
  const scoreUpdates = [];
  const missedUpdates = [];

  for (const row of result.recordset) {
    if (!row.action_id) continue;

    const currentScore = currentKpiScores.get(row.kpi_id);
    const actual = currentScore != null ? Number(currentScore) : row.actual_score;
    const target = row.target_score != null ? Number(row.target_score) : null;
    const deviation =
      actual != null && target != null
        ? Number((actual - target).toFixed(2))
        : row.deviation;

    if (currentScore != null) {
      scoreUpdates.push({ actionId: row.action_id, actual, deviation });
      row.actual_score = actual;
      row.deviation = deviation;
      row.review_month = selectedMonthKey;
    }

    const dueDate = row.target_date ? new Date(row.target_date) : null;
    const dueEnd = dueDate ? new Date(dueDate) : null;
    if (dueEnd) dueEnd.setHours(23, 59, 59, 999);

    if (
      dueEnd &&
      today > dueEnd &&
      ['PENDING', 'IN_PROGRESS'].includes(row.completion_status) &&
      deviation != null &&
      deviation < 0
    ) {
      missedUpdates.push(row.action_id);
      row.completion_status = 'MISSED';
    }

    const meta = kraLookup.get(row.dept_id) || {};
    items.push(
      mapActionRow(row, { kra: meta.kra, owner: meta.owner }, 'PRIOR', selectedMonthKey, mergedCycle)
    );
  }

  await runInTransaction(db, [
    ...scoreUpdates.map(({ actionId, actual, deviation }) => (request) =>
      request
        .input('id', sql.Int, actionId)
        .input('actual', sql.Float, actual)
        .input('dev', sql.Float, deviation)
        .input('rm', sql.Char(7), selectedMonthKey)
        .query(UPDATE_ACTION_REVIEW_SCORE)
    ),
    ...missedUpdates.map((actionId) => (request) =>
      request
        .input('id', sql.Int, actionId)
        .query(MARK_ACTION_MISSED)
    )
  ]);

  return items;
}

async function updateActionItem(db, actionId, fields, cycle) {
  const mergedCycle = mergeCycleConfig(cycle);

  let targetDate = fields.target_date ?? null;
  const targetType = fields.target_type || null;

  if (fields.target_score != null && !targetDate && fields.origin_month_key && targetType !== 'QUARTERLY') {
    targetDate = formatDueDateISO(getTargetDueDate(fields.origin_month_key, mergedCycle));
  }

  let targetQuarter = fields.target_quarter ?? null;
  if (targetType === 'QUARTERLY' && !targetQuarter && fields.origin_month_key) {
    const { getQuarterKey } = require('../services/quarterlyTargetService');
    targetQuarter = getQuarterKey(fields.origin_month_key, mergedCycle.fiscalYearStartMonth || 4);
  }

  const result = await db.request()
    .input('id', sql.Int, actionId)
    .input('owner', sql.NVarChar(150), fields.action_owner ?? null)
    .input('target', sql.Date, targetDate ?? null)
    .input('plan', sql.NVarChar(500), fields.action_plan ?? null)
    .input('tscore', sql.Float, fields.target_score ?? null)
    .input('ttype', sql.VarChar(20), targetType ?? null)
    .input('tactual', sql.Float, fields.target_actual ?? null)
    .input('tquarter', sql.Char(7), targetQuarter ?? null)
    .input('cstatus', sql.VarChar(20), fields.completion_status ?? null)
    .input('actual', sql.Float, fields.actual_score ?? null)
    .input('dev', sql.Float, fields.deviation ?? null)
    .input('rm', sql.Char(7), fields.review_month ?? null)
    .input('remarks', sql.NVarChar(500), fields.dc_remarks ?? null)
    .query(UPDATE_ACTION_ITEM);

  const row = result.recordset[0];
  if (!row) return null;

  if (fields.target_score != null && row.actual_score != null && fields.deviation == null) {
    const dev = Number((row.actual_score - row.target_score).toFixed(2));
    await db.request()
      .input('id', sql.Int, actionId)
      .input('dev', sql.Float, dev)
      .query(UPDATE_ACTION_DEVIATION);
    row.deviation = dev;
  }

  return row;
}

module.exports = {
  syncAndLoadActionItems,
  loadPriorCommitments,
  updateActionItem,
  formatDateISO,
  mapActionRow,
  enrichActionRow
};
