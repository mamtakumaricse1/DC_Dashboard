/**
 * Department KPI load for the data-submission screen.
 */
const { sql } = require('../db');
const { LOAD_DEPT_KPIS_FOR_MONTH } = require('../constants/sql');
const { getDeptSubmission } = require('../utils/deptSubmissions');
const { loadDistrictConfig, toPublicDistrictConfig } = require('../utils/districtConfig');
const { buildReportingCycleInfo, mergeCycleConfig } = require('../utils/reportingCycle');
const { enrichKpiWithEntrySpec } = require('../utils/kpiEntrySpec');

async function loadDeptKpisForSubmission(db, deptId) {
  const districtRow = await loadDistrictConfig(db);
  const cycle = mergeCycleConfig(districtRow);
  const reportingCycle = buildReportingCycleInfo(cycle, new Date());
  const activeMonth = reportingCycle.activeReportingMonth;
  const [year, month] = activeMonth.split('-').map(Number);

  const [kpiResult, submission] = await Promise.all([
    db.request()
      .input('id', sql.VarChar, deptId)
      .input('month', sql.Int, month)
      .input('year', sql.Int, year)
      .query(LOAD_DEPT_KPIS_FOR_MONTH),
    getDeptSubmission(db, deptId, year, month, districtRow)
  ]);

  return {
    kpis: kpiResult.recordset.map((row) => enrichKpiWithEntrySpec(row)),
    submission,
    reportingCycle,
    district: toPublicDistrictConfig(districtRow),
    activeReportingMonth: activeMonth
  };
}

module.exports = { loadDeptKpisForSubmission, KPI_LOAD_SQL: LOAD_DEPT_KPIS_FOR_MONTH };
