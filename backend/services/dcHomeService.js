/**
 * DC Command Center data — submissions, alerts, target follow-up, KPI drill-down.
 */
const { sql } = require('../db');
const { SELECT_SUBMISSION_TRACKER, SELECT_ALL_OPEN_ACTION_ITEMS } = require('../constants/sql');
const { toMonthKey } = require('../utils/reportingMonths');
const { KRA_META } = require('../constants/kra');
const { resolveKpiMeta } = require('../constants/kpiMeta');
const { scoreKpiFromRow, getRagStatus } = require('./scoringService');
const {
  calcQuarterlyProgressScore,
  resolveKpiScoreForMonth,
  sumQuarterActualsToDate
} = require('./quarterlyTargetService');
const { mapActionRow } = require('../utils/actionItems');
const { computeDeptMonthSnapshot, explainDcEvaluation } = require('./measurementService');
const {
  getActiveReportingMonth,
  getCurrentMonthKey,
  evaluateTargetDueStatus,
  mergeCycleConfig,
  formatDueDateISO,
  isSubmissionLate
} = require('../utils/reportingCycle');

async function loadSubmissionTracker(db, reportingMonthKey, districtRow) {
  const cycle = mergeCycleConfig(districtRow);

  const result = await db.request()
    .input('mk', sql.Char(7), reportingMonthKey)
    .query(SELECT_SUBMISSION_TRACKER);

  return result.recordset.map((row) => {
    const meta = KRA_META[row.dept_id] || {};
    let status = 'PENDING';
    let isLate = false;

    if (row.submitted_at) {
      isLate = isSubmissionLate(reportingMonthKey, row.submitted_at, cycle);
      status = isLate ? 'SUBMITTED_LATE' : 'SUBMITTED_ON_TIME';
    }

    return {
      deptId: row.dept_id,
      deptName: row.dept_name,
      kra: `${meta.code || 'NA'} - ${meta.label || row.dept_name}`,
      owner: meta.owner || 'N/A',
      status,
      statusLabel:
        status === 'SUBMITTED_ON_TIME'
          ? 'On time'
          : status === 'SUBMITTED_LATE'
            ? 'Late'
            : 'Pending',
      submittedAt: row.submitted_at || null,
      updatedAt: row.updated_at || null,
      isLate
    };
  });
}

async function loadAllOpenActionItems(db) {
  const result = await db.request().query(SELECT_ALL_OPEN_ACTION_ITEMS);
  return result.recordset.filter((r) => r.action_id);
}

function buildScoreMapForMonth(rows, monthKey) {
  const scores = new Map();
  for (const row of rows) {
    if (
      row.kpi_id &&
      row.entry_year &&
      row.entry_month &&
      toMonthKey(row.entry_year, row.entry_month) === monthKey &&
      row.actual_value != null
    ) {
      const score = scoreKpiFromRow(row);
      scores.set(row.kpi_id, Number(score.toFixed(2)));
    }
  }
  return scores;
}

