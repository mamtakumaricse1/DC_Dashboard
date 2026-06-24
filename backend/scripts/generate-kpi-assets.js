/**
 * Generate dept KPI guides (frontend) + contribution document (docs).
 * Run: node scripts/generate-kpi-assets.js
 */
const fs = require('fs');
const path = require('path');
const { KRA_META } = require('../constants/kra');
const {
  polarityLabel,
  freqLabel
} = require('../services/kpiGuideService');
const { buildEnterHint, resolveEntrySpec } = require('../utils/kpiEntrySpec');
const {
  catalog,
  TOTAL_DEPT_WEIGHT,
  TOTAL_KPI_COUNT,
  EQUAL_KPI_TPI_PCT,
  makeKpiId,
  getKpisForDept,
  getDeptContributionPct,
  getKpiContributionPct,
  getKpiShareWithinDeptPct,
  getDeptWeight
} = require('../constants/kpiCatalog');

const ROOT = path.join(__dirname, '..', '..');
const GUIDES_OUT = path.join(ROOT, 'frontend', 'src', 'constants', 'deptKpiGuides.js');
const DOC_OUT = path.join(ROOT, 'docs', '07_KPI_Weights_and_Contribution.md');

function enterHint(kpi) {
  const full = {
    ...kpi,
    kpi_id: makeKpiId(kpi.deptId, kpi.name),
    target_value: kpi.target,
    unit_label: kpi.unitLabel
  };
  return buildEnterHint(full, resolveEntrySpec(full));
}

function buildDeptGuide(deptId) {
  const meta = KRA_META[deptId] || {};
  const deptMeta = catalog.departments[deptId];
  const kpis = getKpisForDept(deptId).map((k) => ({
    ...k,
    deptId,
    num: k.num,
    name: k.name,
    unit: k.unit,
    unitLabel: k.unitLabel,
    target: k.target,
    polarity: k.polarity,
    polarityLabel: polarityLabel(k.polarity),
    freq: k.freq,
    freqLabel: freqLabel(k.freq),
    shareInDeptPct: getKpiShareWithinDeptPct(deptId),
    shareInTpiPct: getKpiContributionPct(deptId),
    enterHint: enterHint(k)
  }));

  return {
    deptId,
    deptName: meta.label || deptId,
    kra: `${meta.code || ''} - ${meta.label || ''}`.trim(),
    owner: meta.owner || '',
    deptWeight: getDeptContributionPct(deptId),
    workbookWeight: deptMeta?.deptWeight || 0,
    deptContributionPct: getDeptContributionPct(deptId),
    indicatorCount: kpis.length,
    howToEnter: [
      'Open **Data Submission** tab — only the **previous calendar month** can be entered.',
      'For each indicator, type the **actual value** in the unit shown (% / count / days / hours).',
      'Click **Submit Monthly Data** before the deadline (default: 11 PM on the 1st of the month).',
      'You may update values until the deadline passes.'
    ],
    howToCheckTargets: [
      'Open **Action Tracker** tab to see DC targets when any indicator is RED (<70 score).',
      'Expand a row to read the **target score**, **due date**, and **action plan**.',
      'Quarterly indicators: DC may set a **count target for the quarter** — your monthly entries are summed.'
    ],
    kpis
  };
}

const guides = {};
for (const deptId of Object.keys(catalog.departments).sort()) {
  guides[deptId] = buildDeptGuide(deptId);
}

const guidesJs = `/**
 * Auto-generated from Tirap_Performance_Index_v2 Updated.xlsx
 * Regenerate: node backend/scripts/generate-kpi-assets.js
 */
export const TOTAL_DEPT_WEIGHT = ${TOTAL_DEPT_WEIGHT};
export const DEPT_KPI_GUIDES = ${JSON.stringify(guides, null, 2)};

export function guideForDept(deptId) {
  return DEPT_KPI_GUIDES[deptId] || null;
}
`;

fs.writeFileSync(GUIDES_OUT, guidesJs, 'utf8');

let md = `# TPI — KPI Weights, Department Contribution & All 124 Indicators

Source: **Tirap_Performance_Index_v2 Updated.xlsx** / TIRAP PERFORMANCE INDEX -Updated.docx

---

## How district TPI is calculated

1. Each **KPI** gets a performance score **0–100** from the actual value entered (band or quarterly logic).
2. **KRA (department) score** = average of that department's KPI scores (for ranking and drill-down).
3. **District TPI** = **equal average** of all ${TOTAL_KPI_COUNT} indicators — each KPI contributes **${EQUAL_KPI_TPI_PCT}%** of the index.

\`\`\`
District TPI = Σ (KPI score) ÷ ${TOTAL_KPI_COUNT}

Each indicator: ${EQUAL_KPI_TPI_PCT}% of district TPI (100 ÷ ${TOTAL_KPI_COUNT}).
\`\`\`

---

## Department contribution to District TPI

| Dept | KRA | Indicators | % of District TPI |
|------|-----|------------|-------------------|
`;

for (const deptId of Object.keys(catalog.departments).sort()) {
  const g = guides[deptId];
  md += `| ${deptId} | ${g.kra} | ${g.indicatorCount} | ${g.deptContributionPct}% |\n`;
}

md += `\n**Per-KPI share:** ${EQUAL_KPI_TPI_PCT}% each (${TOTAL_KPI_COUNT} indicators)\n\n`;
md += `---\n\n## All 124 KPIs by department\n\n`;

for (const deptId of Object.keys(catalog.departments).sort()) {
  const g = guides[deptId];
  md += `### ${deptId} — ${g.kra}\n\n`;
  md += `- **Department share:** ${g.deptContributionPct}% of district TPI (${g.indicatorCount} × ${EQUAL_KPI_TPI_PCT}%)\n`;
  md += `- **Indicators:** ${g.indicatorCount}\n`;
  md += `- **Owner:** ${g.owner}\n\n`;
  md += `| # | Indicator | Unit | Target | Direction | Freq | % within dept | % of district TPI |\n`;
  md += `|---|-----------|------|--------|-----------|------|---------------|-------------------|\n`;
  for (const k of g.kpis) {
    md += `| ${k.num} | ${k.name.replace(/\|/g, '/')} | ${k.unitLabel} | ${k.target ?? '—'} | ${k.polarityLabel} | ${k.freq} | ${k.shareInDeptPct}% | ${k.shareInTpiPct}% |\n`;
  }
  md += '\n';
}

md += `---\n\n*Regenerate this file: \`node backend/scripts/generate-kpi-assets.js\`*\n`;

fs.writeFileSync(DOC_OUT, md, 'utf8');
console.log('Wrote', GUIDES_OUT);
console.log('Wrote', DOC_OUT);
