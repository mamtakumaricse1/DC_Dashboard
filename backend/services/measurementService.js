/**
 * KPI measurement model — units, frequency, contribution, score explanation.
 * Single place for how indicators feed district TPI.
 */
const {
  getCatalogKpi,
  getKpiShareWithinDeptPct,
  getDeptContributionPct,
  getDeptWeight,
  TOTAL_KPI_COUNT,
  EQUAL_KPI_TPI_PCT
} = require('../constants/kpiCatalog');
const { resolveKpiMeta } = require('../constants/kpiMeta');
const { resolveEntrySpec } = require('../utils/kpiEntrySpec');
const { scoreKpiFromRow, getRagStatus, resolveScoringBand, kpiWeightOf } = require('./scoringService');
const { getQuarterKey, getQuarterMonthKeys, sumQuarterActualsToDate, calcQuarterlyProgressScore } = require('./quarterlyTargetService');
const { getNextMonthKey } = require('../utils/reportingCycle');
const { toMonthKey } = require('../utils/reportingMonths');

function findRowAtMonth(allRows, kpiId, monthKey) {
  return allRows.find(
    (r) =>
      r.kpi_id === kpiId &&
      r.entry_year != null &&
      r.entry_month != null &&
      toMonthKey(r.entry_year, r.entry_month) === monthKey
  );
}

function findLatestActualInQuarter(allRows, kpiId, monthKey, fiscalStartMonth = 4) {
  const quarterKey = getQuarterKey(monthKey, fiscalStartMonth);
  const quarterMonths = getQuarterMonthKeys(quarterKey, fiscalStartMonth);
  const eligible = quarterMonths.filter((m) => m <= monthKey);
  let latest = null;

  for (const row of allRows) {
    if (row.kpi_id !== kpiId || row.actual_value == null) continue;
    if (row.entry_year == null || row.entry_month == null) continue;
    const mk = toMonthKey(row.entry_year, row.entry_month);
    if (!eligible.includes(mk)) continue;
    if (!latest || mk > latest.monthKey) {
      latest = { row, monthKey: mk, actual: Number(row.actual_value) };
    }
  }
  return latest;
}

function buildMeasurementMeta(row) {
  const catalog = getCatalogKpi(row.kpi_id);
  const inferred = resolveKpiMeta(row.kpi_name);
  const merged = {
    ...catalog,
    ...row,
    name: row.kpi_name || catalog?.name
  };
  const entrySpec = resolveEntrySpec(merged);
  const reportedAsPercent =
    entrySpec.entryMode === 'RATIO' && entrySpec.ratioScale === 100;
  const freq = row.freq || catalog?.freq || 'M';
  const polarity = row.polarity || catalog?.polarity || inferred.polarity || 'HIGHER';
  const deptId = row.dept_id;
  const catalogUnit = row.unit || inferred.unit;
  const catalogUnitLabel = row.unit_label || inferred.unitLabel || catalogUnit || '';

  return {
    freq,
    freqLabel: freq === 'Q' ? 'Quarterly' : 'Monthly',
    measurementNote:
      freq === 'Q'
        ? 'Reported once per quarter — score uses latest entry in the fiscal quarter.'
        : 'Reported every month — missing month counts as zero score.',
    catalogTarget: row.target_value ?? catalog?.target ?? null,
    unit: catalogUnit,
    unitLabel: catalogUnitLabel,
    reportedUnit: reportedAsPercent ? 'pct' : catalogUnit,
    reportedUnitLabel: reportedAsPercent ? '%' : catalogUnitLabel,
    field1Label: entrySpec.field1Label || null,
    field2Label: entrySpec.field2Label || null,
    entryMode: entrySpec.entryMode,
    polarity,
    polarityLabel: polarity === 'LOWER' ? 'Lower is better' : 'Higher is better',
    minValue: row.min_value,
    maxValue: row.max_value,
    shareInDeptPct: getKpiShareWithinDeptPct(deptId),
    shareInTpiPct: EQUAL_KPI_TPI_PCT,
    deptContributionPct: getDeptContributionPct(deptId),
    deptWeight: getDeptWeight(deptId),
    kpiNum: row.kpi_num ?? catalog?.num ?? null
  };
}

