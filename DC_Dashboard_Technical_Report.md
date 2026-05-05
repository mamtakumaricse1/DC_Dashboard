# District Performance Dashboard - Technical Report

## 1) Data model and table usage

### `Departments`
- Stores master list of departments.
- Key fields:
  - `dept_id` (PK)
  - `name`
  - `weight` (used in district composite score)

### `KPIs`
- Stores KPI definitions per department.
- Key fields:
  - `kpi_id` (PK)
  - `dept_id` (FK -> `Departments.dept_id`)
  - `min_value`, `max_value`
  - `weight` (KPI contribution within department score)
  - `polarity` (`HIGHER` or `LOWER`)

### `PerformanceData`
- Stores time-series KPI actual values month-wise.
- Key fields:
  - `id` (PK)
  - `kpi_id` (FK -> `KPIs.kpi_id`)
  - `actual_value`
  - `entry_month`, `entry_year`
- Unique constraint:
  - `(kpi_id, entry_month, entry_year)` to prevent duplicates per month.

### `Users`
- Authentication/role mapping.
- Not used in score calculation directly.

## 2) Main query and joins

Dashboard summary route (`backend/routes/dashboard.js`) fetches joined data:

- `Departments d`
- `JOIN KPIs k ON d.dept_id = k.dept_id`
- `LEFT JOIN PerformanceData pd ON k.kpi_id = pd.kpi_id`

Reason:
- `JOIN` with KPIs ensures each department KPI definition is available.
- `LEFT JOIN` on performance data preserves KPI definitions even if monthly data is missing.

Rows with missing `entry_month`, `entry_year`, `actual_value`, or `kpi_weight` are skipped from scoring.

## 3) KPI normalization logic

Function: `calcScore(actual, min, max, polarity)`

- Guard clauses:
  - if `actual` null -> score `0`
  - if `max == min` -> score `0`

- For `HIGHER`:
  - `((actual - min) / (max - min)) * 100`

- For `LOWER`:
  - `((max - actual) / (max - min)) * 100`

- Final clamp:
  - bounded to `[0, 100]`

## 4) Department monthly score construction

For each department and month (`YYYY-MM`):

- Maintain:
  - `monthly[monthKey].score += normalizedKpiScore * kpiWeight`
  - `monthly[monthKey].weight += kpiWeight`

Monthly department score:

- `deptMonthlyScore = score / weight` (if weight > 0, else 0)

## 5) Current month score used in UI

For each department:

- Attempt `currentMonthKey = YYYY-MM` of runtime date.
- If current month exists, use that score.
- Otherwise fallback to latest available month score.

This score is used in:
- Top 3 / Bottom 3
- Bar chart
- Table score

## 6) Trend and sparkline logic

### Sparkline
- `trendSeries` takes last 3 available monthly department scores.
- Ordered old -> new for plotting.

### Trend
Function: `getTrend(monthlyScores)`

- If 4+ months:
  - current vs average of previous 3 months
- If exactly 3 months:
  - current vs average of previous 2 months
- If <3 months:
  - `FLAT`

Threshold (deadband):
- `UP` if current > previousAvg + 1
- `DOWN` if current < previousAvg - 1
- else `FLAT`

## 7) Category bands

Function: `getCategory(score)`

- `Achiever`: `>= 85`
- `Performer`: `>= 65 and < 85`
- `Aspirant`: `>= 40 and < 65`
- `Laggard`: `< 40`

## 8) District composite score

District score is computed as weighted average of department current-month scores:

- `districtPI = sum(deptScore * deptWeight) / sum(deptWeight)`

Rounded to 2 decimals before API response.

## 9) API response structure (`/api/dashboard/summary`)

- `districtPI`
- `departments[]`:
  - `id`, `name`
  - `score` (current month)
  - `category`
  - `trend`
  - `trendSeries` (last 3 points)
  - `kpis` (current month KPI breakdown for tooltip)
- `top3` (score-desc first 3)
- `bottom3` (lowest 3, reversed for rank display)

## 10) SQL seeding intent (`SQLQuery1.sql`)

Seed script creates:
- 10 departments
- 5 KPIs per department (50 total)
- 6 months KPI performance data (to support trend + sparkline)

Important:
- Seed data is for demo spread and visualization.
- Once live departmental entries are captured, calculations use actual entries from `PerformanceData`.
