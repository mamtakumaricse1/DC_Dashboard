/**
 * Reporting months and submission tracker queries.
 */

const SELECT_REPORTING_MONTH_KEYS = `
  IF OBJECT_ID('ReportingMonths', 'U') IS NOT NULL
    SELECT month_key
    FROM ReportingMonths
    ORDER BY sort_order;
  ELSE
    SELECT CAST(NULL AS CHAR(7)) AS month_key
    WHERE 1 = 0;
`;

const SELECT_PERFORMANCE_MONTH_KEYS = `
  SELECT DISTINCT
    CONCAT(entry_year, '-', RIGHT('0' + CAST(entry_month AS VARCHAR(2)), 2)) AS month_key
  FROM PerformanceData
  WHERE entry_year IS NOT NULL
    AND entry_month IS NOT NULL;
`;

const ENSURE_REPORTING_MONTH = `
  IF OBJECT_ID('ReportingMonths', 'U') IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM ReportingMonths WHERE month_key = @key)
  BEGIN
    DECLARE @sort INT = (SELECT ISNULL(MAX(sort_order), 0) + 1 FROM ReportingMonths);
    INSERT INTO ReportingMonths (month_key, month_num, year_num, month_name, sort_order)
    VALUES (@key, @m, @y, @label, @sort);
  END
`;

const SELECT_SUBMISSION_TRACKER = `
  SELECT
    d.dept_id,
    d.name AS dept_name,
    s.submitted_at,
    s.updated_at,
    s.is_late
  FROM Departments d
  LEFT JOIN DeptMonthlySubmissions s
    ON d.dept_id = s.dept_id
   AND s.month_key = @mk
  ORDER BY d.dept_id;
`;

const INSERT_REMINDER_LOG = `
  IF OBJECT_ID('ReminderLog', 'U') IS NOT NULL
    INSERT INTO ReminderLog (
      action_id,
      dept_id,
      kpi_id,
      owner_name,
      owner_phone,
      channel,
      message,
      reminded_by
    )
    VALUES (@aid, @dept, @kid, @name, @phone, @ch, @msg, @uid);
`;

module.exports = {
  SELECT_REPORTING_MONTH_KEYS,
  SELECT_PERFORMANCE_MONTH_KEYS,
  ENSURE_REPORTING_MONTH,
  SELECT_SUBMISSION_TRACKER,
  INSERT_REMINDER_LOG
};