function formatBandScoreExplanation(resolved, meta) {
  const actual = resolved.actual;
  const score = resolved.score ?? 0;
  const min = resolved.scoringMin ?? 0;
  const max = resolved.scoringMax ?? 100;
  const unitLabel = meta.reportedUnitLabel || meta.unitLabel || '';
  const actualDisplay =
    meta.reportedUnit === 'pct' || unitLabel === '%'
      ? `${actual}%`
      : `${actual}${unitLabel ? ` ${unitLabel}` : ''}`;

  let prefix = '';
  if (
    resolved.numerator != null &&
    resolved.denominator != null &&
    resolved.denominator > 0 &&
    meta.field1Label &&
    meta.field2Label
  ) {
    prefix = `${resolved.numerator} ${meta.field2Label} ÷ ${resolved.denominator} ${meta.field1Label} = ${actual}% → `;
  }

  if (meta.polarity === 'LOWER') {
    return `${prefix}${actualDisplay} (${meta.polarityLabel}): (${max} − ${actual}) ÷ ${max - min} × 100 = ${score} score`;
  }
  return `${prefix}${actualDisplay} (${meta.polarityLabel}): (${actual} − ${min}) ÷ ${max - min} × 100 = ${score} score`;
}

function explainScore(resolved, meta) {
  if (resolved.scoringMode === 'DC_SCORE_TARGET') {
    return (
      `DC target ${resolved.targetScore} (from ${resolved.targetOriginMonth}): ` +
      `${resolved.bandScore} ÷ ${resolved.targetScore} × 100 = ${resolved.score} score ` +
      `(reported performance ${resolved.bandScore})`
    );
  }
  if (resolved.scoringMode === 'DC_QUARTERLY_TARGET') {
    const cum = resolved.cumulativeActual ?? 0;
    const tgt = resolved.targetActual ?? 0;
    return `Quarter progress: ${cum} ÷ ${tgt} ${meta.unitLabel || 'units'} × 100 = ${resolved.score ?? 0} score`;
  }
  if (resolved.scoringMode === 'QUARTERLY_REPORT') {
    if (resolved.status === 'AWAITING_QUARTER') {
      return 'Awaiting quarterly report — not counted in this month\'s TPI until data is filed.';
    }
    const reported = resolved.reportedMonth ? ` (from ${resolved.reportedMonth})` : '';
    return `Quarterly indicator${reported}: ${formatBandScoreExplanation(resolved, meta)}`;
  }
  if (resolved.status === 'NO_DATA') {
    return 'No data submitted this month — score treated as 0.';
  }
  return formatBandScoreExplanation(resolved, meta);
}

/** DC score target from a prior RED month — active from review month until closed or superseded. */
function isDcScoreTargetActiveForMonth(row, monthKey) {
  if (row.month_key >= monthKey) return false;
  const targetType = row.target_type || 'SCORE';
  if (targetType !== 'SCORE') return false;

  const firstReview = row.review_month || getNextMonthKey(row.month_key);
  if (monthKey < firstReview) return false;

  const status = row.completion_status || 'PENDING';
  if (status === 'COMPLETED') {
    const lastReview = row.review_month || firstReview;
    return monthKey <= lastReview;
  }
  return true;
}

function findApplicableDcScoreTarget(dcScoreTargets, kpiId, monthKey) {
  if (!Array.isArray(dcScoreTargets) || !dcScoreTargets.length) return null;
  let best = null;
  for (const row of dcScoreTargets) {
    if (row.kpi_id !== kpiId) continue;
    const targetScore = Number(row.target_score);
    if (!Number.isFinite(targetScore) || targetScore <= 0) continue;
    if (!isDcScoreTargetActiveForMonth(row, monthKey)) continue;
    if (!best || row.month_key > best.month_key) best = row;
  }
  return best;
}

