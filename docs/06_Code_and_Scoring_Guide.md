# TPI — Code, Scoring, KPIs, Targets & Reminders

Complete developer and DC reference for how the Tirap Performance Index works.

---

## 1. Architecture (file map)

```
frontend/src/
  pages/AdminDashboard.js      — DC shell, tabs, month picker, save targets
  pages/DeptDashboard.js       — HoD data entry + submit
  components/DcCommandCenter.js — Home tab (alerts, heatmap, RED list)
  components/actionTracker/    — Target forms (split components)
  components/commandCenter/    — Command Center panels (split)
  constants/tpi.js             — RAG thresholds, UI labels
  constants/deptContacts.js    — HoD phones for reminders
  utils/api.js                 — All HTTP calls to backend

backend/
  server.js                    — Express entry, mounts routes
  routes/dashboard.js          — GET summary, PATCH action-items, contacts, remind
  routes/dept.js               — HoD KPI load + POST submit
  services/scoringService.js   — calcKpiScore, getRagStatus
  services/quarterlyTargetService.js — quarterly count scoring
  services/dashboardAggregator.js — Builds full dashboard JSON
  services/dcHomeService.js    — Submission tracker, alerts, top RED
  utils/reportingCycle.js      — Month rules, deadlines, due dates
  utils/actionItems.js         — ActionItems CRUD + prior review
  utils/deptSubmissions.js     — Submission timestamps + is_late
  constants/kra.js             — 14 KRA labels, owners, RAG thresholds
  constants/kpiMeta.js         — Unit + polarity inference per KPI name
  scripts/seed-100-kpis.js     — Master KPI list (100 seeded)
```

---

## 2. How KPI score is calculated

### Step 1 — HoD enters ACTUAL (raw value)

Department user enters numbers in **Dept Dashboard** → saved to `PerformanceData.actual_value`.

This is **not** the score. Examples:
- `48` = 48% PHC functionality
- `2` = 2 schools with functional toilets this month
- `5` = 5 grievance days held

### Step 2 — Normalize to performance score (0–100)

`backend/services/scoringService.js` → `calcKpiScore(actual, min, max, polarity)`

| Polarity | Formula | Use when |
|----------|---------|----------|
| **HIGHER** | `(actual - min) / (max - min) × 100` | More is better (coverage %, pass rate) |
| **Lower is better** | `(max - actual) / (max - min) × 100` | Less is better (deaths, backlog, outage hours) |

Result is clamped to 0–100.

### Step 3 — RAG colour

`getRagStatus(score)` using `constants/kra.js`:

| Status | Score |
|--------|-------|
| GREEN | ≥ 90 |
| YELLOW | 70 – 89 |
| RED | < 70 |

RED KPIs automatically appear in **Action Tracker**.

### Step 4 — KRA score (department tile)

Weighted average of all KPI scores in that department for the month:

```
KRA score = Σ(kpiScore × weight) / Σ(weight)
```

Default weight = 1 per KPI.

### Step 5 — District TPI (gauge)

```
TPI = Σ(all KPI scores × weight) / Σ(all weights)
```

Across all ~100 KPIs district-wide.

### Quarterly target scoring (special case)

When DC sets **Target type = Quarterly count** on a RED indicator:

```
score = (sum of monthly actuals in quarter so far) / DC target count × 100
```

Example: target 10 toilets/quarter, months Apr+May actuals = 2+3 = 5 → score = 50%

Implemented in `quarterlyTargetService.js`.

---

## 3. All 100 KPIs (seeded)

Source: `backend/scripts/seed-100-kpis.js`. Count per department in `DEPT_CAPS`.

### D01 — Health (10)
1. PHC Functionality Score
2. Institutional Delivery Rate
3. Full Immunisation Coverage
4. eSanjeevani Tele-OPD Consults per active SC
5. ANC 4 Visits Completed
6. Ayushman Card Coverage in Priority Villages
7. Drug Stock-out Days at PHCs
8. OST Active Patients
9. De-addiction Centre Treatment Retention (3-month)
10. TB Case Notification Rate

