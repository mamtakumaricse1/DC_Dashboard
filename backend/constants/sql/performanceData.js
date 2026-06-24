/**
 * PerformanceData — monthly KPI actuals (value + optional numerator/denominator).
 */

const UPSERT_PERFORMANCE = `
  IF EXISTS (
    SELECT 1
    FROM PerformanceData
    WHERE kpi_id = @kid
      AND entry_month = @month
      AND entry_year = @year
  )
    UPDATE PerformanceData
    SET
      actual_value = @val,
      numerator_value = @num,
      denominator_value = @den
    WHERE kpi_id = @kid
      AND entry_month = @month
      AND entry_year = @year;
  ELSE
    INSERT INTO PerformanceData (
      kpi_id,
      actual_value,
      numerator_value,
      denominator_value,
      entry_month,
      entry_year
    )
    VALUES (@kid, @val, @num, @den, @month, @year);
`;

module.exports = { UPSERT_PERFORMANCE };