function applyDcScoreTargetIfNeeded(resolved, dcScoreTargets, kpiId, monthKey) {
  if (resolved.scoringMode === 'DC_QUARTERLY_TARGET' || resolved.excluded) return resolved;
  const dcTarget = findApplicableDcScoreTarget(dcScoreTargets, kpiId, monthKey);
  if (!dcTarget || resolved.score == null) return resolved;
  const bandScore = resolved.score;
  const targetScore = Number(dcTarget.target_score);
  const attainmentScore = calcQuarterlyProgressScore(bandScore, targetScore);
  return {
    ...resolved,
    bandScore,
    targetScore,
    targetOriginMonth: dcTarget.month_key,
    score: attainmentScore,
    scoringMode: 'DC_SCORE_TARGET',
    status: getRagStatus(attainmentScore)
  };
}

function attachScoringContext(resolved, kpiDef, dataRow = null) {
  const scoringRow = {
    ...kpiDef,
    ...(dataRow || {}),
    actual_value: resolved.actual
  };
  const { min, max } = resolveScoringBand(scoringRow);
  return {
    ...resolved,
    scoringMin: min,
    scoringMax: max,
    numerator:
      dataRow?.numerator_value != null ? Number(dataRow.numerator_value) : null,
    denominator:
      dataRow?.denominator_value != null ? Number(dataRow.denominator_value) : null
  };
}

function explainDcEvaluation(meta, targetType) {
  if (targetType === 'QUARTERLY') {
    return 'DC sets a count target for the fiscal quarter. Each month you enter progress; DC reviews cumulative total at quarter-end and in Target Follow-up.';
  }
  if (meta.freq === 'Q') {
    return 'DC reviews when quarterly data is filed. Target Follow-up compares your quarter result to any score target set when RED.';
  }
  return 'DC sets a score target (0–100) due next month. Target Follow-up compares achieved score vs target on the due date.';
}

function explainTpiContribution(meta, score) {
  if (score == null) {
    return `Each of ${TOTAL_KPI_COUNT} indicators contributes equally (~${EQUAL_KPI_TPI_PCT}% of district TPI when scored).`;
  }
  const points = Number(((score * meta.shareInTpiPct) / 100).toFixed(2));
  return `Equal weight: ~${meta.shareInTpiPct}% of district TPI → ${points} points at current score (of 100 max district).`;
}

/**
 * Resolve how a KPI scores at a specific calendar month.
 */