### D02 — Education (8)
1. Teacher Attendance Rate
2. Student Attendance Rate (Classes 1-8)
3. FLN Reading Proficiency Class 3
4. FLN Numeracy Proficiency Class 3
5. Schools with Functional Toilets
6. Schools with Drinking Water
7. Class 10 Board Pass Rate
8. Class 12 Board Pass Rate

### D03 — ICDS (5)
1. AWC Functionality Score
2. Children 0-6 Registered in ICDS MIS
3. AWCs Running Daily Pre-school Activity
4. Saksham AWC Upgrade Status
5. Take-Home Ration Distribution Coverage

### D04 — Social Justice (6)
1. New Patients Inducted into De-addiction Programme
2. Recovered Users Placed in Skilling/Employment
3. Peer Counsellors Active
4. School-Based Drug Awareness Sessions
5. Sports Tournaments at Circle Level
6. Football League Registered Teams

### D05 — Sanitation (5)
1. ODF-Plus Villages Declared & Sustained
2. Khonsa Town Door-to-Door Waste Collection Coverage
3. Public Toilets Functional
4. Swachh Tirap Awards Participating Villages
5. Waste Segregation at Source

### D06 — Infrastructure (9)
1. PWD Road Condition (dry season)
2. PWD Road Condition (monsoon)
3. PMGSY Projects On-Schedule
4. JJM Tap Connections Functional
5. Villages with 24x7 Power
6. Mobile Network Coverage (4G)
7. Bridges/Culverts Damaged & Awaiting Repair
8. Power Outage Hours
9. Villages Connected by All-Weather Road

### D07 — Power (7)
1. Average Daily Power Supply Hours
2. Total Unscheduled Outage Hours
3. Villages with Functional 11kV/LT Connectivity
4. Households with Metered Connection
5. New Service Connection - Mean Days Application to Energization
6. Billing Efficiency
7. Distribution Transformer Failure Rate

### D08 — Police (9)
1. FIR Registration Compliance
2. Case Disposal Rate
3. NDPS Seizure-to-Treatment Referral Ratio
4. Crimes Against Women (FIRs)
5. CAW Conviction Rate
6. Police Public Grievance Days Held
7. Excise/Opium Field Destruction
8. Communal/Tribal Tension Incidents
9. Night Patrolling Coverage

### D09 — Agriculture (6)
1. Farmer Field Demonstration Plots Active
2. FPOs Active with >100 Members
3. KCC Coverage of Farmers
4. PM-Kisan Beneficiaries Receiving Installment
5. Soil Health Cards Distributed
6. Agarwood Saplings Distributed

### D10 — Convergence (7)
1. Saturation Villages Where Camp Held
2. Aadhaar Saturation in Priority Villages
3. Jan Dhan Account Coverage
4. Ration Card Backlog
5. PMAY-G Houses Sanctioned vs Completed
6. NSAP Pension Disbursement
7. DANGUA District Plan Activities On-Schedule

### D11 — Revenue (6)
1. Land Mutation Cases Disposed Within 30 Days
2. Land Records Digitisation Coverage
3. Pending Court Cases Involving District
4. Public Hearing Days Held
5. Revenue Court Cases Disposed
6. RTI Replies Disposed Within 30 Days

### D12 — Jan Suvidha (12)
1. ST Certificate Issued Within 15 Days
2. PRC Issued Within 15 Days
3. TRC Issued Within 15 Days
4. Government ID Card Issued Within 15 Days
5. ILP Issued Within 7 Days
6. Driving Licence - Forwarded to DTO Within 3 Days
7. Driving Licence - Applications Received
8. Driving Licence - Pending Forwarding (>3 days)
9. Vehicle Registration - Forwarded Within 3 Days
10. Vehicle Registration - Applications Received
11. Vehicle Registration - Pending Forwarding (>3 days)
12. Citizen Satisfaction with Jan Suvidha

