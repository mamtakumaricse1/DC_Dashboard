# Tirap Performance Index — Technical Flow Document

**Stack:** React 19 (port 3000) + Express 5 (port 3001) + SQL Server  
**Auth:** bcrypt passwords + JWT Bearer tokens  

---

## 1. System architecture

```
┌─────────────────┐     HTTPS/HTTP      ┌─────────────────┐     SQL      ┌──────────────┐
│  React Frontend │ ◄─────────────────► │  Express API    │ ◄──────────► │  SQL Server  │
│  localhost:3000 │   JWT in header     │  localhost:3001 │              │  DistrictDB  │
└─────────────────┘                     └─────────────────┘              └──────────────┘
```

| Layer | Path | Role |
|-------|------|------|
| Frontend | `frontend/src/` | UI, routing, API client |
| Backend routes | `backend/routes/` | HTTP only — thin handlers |
| Services | `backend/services/` | Scoring, aggregation, export, DC home |
| Utils | `backend/utils/` | Reporting cycle, submissions, action items |
| Constants | `backend/constants/` | KRA metadata (D01–D14), SQL queries |
| Database | `SQLQuery1.sql` + migrations v2–v4 | Schema + seed |

---

## 2. URL routing (frontend)

| Path | Component | Role |
|------|-----------|------|
| `/login` | `Login.js` | Authentication |
| `/admindashboard` | `AdminDashboard.js` | DC home (Command Center) |
| `/admindashboard/history` | History tab | 6-month trends |
| `/admindashboard/overview` | KRA heatmap + table | |
| `/deptdashboard/action-tracker` | `DeptDashboard.js` | HoD portal |

Routing: `react-router-dom` v6 in `App.js`.  
Session: JWT + user JSON in `localStorage` (`tpi_token`, `tpi_user`).

---

## 3. Authentication flow

### 3.1 Login

```
User → POST /api/auth/login { username, password }
     → DB: SELECT from Users
     → verifyPassword(plain, stored)
     → jwt.sign({ user_id, username, role, dept_id })
     → { token, user }
     → Frontend: localStorage + redirect to /admindashboard or /deptdashboard
```

**File:** `backend/routes/auth.js`, `backend/utils/password.js`

### 3.2 Password hashing

| Item | Detail |
|------|--------|
| Library | `bcryptjs` |
| Salt rounds | 10 |
| Hash format | `$2a$` / `$2b$` prefix |
| Verify | `bcrypt.compare(plain, hash)` |
| Legacy | Plain-text passwords still accepted until migrated |
| Migrate | `npm run hash-passwords` → `scripts/hash-users.js` |

```javascript
// password.js
hashPassword(plain)  → bcrypt.hash(plain, 10)
verifyPassword(plain, stored) → bcrypt.compare OR plain match (legacy)
```

### 3.3 JWT token

| Item | Detail |
|------|--------|
| Library | `jsonwebtoken` |
| Secret | `JWT_SECRET` in `.env` (default dev secret — **change in production**) |
| Expiry | `JWT_EXPIRES_IN` default `8h` |
| Payload | `{ user_id, username, role, dept_id }` |
| Transport | `Authorization: Bearer <token>` on every API call |
| Validation | `middleware/auth.js` → `jwt.verify()` → `req.user` |
| Refresh | `GET /api/auth/me` on app load |
| 401 | Frontend clears session → redirect login |

### 3.4 Role enforcement

| Middleware | Rule |
|------------|------|
| `authenticate` | All `/api/dashboard/*` and `/api/dept/*` |
| `requireAdmin` | KPI drill-down, export, action-item PATCH |
| `requireDeptAccess` | Dept user only own `dept_id` |

---

## 4. API reference

### Auth (`/api/auth`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/login` | No | Returns JWT + user profile |
| GET | `/me` | Yes | Validate token, return user |

### Dashboard (`/api/dashboard`) — all require JWT