function resolveKpiScoreAtMonth({
  kpiDef,
  monthKey,
  allRows,
  quarterlyTargets = new Map(),
  dcScoreTargets = [],
  fiscalStartMonth = 4
}) {
  const meta = buildMeasurementMeta(kpiDef);
  const qTarget = quarterlyTargets.get(kpiDef.kpi_id);

  const finish = (resolved) => {
    const withTarget = applyDcScoreTargetIfNeeded(
      resolved,
      dcScoreTargets,
      kpiDef.kpi_id,
      monthKey
    );
    return { ...withTarget, meta, scoreExplanation: explainScore(withTarget, meta) };
  };

  if (
    qTarget?.target_type === 'QUARTERLY' &&
    qTarget.target_actual != null &&
    qTarget.target_quarter
  ) {
    const monthRow = findRowAtMonth(allRows, kpiDef.kpi_id, monthKey);
    const cumulativeActual = sumQuarterActualsToDate(
      allRows,
      kpiDef.kpi_id,
      qTarget.target_quarter,
      monthKey,
      fiscalStartMonth
    );
    const score = calcQuarterlyProgressScore(cumulativeActual, qTarget.target_actual);
    const resolved = {
      actual: monthRow?.actual_value != null ? Number(monthRow.actual_value) : null,
      score,
      cumulativeActual,
      scoringMode: 'DC_QUARTERLY_TARGET',
      targetActual: Number(qTarget.target_actual),
      targetQuarter: qTarget.target_quarter,
      excluded: false,
      status: score != null ? getRagStatus(score) : 'NO_DATA'
    };
    return finish(resolved);
  }

  if (meta.freq === 'Q') {
    const latest = findLatestActualInQuarter(
      allRows,
      kpiDef.kpi_id,
      monthKey,
      fiscalStartMonth
    );
    if (!latest) {
      const resolved = {
        actual: null,
        score: null,
        cumulativeActual: null,
        scoringMode: 'QUARTERLY_REPORT',
        excluded: true,
        status: 'AWAITING_QUARTER'
      };
      return finish(resolved);
    }
    const score = Number(scoreKpiFromRow({ ...kpiDef, actual_value: latest.actual }).toFixed(2));
    const resolved = attachScoringContext(
      {
        actual: latest.actual,
        score,
        cumulativeActual: null,
        scoringMode: 'QUARTERLY_REPORT',
        reportedMonth: latest.monthKey,
        excluded: false,
        status: getRagStatus(score)
      },
      kpiDef,
      latest.row
    );
    return finish(resolved);
  }

  const monthRow = findRowAtMonth(allRows, kpiDef.kpi_id, monthKey);
  if (!monthRow || monthRow.actual_value == null) {
    const resolved = {
      actual: null,
      score: 0,
      cumulativeActual: null,
      scoringMode: 'BAND',
      excluded: false,
      status: 'NO_DATA'
    };
    return finish(resolved);
  }

  const actual = Number(monthRow.actual_value);
  const score = Number(scoreKpiFromRow({ ...kpiDef, ...monthRow, actual_value: actual }).toFixed(2));
  const resolved = attachScoringContext(
    {
      actual,
      score,
      cumulativeActual: null,
      scoringMode: 'BAND',
      excluded: false,
      status: getRagStatus(score)
    },
    kpiDef,
    monthRow
  );
  return finish(resolved);
}

/** Unique KPI definitions for a department from dashboard rows. */
function collectDeptKpiDefs(rows, deptId) {
  const map = new Map();
  for (const row of rows) {
    if (row.dept_id !== deptId || !row.kpi_id) continue;
    if (!map.has(row.kpi_id)) {
      map.set(row.kpi_id, { ...row });
    }
  }
  return Array.from(map.values()).sort(
    (a, b) => (a.kpi_num ?? 9999) - (b.kpi_num ?? 9999)
  );
}

/**
 * Score all KPIs for one department at one month — drives KRA score + drill-down.
 */
function computeDeptMonthSnapshot(deptId, allRows, monthKey, scoringContext = {}) {
  const kpiDefs = collectDeptKpiDefs(allRows, deptId);
  const quarterlyTargets = scoringContext.quarterlyTargets || new Map();
  const dcScoreTargets = scoringContext.dcScoreTargets || [];
  const fiscalStartMonth = scoringContext.fiscalStartMonth || 4;

  let scoreSum = 0;
  let weightSum = 0;
  const monthKpis = [];

  for (const kpiDef of kpiDefs) {
    const resolved = resolveKpiScoreAtMonth({
      kpiDef,
      monthKey,
      allRows,
      quarterlyTargets,
      dcScoreTargets,
      fiscalStartMonth
    });
    const weight = kpiWeightOf(kpiDef);
    if (!resolved.excluded) {
      weightSum += weight;
      scoreSum += (resolved.score ?? 0) * weight;
    }

    monthKpis.push({
      kpi_id: kpiDef.kpi_id,
      name: kpiDef.kpi_name,
      score: resolved.score,
      status: resolved.status === 'AWAITING_QUARTER' ? 'AWAITING' : resolved.status,
      actual: resolved.actual,
      actualValue: resolved.actual,
      unit: resolved.meta.unit,
      unitLabel: resolved.meta.unitLabel,
      reportedUnit: resolved.meta.reportedUnit,
      reportedUnitLabel: resolved.meta.reportedUnitLabel,
      field1Label: resolved.meta.field1Label,
      field2Label: resolved.meta.field2Label,
      numerator: resolved.numerator,
      denominator: resolved.denominator,
      cumulativeActual: resolved.cumulativeActual,
      reportedMonth: resolved.reportedMonth || null,
      freq: resolved.meta.freq,
      freqLabel: resolved.meta.freqLabel,
      catalogTarget: resolved.meta.catalogTarget,
      polarityLabel: resolved.meta.polarityLabel,
      shareInDeptPct: resolved.meta.shareInDeptPct,
      shareInTpiPct: EQUAL_KPI_TPI_PCT,
      tpiContributionPts:
        resolved.score != null
          ? Number(((resolved.score * EQUAL_KPI_TPI_PCT) / 100).toFixed(2))
          : null,
      scoringMode: resolved.scoringMode,
      bandScore: resolved.bandScore ?? null,
      targetScore: resolved.targetScore ?? null,
      targetOriginMonth: resolved.targetOriginMonth ?? null,
      scoreExplanation: resolved.scoreExplanation,
      tpiContributionNote: explainTpiContribution(resolved.meta, resolved.score),
      evaluationNote: explainDcEvaluation(resolved.meta, null),
      measurementNote: resolved.meta.measurementNote,
      minValue: resolved.meta.minValue,
      maxValue: resolved.meta.maxValue
    });
  }

  const kraScore = weightSum > 0 ? Number((scoreSum / weightSum).toFixed(2)) : 0;

  return { kraScore, monthKpis, weightSum, scoredCount: monthKpis.filter((k) => k.score != null).length };
}

