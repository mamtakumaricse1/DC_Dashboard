const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  calcKpiScore,
  scoreKpiFromRow,
  getRagStatus,
  scoreTrend,
  getKraTrend,
  kpiWeightOf
} = require('../services/scoringService');

describe('calcKpiScore', () => {
  it('scores higher-is-better KPIs proportionally', () => {
    assert.equal(calcKpiScore(48, 0, 100, 'HIGHER'), 48);
    assert.equal(calcKpiScore(100, 0, 100, 'HIGHER'), 100);
    assert.equal(calcKpiScore(0, 0, 100, 'HIGHER'), 0);
  });

  it('scores lower-is-better KPIs inversely', () => {
    assert.equal(calcKpiScore(10, 0, 100, 'LOWER'), 90);
    assert.equal(calcKpiScore(0, 0, 100, 'LOWER'), 100);
    assert.equal(calcKpiScore(100, 0, 100, 'LOWER'), 0);
  });

  it('returns 0 for null actual or equal min/max', () => {
    assert.equal(calcKpiScore(null, 0, 100, 'HIGHER'), 0);
    assert.equal(calcKpiScore(50, 10, 10, 'HIGHER'), 0);
  });

  it('clamps scores to 0–100', () => {
    assert.equal(calcKpiScore(150, 0, 100, 'HIGHER'), 100);
    assert.equal(calcKpiScore(-10, 0, 100, 'HIGHER'), 0);
  });
});

describe('scoreKpiFromRow', () => {
  it('maps yes/no 1 to performance score 100', () => {
    const row = {
      actual_value: 1,
      unit_label: 'yes/no',
      polarity: 'HIGHER',
      min_value: 0,
      max_value: 100
    };
    assert.equal(scoreKpiFromRow(row), 100);
  });

  it('scores ratio %-stored OST against 0–100 band', () => {
    const row = {
      actual_value: 80,
      kpi_name: 'OST Active Patients',
      unit: 'count',
      polarity: 'HIGHER',
      min_value: 0,
      max_value: 300,
      numerator_value: 240,
      denominator_value: 300
    };
    assert.equal(scoreKpiFromRow(row), 80);
  });

  it('scores maternal death rate with LOWER polarity', () => {
    const row = {
      actual_value: 10,
      kpi_name: 'Maternal Deaths',
      polarity: 'LOWER',
      min_value: 0,
      max_value: 100,
      numerator_value: 3,
      denominator_value: 30
    };
    assert.equal(scoreKpiFromRow(row), 90);
  });
});

describe('getRagStatus', () => {
  it('assigns GREEN, YELLOW, and RED at thresholds', () => {
    assert.equal(getRagStatus(90), 'GREEN');
    assert.equal(getRagStatus(89.9), 'YELLOW');
    assert.equal(getRagStatus(70), 'YELLOW');
    assert.equal(getRagStatus(69.9), 'RED');
  });
});

describe('scoreTrend', () => {
  it('detects UP, DOWN, and FLAT with deadband', () => {
    assert.equal(scoreTrend(85, 80), 'UP');
    assert.equal(scoreTrend(80, 85), 'DOWN');
    assert.equal(scoreTrend(80, 80.5), 'FLAT');
    assert.equal(scoreTrend(50, null), 'FLAT');
  });
});

describe('getKraTrend', () => {
  it('returns FLAT when fewer than 3 months', () => {
    assert.equal(getKraTrend({ '2025-01': 80, '2025-02': 82 }), 'FLAT');
  });

  it('detects improving trend over 3 months', () => {
    const scores = { '2025-01': 70, '2025-02': 72, '2025-03': 85 };
    assert.equal(getKraTrend(scores), 'UP');
  });
});

describe('kpiWeightOf', () => {
  it('uses equal weight for every KPI', () => {
    assert.equal(kpiWeightOf({}), 1);
    assert.equal(kpiWeightOf({ kpi_weight: 0 }), 1);
    assert.equal(kpiWeightOf({ kpi_weight: 2 }), 1);
  });
});