| Method | Endpoint | Admin only | Description |
|--------|----------|------------|-------------|
| GET | `/config` | No | District config + reporting cycle |
| GET | `/summary?month=&year=` | No | Full dashboard payload + `dcHome` |
| GET | `/history?months=3\|6` | No | Multi-month dept series for charts |
| GET | `/dept/:deptId/kpis?month=&year=` | Yes | All KPIs for KRA drill-down modal |
| GET | `/export/review?month=&year=&format=csv\|html` | Yes | Monthly review pack download |
| PATCH | `/action-items/:id` | Yes | Save DC target / review remarks |

### Department (`/api/dept`) — all require JWT

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/context` | Dept user context |
| GET | `/kpis/:id` | KPI list + submission status (dept access) |
| POST | `/submit` | Submit previous month actuals only |

---

## 5. Dashboard summary flow (`GET /summary`)

```
1. Load SQL rows (KPIs × departments × months) — DASHBOARD_ROWS_SQL
2. Load monthsAvailable, DistrictConfig
3. resolveSelectedMonthKey() — DC default = previous calendar month
4. accumulatePerformanceRow() per dept:
      actual → calcKpiScore() → getRagStatus()
      KRA score = weighted average of KPI scores
5. syncAndLoadActionItems() — RED indicators → ActionItems table
6. loadPriorCommitments() — open targets from earlier months
7. buildDcHomePayload():
      - submissionTracker (14 depts × status)
      - targetFollowUp (due/overdue this period)
      - alerts (counts for sidebar badges)
      - redDepartments, topRedIndicators
8. Return JSON to frontend
```

**Files:** `dashboardAggregator.js`, `dcHomeService.js`, `scoringService.js`

---

## 6. Scoring engine

```
Actual value → calcKpiScore(min, max, polarity) → 0–100
             → getRagStatus(score):
                  ≥ 90 GREEN
                  ≥ 70 YELLOW
                  < 70 RED
KRA score = Σ(kpiScore × weight) / Σ(weight)
District TPI = average across all KPIs
```

**File:** `backend/services/scoringService.js`, thresholds in `constants/kra.js`

---

## 7. Reporting cycle flow

**File:** `backend/utils/reportingCycle.js`, config in `DistrictConfig` table

| Rule | Implementation |
|------|----------------|
| Active reporting month | `getActiveReportingMonth()` = previous calendar month |
| Dept submit lock | `deptSubmissionLocked: true` — only that month in UI |
| Submission window | Opens 1st current month, deadline configurable |
| DC default view | Previous month |
| Target due | Default 1st of next month (district-configurable) |
| Target follow-up scores | Current month actuals vs stored target |

---

## 8. PDF / Excel export flow

**Trigger:** Frontend `downloadReviewExport(monthKey, format)`  
**Endpoint:** `GET /api/dashboard/export/review?month=5&year=2026&format=csv|html`

```
1. requireAdmin — JWT verified
2. buildDashboardSummary(db, month, year, 'ADMIN') — full payload
3. format === 'csv':
      buildReviewCsv(payload) → UTF-8 BOM + CSV text
      Content-Disposition: attachment; filename="TPI-Review-May-2026.csv"
4. format === 'html' (labeled "PDF Report" in UI):
      buildReviewHtml(payload) → standalone HTML with inline CSS
      Includes: TPI summary, submissions, KRA table, target follow-up
      <script>window.onload = () => window.print()</script>
      User: browser Print → Save as PDF
