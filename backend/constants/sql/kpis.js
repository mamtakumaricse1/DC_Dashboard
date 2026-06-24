/**
 * KPIs — definitions, department load, catalog sync.
 */

const SELECT_OWNED_KPIS = `
  SELECT
    kpi_id,
    name,
    unit,
    unit_label,
    target_value,
    freq,
    polarity
  FROM KPIs
  WHERE dept_id = @deptId;
`;

const LOAD_DEPT_KPIS_FOR_MONTH = `
  SELECT
    k.kpi_id,
    k.name,
    k.unit,
    COALESCE(k.unit_label, k.unit) AS unit_label,
    k.target_value,
    k.freq,
    k.polarity,
    k.kpi_num,
    pd.actual_value,
    pd.numerator_value,
    pd.denominator_value
  FROM KPIs k
  LEFT JOIN PerformanceData pd
    ON k.kpi_id = pd.kpi_id
   AND pd.entry_month = @month
   AND pd.entry_year = @year
  WHERE k.dept_id = @id
  ORDER BY COALESCE(k.kpi_num, 9999), k.name;
`;

const KPI_EXISTS = `
  SELECT 1 AS ok
  FROM KPIs
  WHERE kpi_id = @id;
`;

const INSERT_KPI_COPY = `
  INSERT INTO KPIs (
    kpi_id,
    dept_id,
    name,
    unit,
    min_value,
    max_value,
    weight,
    polarity,
    kpi_num,
    unit_label,
    target_value,
    freq,
    scoring_mode
  )
  SELECT
    @newId,
    dept_id,
    name,
    unit,
    min_value,
    max_value,
    weight,
    polarity,
    kpi_num,
    unit_label,
    target_value,
    freq,
    scoring_mode
  FROM KPIs
  WHERE kpi_id = @oldId;
`;

const REPOINT_KPI_CHILD_ROWS = `
  UPDATE PerformanceData
  SET kpi_id = @newId
  WHERE kpi_id = @oldId;

  UPDATE ActionItems
  SET kpi_id = @newId
  WHERE kpi_id = @oldId;

  IF COL_LENGTH('ReminderLog', 'kpi_id') IS NOT NULL
    UPDATE ReminderLog
    SET kpi_id = @newId
    WHERE kpi_id = @oldId;
`;

const DELETE_KPI = `
  DELETE FROM KPIs
  WHERE kpi_id = @id;
`;

const UPDATE_KPI_DEFINITION = `
  UPDATE KPIs
  SET
    name = @name,
    unit = @unit,
    unit_label = @ul,
    target_value = @tv,
    freq = @fr,
    scoring_mode = @sm,
    min_value = @min,
    max_value = @max,
    polarity = @pol
  WHERE kpi_id = @id;
`;

function bindDeptIdList(request, sqlTypes, deptIds) {
  return deptIds.map((id, i) => {
    request.input(`d${i}`, sqlTypes.VarChar(10), id);
    return `@d${i}`;
  });
}

function selectKpisByDeptsSql(placeholders) {
  return `
    SELECT kpi_id, dept_id, kpi_num, name
    FROM KPIs
    WHERE dept_id IN (${placeholders})
    ORDER BY dept_id, kpi_num;
  `;
}

module.exports = {
  SELECT_OWNED_KPIS,
  LOAD_DEPT_KPIS_FOR_MONTH,
  KPI_EXISTS,
  INSERT_KPI_COPY,
  REPOINT_KPI_CHILD_ROWS,
  DELETE_KPI,
  UPDATE_KPI_DEFINITION,
  bindDeptIdList,
  selectKpisByDeptsSql
};
