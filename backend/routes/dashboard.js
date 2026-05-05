const express = require('express');
const router = express.Router();

const { getPool, sql } = require('../db');

// ✅ SCORE (0–100)
const calcScore = (actual, min, max, polarity) => {
  if (actual === null || actual === undefined) return 0;
  if (max === min) return 0;

  let score =
    polarity === 'HIGHER'
      ? ((actual - min) / (max - min)) * 100
      : ((max - actual) / (max - min)) * 100;

  return Math.max(0, Math.min(100, score));
};

// ✅ CATEGORY
const getCategory = (score) => {
  if (score >= 85) return "Achiever";
  if (score >= 65) return "Performer";
  if (score >= 40) return "Aspirant";
  return "Laggard";
};

// ✅ TREND CALCULATION (current month vs previous 3 months average)
const getTrend = (monthlyScores) => {
  const months = Object.keys(monthlyScores).sort().reverse();

  // Need at least current month + previous 3 months
  if (months.length < 4) return "FLAT";

  const current = Number(monthlyScores[months[0]] || 0);
  const previous3 = months.slice(1, 4).map((m) => Number(monthlyScores[m] || 0));
  const avgPrevious3 =
    previous3.reduce((acc, val) => acc + val, 0) / previous3.length;

  // 1-point deadband to avoid noisy flips
  if (current > avgPrevious3 + 1) return "UP";
  if (current < avgPrevious3 - 1) return "DOWN";
  return "FLAT";
};

// =====================================================
// ✅ DASHBOARD SUMMARY WITH TREND
// =====================================================
router.get('/summary', async (req, res) => {
  try {
    const db = await getPool();

    // 🔥 FETCH LAST 6 MONTHS DATA
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

        pd.actual_value,
        pd.entry_month,
        pd.entry_year

      FROM Departments d
      JOIN KPIs k ON d.dept_id = k.dept_id

      LEFT JOIN PerformanceData pd 
        ON k.kpi_id = pd.kpi_id
    `);

    const rows = result.recordset;

    // ============================================
    // STEP 1: GROUP + MONTH-WISE STORAGE
    // ============================================
    const departments = {};

    rows.forEach(r => {
      if (!departments[r.dept_id]) {
        departments[r.dept_id] = {
          name: r.dept_name,
          weight: Number(r.dept_weight),
          monthly: {}, // 🔥 KEY CHANGE
          kpis: []
        };
      }

      // Skip rows that have no submitted period/value yet
      if (
        r.entry_year === null ||
        r.entry_month === null ||
        r.actual_value === null ||
        r.kpi_weight === null
      ) {
        return;
      }

      const monthKey = `${r.entry_year}-${String(r.entry_month).padStart(2, "0")}`;

      if (!departments[r.dept_id].monthly[monthKey]) {
        departments[r.dept_id].monthly[monthKey] = {
          score: 0,
          weight: 0
        };
      }

      const score = calcScore(
        r.actual_value,
        r.min_value,
        r.max_value,
        r.polarity
      );

      // KPI for tooltip (only current month ideally)
      const now = new Date();
      if (
        r.entry_month === now.getMonth() + 1 &&
        r.entry_year === now.getFullYear()
      ) {
        departments[r.dept_id].kpis.push({
          name: r.kpi_name,
          value: Number(score.toFixed(2))
        });
      }

      const kpiWeight = Number(r.kpi_weight);
      departments[r.dept_id].monthly[monthKey].score += score * kpiWeight;
      departments[r.dept_id].monthly[monthKey].weight += kpiWeight;
    });

    // ============================================
    // STEP 2: CALCULATE FINAL SCORE + TREND
    // ============================================
    let districtPI = 0;
    let totalDeptWeight = 0;

    const deptArray = Object.entries(departments).map(([id, d]) => {

      // Normalize each month
      const monthlyScores = {};

      Object.entries(d.monthly).forEach(([m, val]) => {
        monthlyScores[m] =
          val.weight > 0 ? val.score / val.weight : 0;
      });

      const months = Object.keys(monthlyScores).sort().reverse();
      const latestScore = monthlyScores[months[0]] || 0;

      const trend = getTrend(monthlyScores);

      const score = Number(latestScore.toFixed(2));
      const category = getCategory(score);

      districtPI += score * d.weight;
      totalDeptWeight += d.weight;

      return {
        id,
        name: d.name,
        score,
        category,
        trend, // 🔥 NEW
        kpis: d.kpis
      };
    });

    // ============================================
    // STEP 3: DISTRICT SCORE NORMALIZATION
    // ============================================
    if (totalDeptWeight > 0) {
      districtPI = districtPI / totalDeptWeight;
    }

    districtPI = Number(districtPI.toFixed(2));

    // ============================================
    // STEP 4: SORT
    // ============================================
    deptArray.sort((a, b) => b.score - a.score);

    const top3 = deptArray.slice(0, 3);
    const bottom3 = deptArray.slice(-3).reverse();

    // ============================================
    // FINAL RESPONSE
    // ============================================
    res.json({
      districtPI,
      departments: deptArray, // ✅ NOW ARRAY (better)
      top3,
      bottom3
    });

  } catch (err) {
    console.error("🔥 Dashboard Error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;