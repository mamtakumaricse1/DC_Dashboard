const test = require('node:test');
const assert = require('node:assert/strict');
const { buildKpiRows } = require('../constants/kpiCatalog');
const {
  resolveEntrySpec,
  computeActualValue,
  resolveSubmissionEntry,
  formatTarget,
  enrichKpiWithEntrySpec,
  extractSavedEntry
} = require('../utils/kpiEntrySpec');

test('Immunization: Registered + Immunized → 90%', () => {
  const kpi = buildKpiRows().find((k) => /Full Immunisation/i.test(k.name));
  const spec = resolveEntrySpec(kpi);
  assert.equal(spec.field1Label, 'Registered Children (0–1 yr)');
  assert.equal(spec.field2Label, 'Fully Immunized');
  assert.equal(computeActualValue(spec, { field1: 30, field2: 27 }), 90);
});

test('Maternal Deaths: Registered mothers + Deaths → 10%', () => {
  const kpi = buildKpiRows().find((k) => /Maternal Deaths/i.test(k.name));
  const spec = resolveEntrySpec(kpi);
  assert.equal(spec.entryMode, 'RATIO');
  assert.equal(spec.field1Label, 'Registered Mothers');
  assert.equal(spec.field2Label, 'Maternal Deaths');
  assert.equal(computeActualValue(spec, { field1: 30, field2: 3 }), 10);
  assert.match(formatTarget(kpi), /0%/);
});

test('all KPIs except yes/no use two fields', () => {
  const kpis = buildKpiRows();
  const yesNo = kpis.filter((k) => /Dashboard Released/i.test(k.name));
  const rest = kpis.filter((k) => !yesNo.includes(k));
  rest.forEach((kpi) => {
    const spec = resolveEntrySpec(kpi);
    assert.equal(spec.entryMode, 'RATIO', kpi.name);
    assert.ok(spec.field1Label, kpi.name);
    assert.ok(spec.field2Label, kpi.name);
  });
});

test('resolveSubmissionEntry for institutional delivery', () => {
  const kpi = buildKpiRows().find((k) => /Institutional Delivery/i.test(k.name));
  const resolved = resolveSubmissionEntry(kpi, {
    denominator_value: 30,
    numerator_value: 27
  });
  assert.equal(resolved.actual_value, 90);
});

test('enrichKpiWithEntrySpec returns saved entry for updates', () => {
  const kpi = buildKpiRows().find((k) => /Maternal Deaths/i.test(k.name));
  const enriched = enrichKpiWithEntrySpec({
    ...kpi,
    actual_value: 10,
    numerator_value: 3,
    denominator_value: 30
  });
  assert.deepEqual(enriched.saved_entry, {
    field1: 30,
    field2: 3,
    single: null,
    score: 10
  });
  assert.equal(enriched.computed_value, 10);
});

test('resolveSubmissionEntry rejects ratio KPI without both fields', () => {
  const kpi = buildKpiRows().find((k) => /Maternal Deaths/i.test(k.name));
  const resolved = resolveSubmissionEntry(kpi, { actual_value: 10 });
  assert.equal(resolved, null);
});

test('extractSavedEntry falls back to stored score when counts missing', () => {
  const kpi = buildKpiRows().find((k) => /Maternal Deaths/i.test(k.name));
  const spec = resolveEntrySpec(kpi);
  const saved = extractSavedEntry(
    { ...kpi, actual_value: 10, numerator_value: null, denominator_value: null },
    spec
  );
  assert.equal(saved.field1, null);
  assert.equal(saved.field2, null);
  assert.equal(saved.score, 10);
});
