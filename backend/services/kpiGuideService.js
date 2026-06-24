/**
 * KPI guide payloads — built from live DB (KPIs + Departments).
 * Updates automatically when KPIs, units, targets, or weights change in the database.
 */
const { KRA_META } = require('../constants/kra');
const { resolveEntrySpec, buildEnterHint, formatTarget } = require('../utils/kpiEntrySpec');

function polarityLabel(p) {
  return p === 'LOWER' ? 'Lower is better' : 'Higher is better';
}

function freqLabel(f) {
  if (f === 'Q') return 'Quarterly (cumulative count in the quarter)';
  return 'Monthly';
}

function mapKpiRow(kpi, shareInDeptPct, shareInTpiPct) {
  const entrySpec = resolveEntrySpec(kpi);
  return {
    num: kpi.kpi_num ?? null,
    kpiId: kpi.kpi_id,
    name: kpi.name,
    unit: kpi.unit,
    unitLabel: kpi.unit_label || kpi.unit,
    target: formatTarget(kpi),
    targetValue: kpi.target_value ?? null,
    polarity: kpi.polarity,
    polarityLabel: polarityLabel(kpi.polarity),
    freq: kpi.freq || 'M',
    freqLabel: freqLabel(kpi.freq || 'M'),
    entryMode: entrySpec.entryMode,
    field1Label: entrySpec.field1Label || null,
    field2Label: entrySpec.field2Label || null,
    inputLabel: entrySpec.inputLabel || null,
    resultLabel: entrySpec.resultLabel,
    shareInDeptPct,
    shareInTpiPct,
    enterHint: buildEnterHint(kpi, entrySpec)
  };
}

function buildStaticSections() {
  return {
    howToEnter: [
      'Open Data Submission tab — only the previous calendar month can be entered.',
      'Every indicator uses TWO fields: a base/total column (e.g. Registered mothers) and an achieved/events column (e.g. Deaths).',
      'Score % is calculated automatically: (second field ÷ first field) × 100. Example: 3 deaths ÷ 30 registered mothers = 10%.',
      'For deaths and backlog indicators, target is 0% — lower score % is better.',
      'Click Submit Monthly Data before the deadline (default: 11 PM on the 1st of the month).'
    ],
    howToCheckTargets: [
      'Open Action Tracker tab to see DC targets when any indicator is RED (<70 score).',
      'Expand a row to read the target score, due date, and action plan.',
      'Monthly targets: DC expects a score (0–100) by next month — check Target Follow-up.',
      'Quarterly targets: DC may set a count for the quarter — your monthly entries are summed automatically.'
    ],
    howScoringWorks: [
      'Score % = (Achieved ÷ Total) × 100 for every indicator.',
      'Higher-is-better indicators (coverage, delivery): aim for Score % near 100%.',
      'Lower-is-better indicators (deaths, deaths rate, backlog): aim for Score % near 0%.',
      'Each of the 124 district indicators contributes equally (~0.806% of district TPI). Your department share equals your indicator count ÷ 124.'
    ]
  };
}

/**
 * Build one department guide from KPI rows + department weight.
 */
function buildDeptGuideFromRows(deptId, deptName, deptWeight, totalDeptWeight, kpiRows, totalKpiCount) {
  const meta = KRA_META[deptId] || {};
  const deptContributionPct = totalKpiCount > 0
    ? Number(((kpiRows.length / totalKpiCount) * 100).toFixed(2))
    : 0;
  const shareInTpiPct = totalKpiCount > 0
    ? Number((100 / totalKpiCount).toFixed(5))
    : 0;

  const kpis = kpiRows.map((k) => {
    const shareInDeptPct = kpiRows.length
      ? Number((100 / kpiRows.length).toFixed(2))
      : 0;
    return mapKpiRow(k, shareInDeptPct, shareInTpiPct);
  });

  return {
    deptId,
    deptName: deptName || meta.label || deptId,
    kra: `${meta.code || ''} - ${meta.label || deptName || ''}`.trim(),
    owner: meta.owner || '',
    deptWeight: deptContributionPct,
    deptContributionPct,
    indicatorCount: kpis.length,
    ...buildStaticSections(),
    howScoringWorks: buildStaticSections().howScoringWorks,
    kpis
  };
}

/**
 * Load all departments' guides from the database.
 */
async function loadAllGuidesFromDb(db) {
  const [deptResult, kpiResult] = await Promise.all([
    db.request().query('SELECT dept_id, name, weight FROM Departments ORDER BY dept_id'),
    db.request().query(`
      SELECT kpi_id, dept_id, name, unit, unit_label, target_value, freq, polarity,
             kpi_num, weight, min_value, max_value
      FROM KPIs
      ORDER BY dept_id, COALESCE(kpi_num, 9999), name
    `)
  ]);

  const deptRows = deptResult.recordset;
  const totalKpiCount = kpiResult.recordset.length;
  const totalDeptWeight = deptRows.reduce((sum, d) => sum + (Number(d.weight) || 0), 0);
  const kpisByDept = new Map();

  kpiResult.recordset.forEach((row) => {
    if (!kpisByDept.has(row.dept_id)) kpisByDept.set(row.dept_id, []);
    kpisByDept.get(row.dept_id).push(row);
  });

  const guides = {};
  deptRows.forEach((dept) => {
    guides[dept.dept_id] = buildDeptGuideFromRows(
      dept.dept_id,
      dept.name,
      Number(dept.weight) || 0,
      totalDeptWeight,
      kpisByDept.get(dept.dept_id) || [],
      totalKpiCount
    );
  });

  return {
    totalDeptWeight: Number(totalDeptWeight.toFixed(4)),
    totalKpis: kpiResult.recordset.length,
    totalDepartments: deptRows.length,
    guides
  };
}

async function buildDeptKpiGuidePayload(db, deptId) {
  const all = await loadAllGuidesFromDb(db);
  const guide = all.guides[deptId];
  if (!guide) {
    const err = new Error('Department not found');
    err.status = 404;
    throw err;
  }

  return {
    ...guide,
    totalDeptWeight: all.totalDeptWeight,
    totalKpis: all.totalKpis,
    totalDepartments: all.totalDepartments
  };
}

module.exports = {
  polarityLabel,
  freqLabel,
  buildDeptGuideFromRows,
  loadAllGuidesFromDb,
  buildDeptKpiGuidePayload
};
