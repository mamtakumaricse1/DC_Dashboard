const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  getQuarterKey,
  formatQuarterReportingLabel,
  formatQuarterRangeLabel,
  isQuarterEndMonth,
  buildQuarterEntryContext
} = require('../utils/quarterPeriod');

describe('quarterPeriod', () => {
  it('maps June 2026 to fiscal Q1 Apr–Jun', () => {
    assert.equal(getQuarterKey('2026-06', 4), '2026-Q1');
    assert.equal(formatQuarterRangeLabel('2026-Q1', 4), 'Apr–Jun 2026');
    assert.equal(formatQuarterReportingLabel('2026-06', 4), 'Q1 (Apr–Jun 2026)');
    assert.equal(isQuarterEndMonth('2026-06', 4), true);
    assert.equal(isQuarterEndMonth('2026-07', 4), false);
  });

  it('maps July 2026 filing month to Q2 range', () => {
    assert.equal(getQuarterKey('2026-07', 4), '2026-Q2');
    assert.equal(formatQuarterRangeLabel('2026-Q2', 4), 'Jul–Sep 2026');
    assert.equal(formatQuarterReportingLabel('2026-07', 4), 'Q2 (Jul–Sep 2026)');
  });

  it('flags quarterly KPI due only on quarter-end month', () => {
    const kpi = { freq: 'Q' };
    const june = buildQuarterEntryContext(kpi, '2026-06', 4);
    const july = buildQuarterEntryContext(kpi, '2026-07', 4);

    assert.equal(june.quarter_due_this_month, true);
    assert.match(june.quarter_due_note, /Apr–Jun 2026/);
    assert.equal(july.quarter_due_this_month, false);
    assert.match(july.quarter_due_note, /Sep/);
  });
});
