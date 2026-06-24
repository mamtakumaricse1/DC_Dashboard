/**
 * Builds dashboard payloads from raw SQL rows.
 *
 * In-memory structure per department:
 *   monthly[YYYY-MM] = { score: Σ(kpiScore×weight), weight: Σ(weight) }
 *   monthKpis[]    = per-KPI detail for the selected reporting month only
 */

const { KRA_META, MONTH_LABELS } = require('../constants/kra');
const { getDeptContributionPct, TOTAL_KPI_COUNT, EQUAL_KPI_TPI_PCT } = require('../constants/kpiCatalog');
const {
  scoreKpiFromRow,
  getRagStatus,
  kpiWeightOf,
  getKraTrend,
  scoreTrend
} = require('./scoringService');
const {
  syncAndLoadActionItems,
  loadPriorCommitments,
  mapActionRow
} = require('../utils/actionItems');
const { sql } = require('../db');
const { loadMonthsAvailable, toMonthKey } = require('../utils/reportingMonths');
const { loadDistrictConfig, toPublicDistrictConfig } = require('../utils/districtConfig');
const {
  getActiveReportingMonth,
  buildReportingCycleInfo,
  mergeCycleConfig
} = require('../utils/reportingCycle');
const { DASHBOARD_ROWS_SQL, loadDashboardRows } = require('../constants/queries');
const {
  SELECT_QUARTERLY_TARGETS,
  SELECT_DC_SCORE_TARGETS,
  SELECT_ACTION_TARGETS_BY_MONTH
} = require('../constants/sql');
const { resolveKpiMeta } = require('../constants/kpiMeta');
const { buildDcHomePayload, buildDeptKpiDetail } = require('./dcHomeService');
const { computeDeptMonthSnapshot, buildMeasurementModelPayload, resolveKpiScoreAtMonth } = require('./measurementService');

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

function formatMonthLabel(monthKey) {
  if (!monthKey) return '';
  const [year, month] = monthKey.split('-');
  return `${MONTH_LABELS[Number(month) - 1]} ${year}`;
}

/** Months where at least one KPI has a submitted actual value. */
function monthsWithPerformanceFromRows(rows) {
  const keys = new Set();
  for (const row of rows) {
    if (
      row.entry_year != null &&
      row.entry_month != null &&
      row.actual_value != null
    ) {
      keys.add(toMonthKey(row.entry_year, row.entry_month));
    }
  }
  return Array.from(keys).sort();
}

function lastScoredPoint(series) {
  for (let i = series.length - 1; i >= 0; i -= 1) {
    if (series[i].score != null) return series[i];
  }
  return null;
}

function firstScoredPoint(series) {
  for (let i = 0; i < series.length; i += 1) {
    if (series[i].score != null) return series[i];
  }
  return null;
}

function resolveSelectedMonthKey(monthsAvailable, queryMonth, queryYear, userRole) {
  if (queryMonth >= 1 && queryMonth <= 12 && queryYear > 0) {
    return toMonthKey(queryYear, queryMonth);
  }

  const suggested = getActiveReportingMonth();

  if (monthsAvailable.includes(suggested)) return suggested;
  return suggested || monthsAvailable[monthsAvailable.length - 1] || null;
}

// ---------------------------------------------------------------------------
// Department aggregation (in-memory)
// ---------------------------------------------------------------------------

function createEmptyDept(deptId, deptName) {
  const meta = KRA_META[deptId] || {};
  return {
    dept_id: deptId,
    name: deptName,
    kraCode: meta.code || 'NA',
    kraLabel: meta.label || deptName,
    owner: meta.owner || 'N/A',
    monthly: {},
    kpiIds: new Set(),
    monthKpis: []
  };
}

function getOrCreateDept(departments, row) {
  if (!departments[row.dept_id]) {
    departments[row.dept_id] = createEmptyDept(row.dept_id, row.dept_name);
  }
  if (row.kpi_id) {
    departments[row.dept_id].kpiIds.add(row.kpi_id);
  }
  return departments[row.dept_id];
}

/**
 * Process one SQL row into department monthly totals.
 * When selectedMonthKey is set, also updates district RAG counts and monthKpis.
 */
