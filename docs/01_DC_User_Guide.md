# Tirap Performance Index (TPI) — DC Briefing Guide

**Audience:** District Commissioner and review meeting  
**URL (admin):** `http://localhost:3000/admindashboard`  
**Login:** `admin` / `admin123` (change before production)

---

## 1. What this system does (one sentence)

TPI is a **monthly district performance cockpit** — it shows who is underperforming (RED), who has not filed data, which DC targets are overdue, and lets you set follow-up actions and export a review pack for meetings.

---

## 2. Reporting cycle (important for DC)

| Who | What month | When |
|-----|------------|------|
| **Departments (HoDs)** | Enter **previous calendar month** only | From 1st of current month until deadline (default: 1st, 11:00 PM) |
| **DC (you)** | Review **previous month** performance by default | Any time after departments submit |
| **Target follow-up** | Checks if commitments were met | Uses **current month** scores automatically — no manual month switch |

**Example (today = June 2026):**  
- Departments submit **May 2026** data in June.  
- DC dashboard opens on **May 2026** by default.  
- Target follow-up checks June scores against prior commitments.

---

## 3. Sidebar — what each tab is for

| Tab | Purpose | Daily use |
|-----|---------|-----------|
| **Command Center** | Home screen — RED departments, pending submissions, overdue targets | **Start here every morning** |
| **Submissions** | 14 departments × submitted / pending / late | Before review meeting — who has not filed |
| **Target Follow-up** | Open DC commitments due or overdue | Track if HoDs met promised scores |
| **KRA Overview** | Heatmap + detailed table of all 14 KRAs | Monthly review, ranking discussion |
| **Action Tracker** | Set targets for new RED indicators; review old commitments | After identifying RED KPIs |
| **History** | Last 3 or 6 months trend — all departments, different colours | Quarterly / half-yearly review |

**Badges on sidebar:** numbers show pending submissions, overdue targets, or open action items.

---

## 4. Command Center — how to use (5 minutes)

### Top section
- **TPI gauge** — district score 0–100 (green ≥90, yellow 70–89, red &lt;70).
- **KRA heatmap** — 14 tiles, colour = performance. **Click any tile** → all KPIs with actual vs target.

### Alert cards (clickable)
1. **Pending submissions** → opens Submissions tab  
2. **Overdue targets** → opens Target Follow-up  
3. **Departments with RED** → opens KRA Overview  
4. **Submitted on time** → submission progress (e.g. 12/14)

### Three panels
- **Who hasn’t submitted?** — pending departments for active reporting month  
- **Who is RED?** — click department → KPI drill-down  
- **Overdue / due targets** — top items; “Open full follow-up” for complete list  

---

## 5. Submissions tab

Table: all 14 departments with status:
- **Submitted on time** (green)
- **Submitted late** (red)
- **Pending** (amber)

Use before DC conference: *“X departments have not filed May data.”*

---

## 6. Target Follow-up tab

- Lists commitments where DC set a **target score** and **due date**.
- **Deviation** = actual score − target (current month checked automatically).
- Expand a row → update **completion status** and **DC remarks** → Save review.

Statuses: PENDING, IN_PROGRESS, PARTIAL, COMPLETED, MISSED.

---

## 7. KRA Overview

- **Heatmap** — visual snapshot of all 14 KRAs.  
- **Table** — rank, score, G/Y/R counts, trend.  
- **Click KRA name** → modal with every KPI, actual value, score, DC target, deviation.

---

## 8. Action Tracker

Grouped **by department** (less scrolling).

### Section A — New RED indicators (this month)
For each RED KPI:
1. Expand department group → expand indicator  
2. Set **action owner**, **target score**, **due date**, **action plan**  
3. **Save target** — appears in Target Follow-up when due  

### Section B — Prior commitments
Review whether last month’s targets were met; save completion status and remarks.

---

## 9. History tab

- Toggle **Last 3 months** or **Last 6 months**.
- **Grouped bar chart** — each department has its own colour across months.
- Click department in table or legend → monthly trend for that KRA.
- Use for: *“Is Health improving over 6 months?”*

---

## 10. Export for meetings (toolbar)

Available on most tabs:

| Button | Output | Use |
|--------|--------|-----|
| **Excel (CSV)** | `TPI-Review-May-2026.csv` | Edit in Excel, share with secy |
| **PDF Report** | HTML file → browser **Print → Save as PDF** | Monthly review pack |

CSV/HTML includes: district TPI, submissions, KRA scores, target follow-up, RED indicators.

---

## 11. Department portal (for HoDs)

**URL:** `http://localhost:3000/deptdashboard`  
**Example HoD logins:** `d08_police` / `123`, `d01_health_nhm` / `123` (username starts with dept code, e.g. `d07_power_discom` = D07 DISCOM)

HoDs can:
- Enter KPI actuals for **locked reporting month only**
- Submit once per month (update allowed until deadline)
- View DC targets and action plans (read-only)

---

## 12. Suggested DC daily / monthly routine

### Daily (2 min)
1. Open **Command Center**  
2. Check pending submissions badge  
3. Check overdue targets badge  

### Weekly review (15 min)
1. Submissions tab — chase pending HoDs  
2. Who is RED — drill into worst KRAs  
3. Action Tracker — ensure every RED has a target and owner  

### Monthly review meeting (30 min)
1. Export **PDF Report** + **Excel**  
2. History — 6-month trends  
3. Target Follow-up — mark COMPLETED / MISSED  
4. Set new targets for this month’s RED indicators  

---

## 13. RAG rules (same everywhere)

| Status | Score | Meaning |
|--------|-------|---------|
| **GREEN** | ≥ 90 | On track |
| **YELLOW** | 70 – 89 | Watch |
| **RED** | &lt; 70 | Mandatory action plan |

---

## 14. Talking points for tomorrow’s demo

1. *“One screen tells me who is RED, who hasn’t submitted, and what targets are overdue.”*  
2. *“I don’t chase 14 departments blindly — submission tracker shows filed / pending / late.”*  
3. *“When I set a target last month, follow-up checks this month automatically.”*  
4. *“One click on any KRA shows all KPIs — not just the worst one.”*  
5. *“I can export the monthly pack for the conference in Excel or PDF.”*  
6. *“History shows 6 months for all departments in one chart for policy review.”*  

---

## 15. Before the meeting — checklist

- [ ] SQL Server running  
- [ ] Backend: `cd backend && node server.js`  
- [ ] Frontend: `cd frontend && npm start`  
- [ ] Open `http://localhost:3000/admindashboard`  
- [ ] Login as `admin`  
- [ ] Optional: run `npm run seed:demo` for sample RED/submission data  