async function loadTargetFollowUp(db, rows, districtRow) {
  const cycle = mergeCycleConfig(districtRow);
  // Achieved column = latest submitted reporting month (e.g. May when reviewing in June).
  const followUpMonth = getActiveReportingMonth();
  const scoreMap = buildScoreMapForMonth(rows, followUpMonth);
  const items = await loadAllOpenActionItems(db);
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const enriched = [];

  for (const row of items) {
    const meta = KRA_META[row.dept_id] || {};
    const kpiMeta = resolveKpiMeta(row.indicator_name);
    const isQuarterly = row.target_type === 'QUARTERLY' && row.target_actual != null;
    let actual = scoreMap.get(row.kpi_id) ?? row.actual_score;
    let target = row.target_score != null ? Number(row.target_score) : null;
    let progressScore = null;
    let cumulativeActual = null;

    if (isQuarterly && row.target_quarter) {
      cumulativeActual = sumQuarterActualsToDate(
        rows,
        row.kpi_id,
        row.target_quarter,
        followUpMonth,
        cycle.fiscalYearStartMonth || 4
      );
      actual = cumulativeActual;
      target = Number(row.target_actual);
      progressScore = calcQuarterlyProgressScore(cumulativeActual, target);
    }

    const deviation =
      actual != null && target != null
        ? Number((actual - target).toFixed(2))
        : row.deviation;

    const targetDate = formatDueDateISO(row.target_date);
    const dueMeta = evaluateTargetDueStatus(
      targetDate,
      row.completion_status,
      deviation,
      now
    );

    const td = row.target_date ? new Date(row.target_date) : null;
    const dueThisMonth =
      td &&
      td.getFullYear() === currentYear &&
      td.getMonth() + 1 === currentMonth;

    const include =
      dueMeta.dueStatus === 'OVERDUE' ||
      dueMeta.dueStatus === 'DUE_TODAY' ||
      dueThisMonth ||
      (td && td < now);

    if (!include && !targetDate) continue;

    enriched.push(
      mapActionRow(
        { ...row, actual_score: actual, deviation },
        {
          kra: `${meta.code || 'NA'} - ${meta.label || ''}`,
          owner: meta.owner,
          ownerPhone: meta.ownerPhone,
          ownerEmail: meta.ownerEmail,
          unitLabel: kpiMeta.unitLabel,
          progressScore,
          cumulativeActual
        },
        'FOLLOW_UP',
        followUpMonth,
        cycle
      )
    );
  }

  enriched.sort((a, b) => {
    const order = { OVERDUE: 0, DUE_TODAY: 1, ON_TRACK: 2, NO_TARGET: 3 };
    return (order[a.dueStatus] ?? 9) - (order[b.dueStatus] ?? 9);
  });

  return { followUpMonth, items: enriched };
}

function buildAlerts(submissionTracker, targetFollowUp, departments) {
  const unsubmittedCount = submissionTracker.filter((s) => s.status === 'PENDING').length;
  const overdueTargetsCount = targetFollowUp.items.filter(
    (t) => t.dueStatus === 'OVERDUE' || t.dueStatus === 'DUE_TODAY'
  ).length;
  const redDeptCount = departments.filter((d) => d.redCount > 0).length;

  return {
    unsubmittedCount,
    overdueTargetsCount,
    redDeptCount,
    lateSubmissionCount: submissionTracker.filter((s) => s.status === 'SUBMITTED_LATE').length,
    submittedCount: submissionTracker.filter((s) => s.status !== 'PENDING').length,
    totalDepartments: submissionTracker.length
  };
}

/** Worst individual RED KPIs district-wide (lowest score first). */
function buildTopRedIndicators(redEntries, limit = 8) {
  return [...redEntries]
    .sort((a, b) => (a.score ?? 999) - (b.score ?? 999))
    .slice(0, limit)
    .map((e) => ({
      deptId: e.deptId,
      kra: e.kra,
      indicator: e.name,
      score: e.score,
      owner: e.owner,
      ownerPhone: e.ownerPhone,
      kpiId: e.kpi_id
    }));
}

function buildRedDepartments(departments) {
  return departments
    .filter((d) => d.redCount > 0)
    .map((d) => ({
      id: d.id,
      name: d.name,
      kra: d.kra,
      owner: d.owner,
      score: d.score,
      redCount: d.redCount,
      ragStatus: d.ragStatus,
      topRedIndicator: d.topRedIndicator
    }))
    .sort((a, b) => b.redCount - a.redCount);
}