async function loadQuarterlyTargets(db) {
  const result = await db.request().query(SELECT_QUARTERLY_TARGETS);
  const map = new Map();
  for (const row of result.recordset) {
    if (row.kpi_id) map.set(row.kpi_id, row);
  }
  return map;
}

async function loadDcScoreTargets(db) {
  const result = await db.request().query(SELECT_DC_SCORE_TARGETS);
  return result.recordset.filter((row) => row.kpi_id);
}

function resolveRowScore(row, monthKey, scoringContext) {
  if (scoringContext?.allRows) {
    const resolved = resolveKpiScoreAtMonth({
      kpiDef: row,
      monthKey,
      allRows: scoringContext.allRows,
      quarterlyTargets: scoringContext.quarterlyTargets || new Map(),
      dcScoreTargets: scoringContext.dcScoreTargets || [],
      fiscalStartMonth: scoringContext.fiscalStartMonth || 4
    });
    if (!resolved.excluded && resolved.score != null) {
      return {
        score: resolved.score,
        actual: resolved.actual,
        cumulativeActual: resolved.cumulativeActual ?? null
      };
    }
    if (resolved.excluded) {
      return { score: null, actual: resolved.actual, cumulativeActual: null };
    }
  }
  const score = scoreKpiFromRow(row);
  return { score: Number(score.toFixed(2)), actual: row.actual_value, cumulativeActual: null };
}

function accumulatePerformanceRow(departments, row, selectedMonthKey, districtTotals, scoringContext) {
  const dept = getOrCreateDept(departments, row);

  if (row.entry_year == null || row.entry_month == null || row.actual_value == null) {
    return;
  }

  const monthKey = toMonthKey(row.entry_year, row.entry_month);
  if (!dept.monthly[monthKey]) {
    dept.monthly[monthKey] = { score: 0, weight: 0 };
  }

  const resolved =
    monthKey === selectedMonthKey && scoringContext
      ? resolveRowScore(row, monthKey, scoringContext)
      : {
          score: Number(scoreKpiFromRow(row).toFixed(2))
        };
  const kpiScore = resolved.score ?? 0;
  const weight = kpiWeightOf(row);
  dept.monthly[monthKey].score += kpiScore * weight;
  dept.monthly[monthKey].weight += weight;

  if (selectedMonthKey && monthKey === selectedMonthKey && districtTotals) {
    const status = getRagStatus(kpiScore);
    districtTotals[status.toLowerCase()] += 1;
    districtTotals.scoreSum += kpiScore * weight;
    districtTotals.weightSum += weight;
    const kpiMeta = resolveKpiMeta(row.kpi_name);
    dept.monthKpis.push({
      kpi_id: row.kpi_id,
      name: row.kpi_name,
      score: Number(kpiScore.toFixed(2)),
      status,
      unit: row.unit || kpiMeta.unit,
      unitLabel: kpiMeta.unitLabel,
      cumulativeActual: resolved.cumulativeActual ?? null
    });
  }
}

/** KRA score per month = weighted average of KPI scores that month. */
function monthlyScoresFromDept(dept) {
  const scores = {};
  for (const [month, val] of Object.entries(dept.monthly)) {
    scores[month] = val.weight > 0 ? val.score / val.weight : 0;
  }
  return scores;
}

function buildDeptSummary(deptId, dept, selectedMonthKey, snapshot = null) {
  const monthlyScores = monthlyScoresFromDept(dept);
  const sortedMonths = Object.keys(monthlyScores).sort().reverse();
  const kraScore = snapshot
    ? snapshot.kraScore
    : Number(
        (selectedMonthKey && monthlyScores[selectedMonthKey] !== undefined
          ? monthlyScores[selectedMonthKey]
          : monthlyScores[sortedMonths[0]] || 0
        ).toFixed(2)
      );

  const monthKpis = snapshot?.monthKpis || dept.monthKpis;

  let greenCount = 0;
  let yellowCount = 0;
  const redKpis = [];
  for (const kpi of monthKpis) {
    if (kpi.status === 'GREEN') greenCount += 1;
    else if (kpi.status === 'YELLOW') yellowCount += 1;
    else if (kpi.status === 'RED') redKpis.push(kpi);
  }
  redKpis.sort((a, b) => a.score - b.score);

  const trendSeries = sortedMonths
    .slice(0, 6)
    .reverse()
    .map((month) => ({
      month,
      score: Number((monthlyScores[month] || 0).toFixed(2))
    }));

  const deptTpiWeight = getDeptContributionPct(deptId);

  return {
    id: deptId,
    name: dept.name,
    kra: `${dept.kraCode} - ${dept.kraLabel}`,
    owner: dept.owner,
    weight: deptTpiWeight,
    kpiCount: dept.kpiIds.size,
    indicators: monthKpis.filter((k) => k.score != null).length,
    greenCount,
    yellowCount,
    redCount: redKpis.length,
    score: kraScore,
    achievement: kraScore,
    ragStatus: getRagStatus(kraScore),
    trend: getKraTrend(monthlyScores),
    trendSeries,
    topRedIndicator: redKpis[0]?.name || '-',
    actionStatus: redKpis.length > 0 ? 'See Action Tracker' : 'No Action Needed',
    _redKpis: redKpis
  };
}

