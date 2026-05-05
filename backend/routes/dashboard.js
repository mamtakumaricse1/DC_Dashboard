const express = require('express');
const router = express.Router();

const { getPool, sql } = require('../db');

// ✅ SCORE CALCULATION (0–100 NORMALIZED)
const calcScore = (actual, min, max, polarity) => {
  if (actual === null || actual === undefined) return 0;
  if (max === min) return 0;

  let score =
    polarity === 'HIGHER'
      ? ((actual - min) / (max - min)) * 100
      : ((max - actual) / (max - min)) * 100;

  // ✅ Clamp between 0–100
  return Math.max(0, Math.min(100, score));
};

// ✅ CATEGORY
const getCategory = (score) => {
  if (score >= 85) return "Achiever";
  if (score >= 65) return "Performer";
  if (score >= 40) return "Aspirant";
  return "Laggard";
};

// =====================================================
// ✅ DASHBOARD SUMMARY API
// =====================================================
router.get('/summary', async (req, res) => {
  try {
    const db = await getPool();

    // 🔥 CURRENT MONTH (CAN UPGRADE TO AVG LATER)
    const result = await db.request().query(`
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

        pd.actual_value

      FROM Departments d
      JOIN KPIs k ON d.dept_id = k.dept_id

      LEFT JOIN PerformanceData pd 
        ON k.kpi_id = pd.kpi_id 
        AND pd.entry_month = MONTH(GETDATE())
        AND pd.entry_year = YEAR(GETDATE())
    `);

    const rows = result.recordset;

    // ============================================
    // STEP 1: GROUP BY DEPARTMENT
    // ============================================
    const departments = {};

    rows.forEach(r => {
      if (!departments[r.dept_id]) {
        departments[r.dept_id] = {
          name: r.dept_name,
          weight: Number(r.dept_weight),
          score: 0,
          totalWeight: 0,
          kpis: []
        };
      }

      // ✅ KPI SCORE
      const score = calcScore(
        r.actual_value,
        r.min_value,
        r.max_value,
        r.polarity
      );

      // ✅ STORE KPI (for tooltip)
      departments[r.dept_id].kpis.push({
        name: r.kpi_name,
        value: Number(score.toFixed(2))
      });

      // ✅ WEIGHTED SUM
      departments[r.dept_id].score += score * r.kpi_weight;
      departments[r.dept_id].totalWeight += r.kpi_weight;
    });

    // ============================================
    // STEP 2: NORMALIZE DEPARTMENT SCORE
    // ============================================
    Object.values(departments).forEach(d => {
      if (d.totalWeight > 0) {
        d.score = d.score / d.totalWeight;
      }

      d.score = Number(d.score.toFixed(2));
      d.category = getCategory(d.score);
    });

    // ============================================
    // STEP 3: DISTRICT SCORE (FIXED)
    // ============================================
    let districtPI = 0;
    let totalDeptWeight = 0;

    Object.values(departments).forEach(d => {
      districtPI += d.score * d.weight;
      totalDeptWeight += d.weight;
    });

    if (totalDeptWeight > 0) {
      districtPI = districtPI / totalDeptWeight;
    }

    districtPI = Number(districtPI.toFixed(2));

    // ============================================
    // STEP 4: SORT + RANKING
    // ============================================
    const deptArray = Object.entries(departments).map(([id, d]) => ({
      id,
      ...d
    }));

    deptArray.sort((a, b) => b.score - a.score);

    const top3 = deptArray.slice(0, 3);
    const bottom3 = deptArray.slice(-3).reverse();

    // ============================================
    // FINAL RESPONSE
    // ============================================
    res.json({
      districtPI,
      departments,   // object (used by frontend)
      top3,
      bottom3
    });

  } catch (err) {
    console.error("🔥 Dashboard Error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;