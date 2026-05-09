const express = require('express');
const router = express.Router();

const { getPool, sql } = require('../db');

// GET KPIs
router.get('/kpis/:id', async (req, res) => {
  try {
    const db = await getPool();

    const result = await db.request()
      .input('id', sql.VarChar, req.params.id)
      .query(`
        SELECT k.kpi_id, k.name, k.unit, pd.actual_value
        FROM KPIs k
        LEFT JOIN PerformanceData pd 
        ON k.kpi_id = pd.kpi_id 
        AND pd.entry_month = MONTH(GETDATE())
        AND pd.entry_year = YEAR(GETDATE())
        WHERE k.dept_id = @id
      `);

    res.json(result.recordset);

  } catch (err) {
    res.status(500).send(err.message);
  }
});

// SUBMIT DATA
router.post('/submit', async (req, res) => {
  try {
    const db = await getPool();

    for (let e of req.body.entries) {
      await db.request()
        .input('kid', sql.VarChar, e.kpi_id)
        .input('val', sql.Float, e.actual_value)
        .query(`
          IF EXISTS (
            SELECT 1 FROM PerformanceData 
            WHERE kpi_id=@kid 
            AND entry_month=MONTH(GETDATE()) 
            AND entry_year=YEAR(GETDATE())
          )
            UPDATE PerformanceData 
            SET actual_value=@val 
            WHERE kpi_id=@kid 
            AND entry_month=MONTH(GETDATE()) 
            AND entry_year=YEAR(GETDATE())
          ELSE
            INSERT INTO PerformanceData(kpi_id, actual_value, entry_month, entry_year)
            VALUES(@kid, @val, MONTH(GETDATE()), YEAR(GETDATE()))
        `);
    }

    res.send("Saved Successfully");

  } catch (err) {
    res.status(500).send(err.message);
  }
});

module.exports = router;