// ---------------------------------------------------------------------------
// Action tracker assembly
// ---------------------------------------------------------------------------

function buildKpiScoreMaps(rows, selectedMonthKey) {
  const currentKpiScores = new Map();
  const kraLookup = new Map();

  for (const row of rows) {
    if (
      row.kpi_id &&
      row.entry_year &&
      row.entry_month &&
      toMonthKey(row.entry_year, row.entry_month) === selectedMonthKey &&
      row.actual_value != null
    ) {
      const score = scoreKpiFromRow(row);
      currentKpiScores.set(row.kpi_id, Number(score.toFixed(2)));
    }
    if (row.dept_id && !kraLookup.has(row.dept_id)) {
      const meta = KRA_META[row.dept_id] || {};
      kraLookup.set(row.dept_id, {
        kra: `${meta.code || 'NA'} - ${meta.label || row.dept_name}`,
        owner: meta.owner || 'N/A',
        ownerPhone: meta.ownerPhone || null,
        ownerEmail: meta.ownerEmail || null
      });
    }
  }

  return { currentKpiScores, kraLookup };
}

function mapCurrentActionTracker(redEntries, actionItemMap, selectedMonthKey, cycle) {
  const mergedCycle = mergeCycleConfig(cycle);
  return redEntries.map((entry) => {
    const stored = actionItemMap.get(entry.kpi_id);
    if (!stored) {
      const stub = {
        action_id: null,
        dept_id: entry.deptId,
        kpi_id: entry.kpi_id,
        month_key: selectedMonthKey,
        indicator_name: entry.name,
        indicator_score: entry.score,
        status: 'RED',
        action_owner: entry.owner,
        action_plan: '',
        target_score: null,
        target_date: null,
        completion_status: 'PENDING',
        actual_score: entry.score,
        deviation: null,
        review_month: null,
        dc_remarks: ''
      };
      return mapActionRow(stub, entry, 'CURRENT', selectedMonthKey, mergedCycle);
    }
    return mapActionRow(stored, entry, 'CURRENT', selectedMonthKey, mergedCycle);
  });
}

// ---------------------------------------------------------------------------
// Public API — called by route handlers
// ---------------------------------------------------------------------------

/**
 * Full master dashboard payload for GET /api/dashboard/summary.
 */