### D13 — Disaster (5)
1. Disaster Preparedness Drills Conducted
2. Pre-Monsoon Stocking at PHCs/Schools
3. Villages with Documented DRR Plans
4. Relief Reached Within 7 Days
5. Early Warning System Coverage

### D14 — DC Office / Grievance (5)
1. DC Field Days Completed
2. SDO Field Days (avg per SDO)
3. Officer Tour Diaries Submitted On-Time
4. GB 360 Feedback Forms Received (quarterly)
5. Grievances Registered (PGRS-DARPAN + WhatsApp)

*Note: KPI_MASTER has additional indicators beyond DEPT_CAPS; only the counts above are seeded by default.*

---

## 4. How to set a target (DC workflow)

1. Open **Action Tracker** tab (or drill down from a RED department).
2. Expand a RED indicator row.
3. Fill in:
   - **Action owner** — responsible officer
   - **Target type**:
     - *Monthly score* — goal performance score (e.g. 70)
     - *Quarterly count* — cumulative count target (e.g. 10 toilets)
   - **Due date** — leave empty for auto 1st of next month
   - **Action plan** — DC commitment text
4. Click **Save target**.

### Backend path

```
AdminDashboard.saveActionItem()
  → api.js updateActionItem()
  → PATCH /api/dashboard/action-items/:id
  → actionItems.updateActionItem()
  → ActionItems table
```

### Target types in database

| target_type | Fields set | Scoring impact |
|-------------|------------|----------------|
| `SCORE` | `target_score`, `target_date` | Deviation = actual_score − target_score at review |
| `QUARTERLY` | `target_actual`, `target_quarter` | KPI score = cumulative actual ÷ target × 100 |

---

## 5. How reminders work

### Client-side (current UI)

`OwnerContactMenu` component on:
- Top RED indicators table
- Action Tracker save footer
- KPI drill-down modal
- Target follow-up panel

Uses `deptContacts.js` + `kra.js` for phone/email.

Actions:
- **Call** — `tel:+91...`
- **WhatsApp** — `wa.me` with pre-filled reminder text
- **Email** — `mailto:` with subject/body
- **Copy reminder** — clipboard

Reminder message template (`buildReminderMessage`):
> TPI reminder: "{indicator}" is RED and needs action. Please submit/update monthly data and action plan. — DC Office

### Server-side (optional log)

`POST /api/dashboard/remind` — logs to `ReminderLog` table. Frontend can wire this later.

### Full contacts directory

**Contacts** sidebar tab → `AdminContactsPanel.js` + `GET /api/dashboard/contacts`.

---

## 6. Reporting cycle (months & deadlines)

| Role | Can enter/view |
|------|----------------|
| HoD | **Previous calendar month only** (e.g. in June → May data) |
| DC default view | Same previous month for performance review |
| Submission window | 1st of current month → deadline (default **11 PM** on 1st) |
| Late | `submitted_at` after deadline |

Files: `utils/reportingCycle.js`, `DistrictConfig` table.

---

## 7. API quick reference

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/dashboard/summary?month=&year=` | Full dashboard + dcHome |
| PATCH | `/api/dashboard/action-items/:id` | Save DC target |
| GET | `/api/dashboard/contacts` | HoD directory |
| POST | `/api/dashboard/remind` | Log reminder (optional) |
| POST | `/api/dept/submit` | HoD monthly submit |

---

## 8. Component split (maintainability)

Recent refactor — import from these instead of monolithic files:

```
components/actionTracker/
  ActionAccordion.js
  ActionTrackerCurrentItem.js
  ActionTrackerPriorItem.js
  DeptActionReadOnlyItem.js

components/commandCenter/
  AlertCard.js
  PendingSubmissionsPanel.js
  RedDepartmentsPanel.js
  OverdueTargetsPanel.js
  TopRedIndicatorsTable.js

hooks/useAccordionState.js
```

`ActionTrackerTables.js` re-exports for backward compatibility.