function buildMeasurementModelPayload() {
  return {
    title: 'How District TPI is measured',
    ladder: [
      {
        step: 1,
        title: 'Department enters ACTUAL',
        detail:
          'Each month, HoDs submit raw numbers: for % indicators, enter numerator and denominator (e.g. immunised / registered); for count/days/hours, enter the single value. System calculates % and performance score.'
      },
      {
        step: 2,
        title: 'System converts to performance score (0–100)',
        detail:
          'First month (no DC target): band score on 0–100 scale from reported data. After DC sets a score target on RED, every month from the review month onward uses target attainment (band score ÷ target × 100) until the target is completed or a newer target is set. Quarterly count targets use cumulative progress ÷ DC count.'
      },
      {
        step: 3,
        title: 'RAG colour',
        detail: 'GREEN ≥90 · YELLOW 70–89 · RED <70. RED items appear in Action Tracker.'
      },
      {
        step: 4,
        title: 'KRA (department) score',
        detail:
          'Average of all scored indicators in that department for the month (for ranking and drill-down). Quarterly indicators awaiting data are excluded (not penalized).'
      },
      {
        step: 5,
        title: 'District TPI',
        detail: `Equal average of all ${TOTAL_KPI_COUNT} indicators — each KPI contributes ${EQUAL_KPI_TPI_PCT}% of the 100-point district index.`
      }
    ],
    dcTargetTypes: [
      {
        type: 'SCORE',
        label: 'Monthly score target',
        when: 'Use for monthly indicators that went RED',
        evaluation:
          'Due next month (default: 1st). DC checks achieved score in Target Follow-up and marks Completed / Missed.'
      },
      {
        type: 'QUARTERLY',
        label: 'Quarterly count target',
        when: 'Use for count indicators (toilets, villages, connections)',
        evaluation:
          'DC sets e.g. 10 units for Apr–Jun. Monthly entries sum up — month 1 with 2 done = 20% progress. Review at quarter-end.'
      }
    ],
    frequencies: [
      {
        code: 'M',
        label: 'Monthly',
        reporting: 'Submit previous month during submission window',
        scoring: 'Band score every month; missing month = 0'
      },
      {
        code: 'Q',
        label: 'Quarterly',
        reporting: 'Submit when quarterly figure is available',
        scoring: 'Latest quarter entry used; awaiting data = excluded from TPI'
      }
    ]
  };
}

module.exports = {
  buildMeasurementMeta,
  explainScore,
  explainDcEvaluation,
  explainTpiContribution,
  resolveKpiScoreAtMonth,
  collectDeptKpiDefs,
  computeDeptMonthSnapshot,
  buildMeasurementModelPayload
};