async function buildDashboardSummary(db, queryMonth, queryYear, userRole = 'ADMIN', deptId = null) {
  const isDeptView = userRole === 'DEPT' && deptId;
  const [rowsResult, monthsAvailable, districtRow] = await Promise.all([
    loadDashboardRows(db, isDeptView ? deptId : null),
    loadMonthsAvailable(db),
    loadDistrictConfig(db)
  ]);

  const cycle = mergeCycleConfig(districtRow);
  const reportingCycle = buildReportingCycleInfo(cycle, new Date());
  const district = toPublicDistrictConfig(districtRow);

  const rows = rowsResult.recordset;
  const selectedMonthKey = resolveSelectedMonthKey(
    monthsAvailable,
    queryMonth,
    queryYear,
    userRole
  );

  const [quarterlyTargets, dcScoreTargets] = await Promise.all([
    loadQuarterlyTargets(db),
    loadDcScoreTargets(db)
  ]);
  const scoringContext = {
    allRows: rows,
    quarterlyTargets,
    dcScoreTargets,
    fiscalStartMonth: cycle.fiscalYearStartMonth || 4
  };

  const departments = {};

  for (const row of rows) {
    accumulatePerformanceRow(departments, row, selectedMonthKey, null, scoringContext);
  }

  const districtTotals = { green: 0, yellow: 0, red: 0, scoreSum: 0, weightSum: 0 };
  const deptSnapshots = new Map();

  for (const deptId of Object.keys(departments)) {
    const snapshot = computeDeptMonthSnapshot(deptId, rows, selectedMonthKey, scoringContext);
    deptSnapshots.set(deptId, snapshot);
    departments[deptId].monthKpis = snapshot.monthKpis;
    for (const kpi of snapshot.monthKpis) {
      if (kpi.score == null || kpi.status === 'AWAITING') continue;
      const status = kpi.status === 'NO_DATA' ? 'red' : kpi.status.toLowerCase();
      if (status === 'green') districtTotals.green += 1;
      else if (status === 'yellow') districtTotals.yellow += 1;
      else districtTotals.red += 1;
    }
  }

  const redEntries = [];
  const deptArray = Object.entries(departments).map(([id, dept]) => {
    const summary = buildDeptSummary(id, dept, selectedMonthKey, deptSnapshots.get(id));
    const { _redKpis, ...publicFields } = summary;

    for (const kpi of _redKpis) {
      const kraMeta = KRA_META[id] || {};
      redEntries.push({
        deptId: id,
        kpi_id: kpi.kpi_id,
        name: kpi.name,
        score: kpi.score,
        owner: dept.owner,
        ownerPhone: kraMeta.ownerPhone || null,
        ownerEmail: kraMeta.ownerEmail || null,
        kra: publicFields.kra,
        freq: kpi.freq,
        freqLabel: kpi.freqLabel,
        unit: kpi.unit,
        unitLabel: kpi.unitLabel,
        reportedUnit: kpi.reportedUnit,
        reportedUnitLabel: kpi.reportedUnitLabel,
        field1Label: kpi.field1Label,
        field2Label: kpi.field2Label,
        numerator: kpi.numerator,
        denominator: kpi.denominator,
        actualValue: kpi.actual,
        catalogTarget: kpi.catalogTarget,
        shareInTpiPct: EQUAL_KPI_TPI_PCT,
        scoreExplanation: kpi.scoreExplanation,
        tpiContributionNote: kpi.tpiContributionNote,
        evaluationNote: kpi.evaluationNote,
        recommendedTargetType: kpi.freq === 'Q' ? 'QUARTERLY' : 'SCORE'
      });
    }

    return publicFields;
  });

  const { currentKpiScores, kraLookup } = buildKpiScoreMaps(rows, selectedMonthKey);

  const [actionItemMap, priorCommitments, dcHome] = await Promise.all([
    syncAndLoadActionItems(db, redEntries, selectedMonthKey),
    loadPriorCommitments(db, selectedMonthKey, currentKpiScores, kraLookup, districtRow),
    isDeptView
      ? Promise.resolve(null)
      : buildDcHomePayload(db, rowsResult.recordset, deptArray, districtRow, redEntries)
  ]);

  const actionTracker = mapCurrentActionTracker(
    redEntries,
    actionItemMap,
    selectedMonthKey,
    districtRow
  );

  // District TPI = equal average of all scored KPIs (each KPI = 100 ÷ 124 of index).
  let districtPI = 0;
  let scoredKpiCount = 0;
  for (const [, snapshot] of deptSnapshots) {
    for (const kpi of snapshot?.monthKpis || []) {
      if (kpi.score == null || kpi.status === 'AWAITING') continue;
      districtPI += kpi.score;
      scoredKpiCount += 1;
    }
  }
  districtPI = scoredKpiCount > 0 ? Number((districtPI / scoredKpiCount).toFixed(2)) : 0;

  deptArray.sort((a, b) => b.score - a.score);

  const basePayload = {
    districtPI,
    totalKpis: TOTAL_KPI_COUNT,
    selectedMonth: selectedMonthKey,
    suggestedMonth: reportingCycle.defaultMonthForRole,
    monthsAvailable,
    yearsAvailable: [...new Set(monthsAvailable.map((m) => m.split('-')[0]))].sort((a, b) => b - a),
    district,
    reportingCycle,
    measurementModel: buildMeasurementModelPayload(),
    kpiStatusCounts: {
      green: districtTotals.green,
      yellow: districtTotals.yellow,
      red: districtTotals.red,
      totalIndicators: districtTotals.green + districtTotals.yellow + districtTotals.red
    },
    departments: deptArray,
    actionTracker,
    priorCommitments
  };

  if (isDeptView) {
    return basePayload;
  }

  return {
    ...basePayload,
    dcHome,
    top3: deptArray.slice(0, 3),
    bottom3: deptArray.slice(-3).reverse()
  };
}

