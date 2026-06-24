/**
 * ActionItems — RED tracker, DC targets, prior commitments.
 */

const ACTION_ITEM_COLUMNS = `
  action_id,
  dept_id,
  kpi_id,
  month_key,
  indicator_name,
  indicator_score,
  status,
  action_owner,
  target_date,
  action_plan,
  target_score,
  target_type,
  target_actual,
  target_quarter,
  completion_status,
  actual_score,
  deviation,
  review_month,
  dc_remarks
`;

const UPSERT_RED_ACTION_ITEM = `
  IF OBJECT_ID('ActionItems', 'U') IS NOT NULL
  BEGIN
    IF NOT EXISTS (
      SELECT 1
      FROM ActionItems
      WHERE kpi_id = @kid
        AND month_key = @mk
    )
      INSERT INTO ActionItems (
        dept_id,
        kpi_id,
        month_key,
        indicator_name,
        indicator_score,
        status,
        action_owner,
        completion_status
      )
      VALUES (@dept, @kid, @mk, @name, @score, 'RED', @owner, 'PENDING');
    ELSE
      UPDATE ActionItems
      SET
        indicator_name = @name,
        indicator_score = @score,
        updated_at = SYSDATETIME()
      WHERE kpi_id = @kid
        AND month_key = @mk;
  END
`;

const SELECT_RED_ACTION_ITEMS_BY_MONTH = `
  IF OBJECT_ID('ActionItems', 'U') IS NOT NULL
    SELECT ${ACTION_ITEM_COLUMNS}
    FROM ActionItems
    WHERE month_key = @mk
      AND status = 'RED';
  ELSE
    SELECT CAST(NULL AS INT) AS action_id
    WHERE 1 = 0;
`;

const SELECT_PRIOR_OPEN_COMMITMENTS = `
  IF OBJECT_ID('ActionItems', 'U') IS NOT NULL
    SELECT ${ACTION_ITEM_COLUMNS}
    FROM ActionItems
    WHERE month_key < @mk
      AND completion_status IN ('PENDING', 'PARTIAL', 'IN_PROGRESS', 'MISSED')
    ORDER BY month_key DESC, dept_id;
  ELSE
    SELECT CAST(NULL AS INT) AS action_id
    WHERE 1 = 0;
`;

const UPDATE_ACTION_REVIEW_SCORE = `
  UPDATE ActionItems
  SET
    actual_score = @actual,
    deviation = @dev,
    review_month = @rm,
    updated_at = SYSDATETIME()
  WHERE action_id = @id;
`;

const MARK_ACTION_MISSED = `
  UPDATE ActionItems
  SET
    completion_status = 'MISSED',
    updated_at = SYSDATETIME()
  WHERE action_id = @id
    AND completion_status IN ('PENDING', 'IN_PROGRESS');
`;

const UPDATE_ACTION_ITEM = `
  UPDATE ActionItems
  SET
    action_owner = COALESCE(@owner, action_owner),
    target_date = COALESCE(@target, target_date),
    action_plan = COALESCE(@plan, action_plan),
    target_score = COALESCE(@tscore, target_score),
    target_type = COALESCE(@ttype, target_type),
    target_actual = COALESCE(@tactual, target_actual),
    target_quarter = COALESCE(@tquarter, target_quarter),
    completion_status = COALESCE(@cstatus, completion_status),
    actual_score = COALESCE(@actual, actual_score),
    deviation = COALESCE(@dev, deviation),
    review_month = COALESCE(@rm, review_month),
    dc_remarks = COALESCE(@remarks, dc_remarks),
    updated_at = SYSDATETIME()
  OUTPUT INSERTED.*
  WHERE action_id = @id;
`;

const UPDATE_ACTION_DEVIATION = `
  UPDATE ActionItems
  SET deviation = @dev
  WHERE action_id = @id;
`;

const SELECT_ACTION_MONTH_KEY = `
  SELECT month_key
  FROM ActionItems
  WHERE action_id = @id;
`;

const SELECT_QUARTERLY_TARGETS = `
  IF COL_LENGTH('ActionItems', 'target_type') IS NOT NULL
    SELECT kpi_id, target_type, target_actual, target_quarter
    FROM ActionItems
    WHERE target_type = 'QUARTERLY'
      AND target_actual IS NOT NULL;
  ELSE
    SELECT CAST(NULL AS VARCHAR(400)) AS kpi_id
    WHERE 1 = 0;
`;

const SELECT_DC_SCORE_TARGETS = `
  IF COL_LENGTH('ActionItems', 'target_score') IS NOT NULL
    SELECT
      kpi_id,
      month_key,
      target_score,
      target_type,
      review_month,
      completion_status
    FROM ActionItems
    WHERE target_score IS NOT NULL
      AND (target_type IS NULL OR target_type = 'SCORE');
  ELSE
    SELECT CAST(NULL AS VARCHAR(400)) AS kpi_id
    WHERE 1 = 0;
`;

const SELECT_ACTION_TARGETS_BY_MONTH = `
  SELECT
    kpi_id,
    target_score,
    target_type,
    target_actual,
    target_quarter,
    target_date,
    action_plan,
    completion_status
  FROM ActionItems
  WHERE month_key = @mk;
`;

const SELECT_ALL_OPEN_ACTION_ITEMS = `
  IF OBJECT_ID('ActionItems', 'U') IS NOT NULL
    SELECT ${ACTION_ITEM_COLUMNS}
    FROM ActionItems
    WHERE completion_status IN ('PENDING', 'PARTIAL', 'IN_PROGRESS', 'MISSED')
    ORDER BY target_date ASC, month_key DESC;
  ELSE
    SELECT CAST(NULL AS INT) AS action_id
    WHERE 1 = 0;
`;

module.exports = {
  ACTION_ITEM_COLUMNS,
  UPSERT_RED_ACTION_ITEM,
  SELECT_RED_ACTION_ITEMS_BY_MONTH,
  SELECT_PRIOR_OPEN_COMMITMENTS,
  UPDATE_ACTION_REVIEW_SCORE,
  MARK_ACTION_MISSED,
  UPDATE_ACTION_ITEM,
  UPDATE_ACTION_DEVIATION,
  SELECT_ACTION_MONTH_KEY,
  SELECT_QUARTERLY_TARGETS,
  SELECT_DC_SCORE_TARGETS,
  SELECT_ACTION_TARGETS_BY_MONTH,
  SELECT_ALL_OPEN_ACTION_ITEMS
};
