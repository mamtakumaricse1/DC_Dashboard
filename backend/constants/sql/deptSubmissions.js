/**
 * DeptMonthlySubmissions — department monthly submit stamp.
 */

const SELECT_DEPT_SUBMISSION = `
  IF OBJECT_ID('DeptMonthlySubmissions', 'U') IS NOT NULL
    SELECT submitted_at, updated_at, submitted_by, is_late
    FROM DeptMonthlySubmissions
    WHERE dept_id = @dept
      AND month_key = @mk;
  ELSE
    SELECT CAST(NULL AS DATETIME2) AS submitted_at
    WHERE 1 = 0;
`;

const SELECT_SUBMISSION_TIMESTAMP = `
  SELECT submitted_at
  FROM DeptMonthlySubmissions
  WHERE dept_id = @dept
    AND month_key = @mk;
`;

const UPSERT_DEPT_SUBMISSION = `
  IF OBJECT_ID('DeptMonthlySubmissions', 'U') IS NOT NULL
  BEGIN
    IF EXISTS (
      SELECT 1
      FROM DeptMonthlySubmissions
      WHERE dept_id = @dept
        AND month_key = @mk
    )
      UPDATE DeptMonthlySubmissions
      SET
        updated_at = SYSDATETIME(),
        submitted_by = COALESCE(@uid, submitted_by),
        is_late = @late
      WHERE dept_id = @dept
        AND month_key = @mk;
    ELSE
      INSERT INTO DeptMonthlySubmissions (
        dept_id,
        month_key,
        submitted_by,
        submitted_at,
        updated_at,
        is_late
      )
      VALUES (@dept, @mk, @uid, SYSDATETIME(), SYSDATETIME(), @late);
  END
`;

module.exports = {
  SELECT_DEPT_SUBMISSION,
  SELECT_SUBMISSION_TIMESTAMP,
  UPSERT_DEPT_SUBMISSION
};