```

**Note:** There is no server-side PDF library (no Puppeteer/wkhtmltopdf). PDF is **print-to-PDF** from generated HTML.

**Files:** `exportService.js`, `routes/dashboard.js`, `frontend/utils/api.js`

---

## 9. DC Home (`dcHome` payload)

Built inside every `/summary` response:

```javascript
dcHome: {
  reportingMonth,        // active submission month
  followUpMonth,         // current month for target check
  alerts: {
    unsubmittedCount, overdueTargetsCount, redDeptCount,
    lateSubmissionCount, submittedCount, totalDepartments
  },
  submissionTracker: [{ deptId, deptName, status, statusLabel, isLate, ... }],
  targetFollowUp: [...],
  redDepartments: [...],
  topRedIndicators: [...]
}
```

**File:** `dcHomeService.js`

---

## 10. History chart flow (`GET /history`)

```
1. Load all performance rows from SQL
2. monthKeys = last N months from ReportingMonths table
3. Per department: build series [{ month, score, trend }]
4. Frontend: grouped bar chart — 14 colours × N months
5. Fallback if API fails: parallel /summary calls per month
```

**Files:** `dashboardAggregator.js` → `buildHistoryPayload`, `AdminHistoryPanel.js`

---

## 11. Department submission flow

```
1. HoD logs in → /deptdashboard
2. GET /api/dept/kpis/:id — KPIs + locked reporting month
3. HoD enters actual values
4. POST /api/dept/submit { dept_id, month_key, values[] }
5. Validate: month_key MUST equal getActiveReportingMonth()
6. Upsert KPIValues + DeptMonthlySubmissions
7. is_late flag if after deadline (DistrictConfig)
8. DC sees updated submissionTracker on next /summary load
```

**Files:** `routes/dept.js`, `utils/deptSubmissions.js`

---

## 12. Action item / target flow

```
RED KPI detected in month M
  → ActionItems row created (origin_month_key = M)
  → DC sets target_score, target_date, action_plan (PATCH)
  → Next month: loadPriorCommitments() + loadTargetFollowUp()
  → deviation = actual_score - target_score
  → dueStatus: ON_TRACK | DUE_TODAY | OVERDUE | MET | MISSED
```

**Files:** `utils/actionItems.js`, `ActionItems` table

---

## 13. Database tables (main)

| Table | Purpose |
|-------|---------|
| `Users` | Login, role (ADMIN/DEPT), dept_id |
| `Departments` | D01–D14 |
| `KPIs` | 100 indicators, min/max, polarity |
| `KPIValues` | Monthly actuals per dept |
| `DeptMonthlySubmissions` | Submit timestamp, is_late |
| `ActionItems` | DC targets, plans, review status |
| `ReportingMonths` | Available months for dropdowns/history |
| `DistrictConfig` | Per-district name, cycle rules, fiscal year |

---

## 14. Frontend data flow

```
App.js boot → validateSession() → /api/auth/me
AdminDashboard → fetchDashboardSummary(month) → set state
  → DistrictHero (gauge)
  → DcCommandCenter (dcHome)
  → Tabs swap panels
KraDrillDownModal → fetchDeptKpiDetail(deptId, month)
Export → downloadReviewExport → blob download
```

**API client:** `frontend/src/utils/api.js` — all calls use `fetchWithAuth()`

---

## 15. Security checklist (production)

- [ ] Change `JWT_SECRET` to long random string  
- [ ] Run `npm run hash-passwords`  
- [ ] Change default `admin` / dept passwords  
- [ ] Restrict SQL Server to LAN IP  
- [ ] Use HTTPS if exposed beyond localhost  
- [ ] Set `CORS_ORIGIN` to actual frontend URL  

---

## 16. Key file map

| Feature | Backend | Frontend |
|---------|---------|----------|
| Login / JWT | `routes/auth.js`, `middleware/auth.js` | `utils/api.js`, `Login.js` |
| Command Center | `dcHomeService.js` | `DcCommandCenter.js` |
| Heatmap | `dashboardAggregator.js` | `KraHeatmapGrid.js` |
| TPI gauge | `scoringService.js` | `TpiGauge.js` |
| Export | `exportService.js` | `AdminDashboard.js` toolbar |
| History | `buildHistoryPayload` | `AdminHistoryPanel.js` |
| Action tracker | `actionItems.js` | `ActionTrackerGrouped.js` |
| Reporting cycle | `reportingCycle.js` | locked month in `DeptDashboard` |
