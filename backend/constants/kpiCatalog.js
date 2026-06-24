/**
 * Official 124 KPI catalog — parsed from Tirap_Performance_Index_v2 Updated.xlsx
 * Source workbook: TIRAP PERFORMANCE INDEX -Updated.docx / Excel master file.
 */
const catalog = require('./kpiCatalog.json');

/** Total indicators in the district index. */
const TOTAL_KPI_COUNT = catalog.kpis.length;

/** Each KPI contributes equally to district TPI (100 ÷ 124). */
const EQUAL_KPI_TPI_PCT = Number((100 / TOTAL_KPI_COUNT).toFixed(5));

/** Unit weight for scoring — all KPIs weighted the same. */
const EQUAL_KPI_WEIGHT = 1;

/** Raw weights from Excel workbook (14 KRAs — sums to 106). */
const RAW_DEPT_WEIGHT_TOTAL = Object.values(catalog.departments).reduce(
  (sum, d) => sum + (d.deptWeight || 0),
  0
);

/** Normalized weights for TPI — always sum to 100. */
const TOTAL_DEPT_WEIGHT = 100;

const NORMALIZED_DEPT_WEIGHTS = (() => {
  const ids = Object.keys(catalog.departments).sort();
  let assigned = 0;
  const map = {};
  ids.forEach((deptId, index) => {
    const raw = catalog.departments[deptId]?.deptWeight || 0;
    if (!raw || !RAW_DEPT_WEIGHT_TOTAL) {
      map[deptId] = 0;
      return;
    }
    if (index === ids.length - 1) {
      map[deptId] = Number((TOTAL_DEPT_WEIGHT - assigned).toFixed(4));
      return;
    }
    const normalized = Number(((raw * TOTAL_DEPT_WEIGHT) / RAW_DEPT_WEIGHT_TOTAL).toFixed(4));
    map[deptId] = normalized;
    assigned += normalized;
  });
  return map;
})();

function makeKpiId(deptId, name) {
  return `${deptId}_${String(name)
    .toUpperCase()
    .replace(/ /g, '_')
    .replace(/\//g, '_')
    .replace(/-/g, '_')
    .replace(/\(/g, '')
    .replace(/\)/g, '')
    .replace(/%/g, 'PCT')
    .replace(/&/g, 'AND')
    .replace(/\./g, '')
    .replace(/,/g, '')
    .replace(/\+/g, 'PLUS')
    .replace(/>/g, '')
    .replace(/</g, '')
    .replace(/=/g, '')
    .replace(/≥/g, '')
    .replace(/'/g, '')}`;
}

function getDeptMeta(deptId) {
  return catalog.departments[deptId] || null;
}

function getRawDeptWeight(deptId) {
  return getDeptMeta(deptId)?.deptWeight || 0;
}

function getDeptWeight(deptId) {
  return NORMALIZED_DEPT_WEIGHTS[deptId] || 0;
}

function getKpisForDept(deptId) {
  return catalog.kpis
    .filter((k) => k.deptId === deptId)
    .sort((a, b) => a.num - b.num);
}

function getKpiWeight(deptId) {
  return EQUAL_KPI_WEIGHT;
}

/** Department share of district TPI (indicator count ÷ 124). */
function getDeptContributionPct(deptId) {
  const count = catalog.kpis.filter((k) => k.deptId === deptId).length;
  if (!count || !TOTAL_KPI_COUNT) return 0;
  return Number(((count / TOTAL_KPI_COUNT) * 100).toFixed(2));
}

/** Equal share of district TPI for every KPI (100 ÷ 124). */
function getKpiContributionPct(deptId) {
  return EQUAL_KPI_TPI_PCT;
}

/** Within-department share (equal split unless custom weights added later). */
function getKpiShareWithinDeptPct(deptId) {
  const count = catalog.kpis.filter((k) => k.deptId === deptId).length;
  return count ? Number((100 / count).toFixed(2)) : 0;
}

function resolveScoringMode(kpi) {
  if (kpi.freq === 'Q') return 'QUARTERLY_CUMULATIVE';
  return 'BAND';
}

function buildKpiRows() {
  return catalog.kpis.map((k) => ({
    ...k,
    kpi_id: makeKpiId(k.deptId, k.name),
    weight: getKpiWeight(k.deptId),
    scoring_mode: resolveScoringMode(k)
  }));
}

const KPI_BY_ID = new Map(buildKpiRows().map((k) => [k.kpi_id, k]));

function getCatalogKpi(kpiId) {
  return KPI_BY_ID.get(kpiId) || null;
}

module.exports = {
  catalog,
  TOTAL_KPI_COUNT,
  EQUAL_KPI_TPI_PCT,
  EQUAL_KPI_WEIGHT,
  RAW_DEPT_WEIGHT_TOTAL,
  TOTAL_DEPT_WEIGHT,
  makeKpiId,
  getDeptMeta,
  getRawDeptWeight,
  getDeptWeight,
  getKpisForDept,
  getKpiWeight,
  getDeptContributionPct,
  getKpiContributionPct,
  getKpiShareWithinDeptPct,
  getCatalogKpi,
  resolveScoringMode,
  buildKpiRows
};
