/**
 * Dashboard — department × KPI × performance rows.
 */

const DASHBOARD_ROWS_SELECT = `
  SELECT
    d.dept_id,
    d.name AS dept_name,
    d.weight AS dept_weight,
    k.kpi_id,
    k.name AS kpi_name,
    k.min_value,
    k.max_value,
    k.weight AS kpi_weight,
    k.polarity,
    k.unit,
    k.unit_label,
    k.target_value,
    k.freq,
    k.kpi_num,
    k.scoring_mode,
    pd.actual_value,
    pd.entry_month,
    pd.entry_year
  FROM Departments d
  JOIN KPIs k ON d.dept_id = k.dept_id
  LEFT JOIN PerformanceData pd ON k.kpi_id = pd.kpi_id
`;

const DASHBOARD_ROWS_DEPT_FILTER = `
  WHERE d.dept_id = @deptId
`;

module.exports = {
  DASHBOARD_ROWS_SELECT,
  DASHBOARD_ROWS_DEPT_FILTER
};
