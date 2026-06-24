# Onboarding a New District — Step-by-Step Guide

This guide covers deploying TPI for a district **other than Tirap** (e.g. Changlang, Namsai, etc.).

---

## Overview

Each district deployment needs:
1. Its own SQL Server database (or separate schema)
2. `DistrictConfig` row (name, cycle rules)
3. 14 departments (D01–D14) — same KRA framework, labels can stay or be customized
4. ~100 KPIs seeded for that district
5. User accounts (1 admin + 14 dept users)
6. `.env` with `DISTRICT_ID` and DB connection

---

## Prerequisites

| Requirement | Version |
|-------------|---------|
| Windows 10/11 or Windows Server | 64-bit |
| SQL Server Express | 2019+ (`SQLEXPRESS`) |
| Node.js | 18 LTS or 20 LTS |
| npm | 9+ |
| RAM | 4 GB minimum (8 GB recommended) |
| Disk | 2 GB free |

---

## Step 1 — Clone / copy the project

```powershell
# Copy folder to district server or laptop
D:\DistrictD   →   D:\TPI-Changlang   (example)
```

---

## Step 2 — Create database

**Option A — Full reset (new empty DB)**

```powershell
cd D:\TPI-Changlang\backend
# Edit .env: DB_NAME=TPI_Changlang
npm run db:reset
```

This runs `SQLQuery1.sql` — creates all tables.

**Option B — New database name on same SQL instance**

1. Open SQL Server Management Studio  
2. Create database `TPI_Changlang`  
3. Run `SQLQuery1.sql` against it  

---

## Step 3 — Run migrations

```powershell
cd backend
npm install
npm run db:migrate
```

Runs: `migrate-v2.js`, `migrate-v3.js`, `migrate-v4.js`  
Creates `DistrictConfig`, submission flags, etc.

---

## Step 4 — Configure district identity

### 4.1 Environment file

Copy and edit:

```powershell
copy .env.example .env
```

```env
DISTRICT_ID=changlang
JWT_SECRET=<generate-a-long-random-string>
JWT_EXPIRES_IN=8h
CORS_ORIGIN=http://localhost:3000

DB_SERVER=localhost
DB_INSTANCE=SQLEXPRESS
DB_NAME=TPI_Changlang
DB_USER=sa
DB_PASSWORD=<your-sql-password>
```

### 4.2 DistrictConfig row (SQL)

```sql
INSERT INTO DistrictConfig (
  district_id, district_name, state_name, app_title,
  submission_opens_day, submission_deadline_day, submission_deadline_hour,
  target_due_day, fiscal_year_start_month
) VALUES (
  N'changlang', N'Changlang District', N'Arunachal Pradesh', N'Changlang Performance Index',
  1, 5, 17,   -- e.g. deadline 5th of month, 5 PM
  1, 4
);
```

Adjust submission deadline and fiscal year start (April = 4) per district policy.

---

## Step 5 — Seed KPIs and departments

```powershell
npm run seed
```

Loads 100 KPIs across 14 KRAs (D01–D14) from `scripts/seed-100-kpis.js`.

**Customize KPIs (optional):**  
Edit values in SQL `KPIs` table or extend seed script for district-specific indicators.

**Customize KRA labels (optional):**  
Edit `backend/constants/kra.js` — presentation only, not in SQL.

---

## Step 6 — Create users

Default seed may include Tirap users. For new district:

```sql
-- DC admin
INSERT INTO Users (username, password, role, dept_id)
VALUES ('dc_changlang', '<bcrypt-hash-or-temp-plain>', 'ADMIN', NULL);

-- Department users (one per KRA) — use d##_shortname so dept is obvious, e.g.:
INSERT INTO Users (username, password, role, dept_id)
VALUES ('d01_health_changlang', '<hash>', 'DEPT', 'D01');
-- d02_school_education … d14_dc_office (see SQLQuery1.sql mapping table)
```

Then hash passwords:

```powershell
npm run hash-passwords
```

Or set passwords via script `scripts/hash-users.js`.

---

## Step 7 — Demo / test data (optional)

```powershell
npm run seed:demo
```

Creates sample submissions, RED targets, deviations for demo meetings.

---

## Step 8 — Start application

**Terminal 1 — API**

```powershell
cd backend
node server.js
# Expect: TPI API running on port 3001
# Expect: DB connected (TPI_Changlang)
```

**Terminal 2 — UI**

```powershell
cd frontend
npm install
npm start
# Opens http://localhost:3000
```

---

## Step 9 — Verify onboarding

| Check | How |
|-------|-----|
| Login | `dc_changlang` / password → `/admindashboard` |
| District name | Header shows "Changlang District" |
| 14 KRAs | Command Center heatmap shows 14 tiles |
| Dept login | `health_changlang` → `/deptdashboard` |
| Submit lock | Dept can only enter **previous month** |
| Export | CSV + HTML download works |

---

## Step 10 — Production hardening

1. Change all default passwords  
2. Strong `JWT_SECRET`  
3. SQL Server: dedicated login (not `sa` if possible)  
4. Firewall: allow 3000/3001 only on district LAN  
5. Backup: schedule `.bak` of database monthly  
6. Document HoD usernames and distribute securely  

---

## Multi-district on one server (advanced)

| Approach | Description |
|----------|-------------|
| **Separate DB per district** | Recommended — one `TPI_Tirap`, one `TPI_Changlang`, separate `.env` + backend instance per district |
| **Separate ports** | Tirap API :3001, Changlang API :3002, each with own `DISTRICT_ID` |
| **Same codebase** | Copy `backend/.env` per instance; frontend points to correct API URL |

`DISTRICT_ID` in `.env` must match `DistrictConfig.district_id` in that database.

---

## Customization checklist per district

- [ ] District name, state, app title (`DistrictConfig`)
- [ ] Submission deadline day/time
- [ ] Target due day
- [ ] Fiscal year start month
- [ ] KPI actual min/max bands (if local targets differ)
- [ ] HoD usernames and department mapping
- [ ] DC admin account

---

## Support contacts / files

| Topic | File |
|-------|------|
| DC user guide | `docs/01_DC_User_Guide.md` |
| Technical flow | `docs/02_Technical_Flow.md` |
| Local LAN setup | `docs/04_Local_Deployment_Without_Cloud.md` |
| Full schema | `SQLQuery1.sql` |
| KRA metadata | `backend/constants/kra.js` |
