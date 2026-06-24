const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const catalog = require('../constants/kpiCatalog.json');
const { makeKpiId } = require('../constants/kpiCatalog');
const {
  resolveKpiScoreAtMonth,
  computeDeptMonthSnapshot,
  buildMeasurementModelPayload
} = require('../services/measurementService');
const monthlyKpi = {
  kpi_id: 'D01_TEST',
  kpi_name: 'Test Monthly %',
  dept_id: 'D01',
  min_value: 0,
  max_value: 100,
  polarity: 'HIGHER',
  freq: 'M',
  kpi_weight: 1
};

const quarterlyKpi = {
  kpi_id: 'D02_TEST',
  kpi_name: 'Test Quarterly',
  dept_id: 'D02',
  min_value: 0,
  max_value: 100,
  polarity: 'HIGHER',
  freq: 'Q',
  kpi_weight: 1
};

describe('resolveKpiScoreAtMonth', () => {
  it('scores monthly KPI with band formula', () => {
    const allRows = [
      { ...monthlyKpi, entry_year: 2025, entry_month: 5, actual_value: 80 }
    ];
    const result = resolveKpiScoreAtMonth({
      kpiDef: monthlyKpi,
      monthKey: '2025-05',
      allRows
    });
    assert.equal(result.score, 80);
    assert.equal(result.scoringMode, 'BAND');
    assert.ok(result.scoreExplanation.includes('80'));
  });

  it('excludes quarterly KPI awaiting data', () => {
    const result = resolveKpiScoreAtMonth({
      kpiDef: quarterlyKpi,
      monthKey: '2025-05',
      allRows: []
    });
    assert.equal(result.excluded, true);
    assert.equal(result.status, 'AWAITING_QUARTER');
  });

  it('uses latest quarter entry for quarterly KPI', () => {
    const allRows = [
      { ...quarterlyKpi, entry_year: 2025, entry_month: 4, actual_value: 60 }
    ];
    const result = resolveKpiScoreAtMonth({
      kpiDef: quarterlyKpi,
      monthKey: '2025-06',
      allRows,
      fiscalStartMonth: 4
    });
    assert.equal(result.score, 60);
    assert.equal(result.reportedMonth, '2025-04');
  });

  it('explains lower-is-better ratio KPI as percent with formula', () => {
    const pendingKpi = {
      kpi_id: 'D12_VEHICLE_REGISTRATION_—_APPLICATIONS_PENDING_FORWARDING_3_DAYS',
      kpi_name: 'Vehicle Registration — Applications Pending Forwarding (>3 days)',
      dept_id: 'D12',
      min_value: 0,
      max_value: 100,
      polarity: 'LOWER',
      freq: 'M',
      unit: 'count',
      kpi_weight: 1
    };
    const allRows = [
      {
        ...pendingKpi,
        entry_year: 2026,
        entry_month: 5,
        actual_value: 94,
        numerator_value: 94,
        denominator_value: 100
      }
    ];
    const result = resolveKpiScoreAtMonth({
      kpiDef: pendingKpi,
      monthKey: '2026-05',
      allRows
    });
    assert.equal(result.score, 6);
    assert.equal(result.meta.reportedUnit, 'pct');
    assert.equal(result.meta.shareInTpiPct, 0.80645);
    assert.ok(result.scoreExplanation.includes('94%'));
    assert.ok(result.scoreExplanation.includes('(100 − 94)'));
    assert.ok(result.scoreExplanation.includes('= 6 score'));
  });

  it('uses DC score target attainment on review month', () => {
    const healthKpi = {
      kpi_id: 'D01_INSTITUTIONAL_DELIVERY',
      kpi_name: 'Institutional Delivery',
      dept_id: 'D01',
      min_value: 0,
      max_value: 100,
      polarity: 'HIGHER',
      freq: 'M',
      kpi_weight: 1
    };
    const allRows = [
      {
        ...healthKpi,
        entry_year: 2026,
        entry_month: 4,
        actual_value: 40,
        numerator_value: 40,
        denominator_value: 100
      },
      {
        ...healthKpi,
        entry_year: 2026,
        entry_month: 5,
        actual_value: 50,
        numerator_value: 50,
        denominator_value: 100
      }
    ];
    const dcScoreTargets = [
      {
        kpi_id: healthKpi.kpi_id,
        month_key: '2026-04',
        target_score: 60,
        target_type: 'SCORE',
        review_month: '2026-05',
        completion_status: 'IN_PROGRESS'
      }
    ];
    const result = resolveKpiScoreAtMonth({
      kpiDef: healthKpi,
      monthKey: '2026-05',
      allRows,
      dcScoreTargets
    });
    assert.equal(result.bandScore, 50);
    assert.equal(result.targetScore, 60);
    assert.equal(result.score, 83.33);
    assert.equal(result.scoringMode, 'DC_SCORE_TARGET');
    assert.equal(result.status, 'YELLOW');
    assert.ok(result.scoreExplanation.includes('50 ÷ 60'));
  });

  it('uses band score before DC target review month', () => {
    const kpi = { ...monthlyKpi, kpi_id: 'D01_BEFORE' };
    const dcScoreTargets = [
      {
        kpi_id: kpi.kpi_id,
        month_key: '2026-04',
        target_score: 60,
        target_type: 'SCORE',
        review_month: '2026-05',
        completion_status: 'IN_PROGRESS'
      }
    ];
    const result = resolveKpiScoreAtMonth({
      kpiDef: kpi,
      monthKey: '2026-04',
      allRows: [{ ...kpi, entry_year: 2026, entry_month: 4, actual_value: 40 }],
      dcScoreTargets
    });
    assert.equal(result.score, 40);
    assert.equal(result.scoringMode, 'BAND');
  });

  it('keeps DC score target active after review month while open', () => {
    const kpi = { ...monthlyKpi, kpi_id: 'D01_PERSIST' };
    const dcScoreTargets = [
      {
        kpi_id: kpi.kpi_id,
        month_key: '2026-04',
        target_score: 60,
        target_type: 'SCORE',
        review_month: '2026-05',
        completion_status: 'IN_PROGRESS'
      }
    ];
    const result = resolveKpiScoreAtMonth({
      kpiDef: kpi,
      monthKey: '2026-06',
      allRows: [{ ...kpi, entry_year: 2026, entry_month: 6, actual_value: 66 }],
      dcScoreTargets
    });
    assert.equal(result.bandScore, 66);
    assert.equal(result.score, 100);
    assert.equal(result.scoringMode, 'DC_SCORE_TARGET');
  });

  it('reverts to band after target marked completed', () => {
    const kpi = { ...monthlyKpi, kpi_id: 'D01_DONE' };
    const dcScoreTargets = [
      {
        kpi_id: kpi.kpi_id,
        month_key: '2026-04',
        target_score: 60,
        target_type: 'SCORE',
        review_month: '2026-05',
        completion_status: 'COMPLETED'
      }
    ];
    const result = resolveKpiScoreAtMonth({
      kpiDef: kpi,
      monthKey: '2026-06',
      allRows: [{ ...kpi, entry_year: 2026, entry_month: 6, actual_value: 66 }],
      dcScoreTargets
    });
    assert.equal(result.score, 66);
    assert.equal(result.scoringMode, 'BAND');
  });

  it('does not overlay score target on quarterly count progress', () => {
    const countKpi = {
      kpi_id: 'D02_TOILETS',
      kpi_name: 'Functional Toilets',
      dept_id: 'D02',
      min_value: 0,
      max_value: 100,
      polarity: 'HIGHER',
      freq: 'M',
      kpi_weight: 1
    };
    const quarterlyTargets = new Map([
      [
        countKpi.kpi_id,
        {
          target_type: 'QUARTERLY',
          target_actual: 10,
          target_quarter: '2026-Q1'
        }
      ]
    ]);
    const dcScoreTargets = [
      {
        kpi_id: countKpi.kpi_id,
        month_key: '2026-04',
        target_score: 80,
        target_type: 'SCORE',
        review_month: '2026-05',
        completion_status: 'IN_PROGRESS'
      }
    ];
    const allRows = [
      { ...countKpi, entry_year: 2026, entry_month: 4, actual_value: 2, numerator_value: 2 },
      { ...countKpi, entry_year: 2026, entry_month: 5, actual_value: 3, numerator_value: 3 }
    ];
    const result = resolveKpiScoreAtMonth({
      kpiDef: countKpi,
      monthKey: '2026-05',
      allRows,
      quarterlyTargets,
      dcScoreTargets,
      fiscalStartMonth: 4
    });
    assert.equal(result.scoringMode, 'DC_QUARTERLY_TARGET');
    assert.equal(result.score, 50);
    assert.equal(result.cumulativeActual, 5);
  });
});