function buildDeptKpiDetail(rows, deptId, monthKey, actionMap = new Map(), options = {}) {
  const meta = KRA_META[deptId] || {};
  const fiscalStartMonth = options.fiscalStartMonth || 4;
  const quarterlyTargets = options.quarterlyTargets || new Map();

  const snapshot = computeDeptMonthSnapshot(deptId, rows, monthKey, {
    quarterlyTargets,
    dcScoreTargets: options.dcScoreTargets || [],
    fiscalStartMonth
  });

  const kpis = snapshot.monthKpis.map((k) => {
    const action = actionMap.get(k.kpi_id);
    const isQuarterly = action?.target_type === 'QUARTERLY' && action?.target_actual != null;
    const targetScore = isQuarterly
      ? Number(action.target_actual)
      : action?.target_score != null
        ? Number(action.target_score)
        : null;
    const deviation = isQuarterly
      ? k.cumulativeActual != null && targetScore != null
        ? Number((k.cumulativeActual - targetScore).toFixed(2))
        : null
      : k.scoringMode === 'DC_SCORE_TARGET' && k.bandScore != null && k.targetScore != null
        ? Number((k.bandScore - k.targetScore).toFixed(2))
        : k.score != null && action?.target_score != null
          ? Number((k.score - action.target_score).toFixed(2))
          : null;

    const recommendedTargetType =
      k.freq === 'Q' || k.scoringMode === 'DC_QUARTERLY_TARGET' ? 'QUARTERLY' : 'SCORE';

    return {
      kpiId: k.kpi_id,
      name: k.name,
      actualValue: k.actualValue,
      cumulativeActual: k.cumulativeActual,
      reportedMonth: k.reportedMonth,
      score: k.score,
      status: k.status,
      unit: k.unit,
      unitLabel: k.unitLabel,
      reportedUnit: k.reportedUnit,
      reportedUnitLabel: k.reportedUnitLabel,
      field1Label: k.field1Label,
      field2Label: k.field2Label,
      numerator: k.numerator,
      denominator: k.denominator,
      freq: k.freq,
      freqLabel: k.freqLabel,
      catalogTarget: k.catalogTarget,
      polarityLabel: k.polarityLabel,
      shareInDeptPct: k.shareInDeptPct,
      shareInTpiPct: k.shareInTpiPct,
      tpiContributionPts: k.tpiContributionPts,
      scoringMode: k.scoringMode,
      bandScore: k.bandScore ?? null,
      targetScore: k.targetScore ?? targetScore,
      targetOriginMonth: k.targetOriginMonth ?? null,
      scoreExplanation: k.scoreExplanation,
      tpiContributionNote: k.tpiContributionNote,
      evaluationNote: explainDcEvaluation(
        { freq: k.freq },
        action?.target_type || recommendedTargetType
      ),
      measurementNote: k.measurementNote,
      minValue: k.minValue,
      maxValue: k.maxValue,
      recommendedTargetType,
      targetType: action?.target_type || recommendedTargetType,
      targetQuarter: action?.target_quarter || null,
      targetDate: action?.target_date ? formatDueDateISO(action.target_date) : null,
      deviation
    };
  });

  kpis.sort((a, b) => {
    const sa = a.score ?? 999;
    const sb = b.score ?? 999;
    return sa - sb;
  });

  return {
    deptId,
    deptName: rows.find((r) => r.dept_id === deptId)?.dept_name || deptId,
    kra: `${meta.code || 'NA'} - ${meta.label || ''}`,
    owner: meta.owner || 'N/A',
    ownerPhone: meta.ownerPhone || null,
    ownerEmail: meta.ownerEmail || null,
    monthKey,
    kraScore: snapshot.kraScore,
    scoredIndicators: snapshot.scoredCount,
    kpis
  };
}

async function buildDcHomePayload(db, rows, departments, districtRow, redEntries = []) {
  const reportingMonth = getActiveReportingMonth();
  const [submissionTracker, targetFollowUp] = await Promise.all([
    loadSubmissionTracker(db, reportingMonth, districtRow),
    loadTargetFollowUp(db, rows, districtRow)
  ]);

  const alerts = buildAlerts(submissionTracker, targetFollowUp, departments);

  return {
    reportingMonth,
    alerts,
    submissionTracker,
    targetFollowUp: targetFollowUp.items,
    followUpMonth: targetFollowUp.followUpMonth,
    topRedIndicators: buildTopRedIndicators(redEntries),
    redDepartments: buildRedDepartments(departments)
  };
}

module.exports = {
  loadSubmissionTracker,
  loadTargetFollowUp,
  buildAlerts,
  buildDeptKpiDetail,
  buildDcHomePayload,
  buildScoreMapForMonth
};