async function buildDeptKpiDetailPayload(db, deptId, queryMonth, queryYear) {
  const [rowsResult, monthsAvailable, districtRow] = await Promise.all([
    loadDashboardRows(db, deptId),
    loadMonthsAvailable(db),
    loadDistrictConfig(db)
  ]);

  const rows = rowsResult.recordset;
  const selectedMonthKey = resolveSelectedMonthKey(
    monthsAvailable,
    queryMonth,
    queryYear,
    'ADMIN'
  );

  const cycle = mergeCycleConfig(districtRow);
  const [quarterlyTargets, dcScoreTargets, actionResult] = await Promise.all([
    loadQuarterlyTargets(db),
    loadDcScoreTargets(db),
    db.request()
      .input('mk', sql.Char(7), selectedMonthKey)
      .query(SELECT_ACTION_TARGETS_BY_MONTH)
  ]);

  const actionMap = new Map();
  actionResult.recordset.forEach((a) => {
    if (a.kpi_id) actionMap.set(a.kpi_id, a);
  });

  return buildDeptKpiDetail(rows, deptId, selectedMonthKey, actionMap, {
    quarterlyTargets,
    dcScoreTargets,
    fiscalStartMonth: cycle.fiscalYearStartMonth || 4
  });
}

/**
 * History chart payload for GET /api/dashboard/history.
 */
async function buildHistoryPayload(db, monthCount) {
  const [rowsResult, monthsAvailable] = await Promise.all([
    db.request().query(DASHBOARD_ROWS_SQL),
    loadMonthsAvailable(db)
  ]);

  const rows = rowsResult.recordset;
  const dataMonths = monthsWithPerformanceFromRows(rows);
  let monthKeys = dataMonths.slice(-monthCount);
  if (monthKeys.length === 0) {
    monthKeys = monthsAvailable.slice(-monthCount);
  }

  const departments = {};

  for (const row of rows) {
    accumulatePerformanceRow(departments, row, null, null);
  }

  const departmentsOut = Object.entries(departments)
    .map(([id, dept]) => {
      const monthlyScores = monthlyScoresFromDept(dept);
      const series = monthKeys.map((m, i) => {
        const hasData = Object.prototype.hasOwnProperty.call(monthlyScores, m);
        const score = hasData ? Number(monthlyScores[m].toFixed(2)) : null;
        const prevMonth = i > 0 ? monthKeys[i - 1] : null;
        const prevHasData =
          prevMonth && Object.prototype.hasOwnProperty.call(monthlyScores, prevMonth);
        const prevScore = prevHasData ? Number(monthlyScores[prevMonth].toFixed(2)) : null;
        return {
          month: m,
          label: formatMonthLabel(m),
          score,
          trend:
            score != null && prevScore != null ? scoreTrend(score, prevScore) : 'FLAT'
        };
      });
      const firstPoint = firstScoredPoint(series);
      const lastPoint = lastScoredPoint(series);

      return {
        id,
        name: dept.name,
        shortName: (dept.name || id).split('/')[0].trim(),
        kra: `${dept.kraCode} - ${dept.kraLabel}`,
        series,
        overallTrend:
          firstPoint && lastPoint
            ? scoreTrend(lastPoint.score, firstPoint.score)
            : 'FLAT',
        latestScore: lastPoint?.score ?? null,
        latestScoreMonth: lastPoint?.month ?? null
      };
    })
    .sort((a, b) => (b.latestScore ?? -1) - (a.latestScore ?? -1));

  return { monthCount, months: monthKeys, departments: departmentsOut };
}

module.exports = {
  buildDashboardSummary,
  buildHistoryPayload,
  buildDeptKpiDetailPayload,
  toMonthKey
};