describe('buildMeasurementModelPayload', () => {
  it('includes ladder and target types', () => {
    const model = buildMeasurementModelPayload();
    assert.ok(model.ladder.length >= 5);
    assert.equal(model.dcTargetTypes.length, 2);
  });
});

describe('all catalog KPIs', () => {
  it('scores every KPI with band logic when no DC target exists', () => {
    let monthly = 0;
    let quarterly = 0;
    for (const kpi of catalog.kpis) {
      const kpiId = makeKpiId(kpi.deptId, kpi.name);
      const kpiDef = {
        kpi_id: kpiId,
        kpi_name: kpi.name,
        dept_id: kpi.deptId,
        min_value: kpi.min ?? 0,
        max_value: kpi.max ?? 100,
        polarity: kpi.polarity || 'HIGHER',
        freq: kpi.freq || 'M',
        kpi_weight: 1
      };
      const allRows = [
        {
          ...kpiDef,
          entry_year: 2026,
          entry_month: kpi.freq === 'Q' ? 4 : 5,
          actual_value: 75
        }
      ];
      const result = resolveKpiScoreAtMonth({
        kpiDef,
        monthKey: '2026-05',
        allRows,
        dcScoreTargets: [],
        fiscalStartMonth: 4
      });
      if (kpi.freq === 'Q') {
        quarterly += 1;
        assert.ok(
          result.scoringMode === 'QUARTERLY_REPORT' || result.status === 'AWAITING_QUARTER',
          `${kpiId} quarterly path`
        );
      } else {
        monthly += 1;
        assert.equal(result.scoringMode, 'BAND', `${kpiId} should use band`);
        assert.ok(result.score >= 0 && result.score <= 100, `${kpiId} band score in range`);
      }
    }
    assert.equal(monthly + quarterly, catalog.kpis.length);
    assert.ok(monthly >= 90);
    assert.ok(quarterly >= 20);
  });

  it('applies DC score target to any monthly KPI after review month', () => {
    const sample = catalog.kpis.filter((k) => (k.freq || 'M') === 'M').slice(0, 5);
    for (const kpi of sample) {
      const kpiId = makeKpiId(kpi.deptId, kpi.name);
      const kpiDef = {
        kpi_id: kpiId,
        kpi_name: kpi.name,
        dept_id: kpi.deptId,
        min_value: kpi.min ?? 0,
        max_value: kpi.max ?? 100,
        polarity: kpi.polarity || 'HIGHER',
        freq: 'M',
        kpi_weight: 1
      };
      const dcScoreTargets = [
        {
          kpi_id: kpiId,
          month_key: '2026-04',
          target_score: 60,
          target_type: 'SCORE',
          review_month: '2026-05',
          completion_status: 'IN_PROGRESS'
        }
      ];
      const result = resolveKpiScoreAtMonth({
        kpiDef,
        monthKey: '2026-05',
        allRows: [{ ...kpiDef, entry_year: 2026, entry_month: 5, actual_value: 50 }],
        dcScoreTargets
      });
      assert.equal(result.scoringMode, 'DC_SCORE_TARGET', kpiId);
      assert.equal(result.score, 83.33, kpiId);
    }
  });
});