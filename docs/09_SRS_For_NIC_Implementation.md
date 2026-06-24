# Software Requirements Specification (SRS)

## Tirap Performance Index (TPI) — District Performance Monitoring System

**For development, deployment, and support by National Informatics Centre (NIC)**

| Field | Detail |
|-------|--------|
| **Document ID** | SRS-TPI-NIC-001 |
| **Version** | 1.0 |
| **Date** | 8 June 2026 |
| **Prepared by** | District Administration, Tirap District, Arunachal Pradesh |
| **Prepared for** | District Informatics Officer (DIO), NIC — Tirap / Arunachal Pradesh State Centre |
| **Reference** | Letter No. TIRAP/DC/IT/2026/\_\_\_ dated \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_ 2026 |
| **Status** | Submitted for NIC technical review and implementation |

---

## Document control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 08-06-2026 | District Administration (Tirap) | Initial SRS for NIC implementation |

**Distribution**

| Copy | Recipient |
|------|-----------|
| 1 | District Commissioner, Tirap |
| 2 | District Informatics Officer, NIC |
| 3 | State Informatics Officer, NIC Arunachal Pradesh |
| 4 | NIC Implementation / Development Team |
| 5 | 14 KRA Nodal Officers (for UAT) |

---

## Table of contents

1. [Introduction](#1-introduction)  
2. [Overall description](#2-overall-description)  
3. [User classes](#3-user-classes)  
4. [Functional requirements](#4-functional-requirements)  
5. [Non-functional requirements](#5-non-functional-requirements)  
6. [System architecture](#6-system-architecture)  
7. [Data model summary](#7-data-model-summary)  
8. [API summary](#8-api-summary)  
9. [Reporting cycle and business rules](#9-reporting-cycle-and-business-rules)  
10. [NIC deliverables and project phases](#10-nic-deliverables-and-project-phases)  
11. [Security and compliance](#11-security-and-compliance)  
12. [Acceptance criteria and sign-off](#12-acceptance-criteria-and-sign-off)  
13. [Appendices](#13-appendices)  

---

## 1. Introduction

### 1.1 Purpose

This SRS defines the **complete software requirements** for the **Tirap Performance Index (TPI)** system to be **developed, deployed, and maintained by NIC** on behalf of the District Administration, Tirap District.

The document is the **technical baseline** for:

- NIC project estimation and work order  
- System design, development, and testing  
- User Acceptance Testing (UAT) with DC office and departments  
- Go-live and post-implementation support  

### 1.2 Scope

**In scope**

- Web-based district performance dashboard for DC and 14 KRA nodal officers  
- Monthly collection of **124 KPI** actual values with units and targets  
- Automatic scoring, RAG classification, and District TPI computation  
- DC Command Center, submission tracking, action/target follow-up  
- History trends, exports, dynamic KPI guides, HoD contact directory  
- Deployment on district LAN or NIC/state data centre  
- Multi-district configuration capability (one database per district)  

**Out of scope (Phase 1)**

- Native mobile applications (iOS/Android)  
- Automated SMS / WhatsApp push notifications (manual Call/WhatsApp links acceptable)  
- Real-time integration with external state/national portals  
- Automatic pull from department MIS — **manual entry only** in Phase 1  
- State-level rollup dashboard above district  

### 1.3 Definitions

| Term | Definition |
|------|------------|
| **DC** | District Commissioner |
| **DIO** | District Informatics Officer, NIC |
| **HoD / DEPT user** | KRA nodal officer — one login per department |
| **KRA** | Key Result Area — departmental performance domain (14 in Tirap) |
| **KPI** | Key Performance Indicator — measurable item under a KRA (124 in Tirap) |
| **TPI** | Tirap Performance Index — composite district performance score (0–100) |
| **RAG** | Red–Amber–Green status from score bands |
| **Reporting month** | Calendar month for which performance is measured (typically previous month) |
| **Action item** | DC commitment (target, due date, plan) for a RED KPI |

### 1.4 References

| Ref | Document |
|-----|----------|
| R1 | District letter to DIO NIC — `docs/08_Letter_District_Administration_to_DIO_NIC.md` |
| R2 | Tirap Performance Index workbook (Excel) — official KPI master |
| R3 | `docs/04_Local_Deployment_Without_Cloud.md` — deployment modes |
| R4 | `docs/07_KPI_Weights_and_Contribution.md` — weights and indicator list |
| R5 | Database schema — `SQLQuery1.sql` and migration scripts |

---

## 2. Overall description

### 2.1 Problem statement

District monthly review requires consolidation of performance from 14 departments across 124 indicators. Without a unified system, the DC office faces delayed submissions, inconsistent formats, and difficulty tracking commitments on underperforming areas.

### 2.2 Product functions (summary)

| # | Function | Primary user |
|---|----------|--------------|
| F1 | Secure role-based login (ADMIN / DEPT) | All |
| F2 | Monthly KPI data entry with unit labels and targets | HoD |
| F3 | Automatic KPI scoring and RAG (Green ≥90, Yellow 70–89, Red &lt;70) | System |
| F4 | District TPI and 14-KRA heatmap | DC |
| F5 | Command Center — workflow guide, alerts, “Who is RED?” | DC |
| F6 | Submission tracker (on-time / late / pending) | DC |
| F7 | Action Tracker — set targets for new RED KPIs | DC |
| F8 | Target Follow-up — review prior DC commitments | DC |
| F9 | KRA drill-down — all KPIs with actual, score, DC target | DC |
| F10 | History — 3/6 month trends | DC |
| F11 | Export monthly review pack (CSV + PDF-ready HTML) | DC |
| F12 | Dynamic KPI Guide per department (from database) | HoD |
| F13 | Contacts directory — Call / WhatsApp / Email for reminders | DC |
| F14 | Quarterly cumulative KPI scoring where applicable | System |

### 2.3 Operating environment

| Component | Requirement |
|-----------|-------------|
| Client | Chrome / Edge / Firefox (latest 2 versions); min. 1280×720 |
| Server OS | Windows Server 2019+ or Linux (NIC standard) |
| Database | Microsoft SQL Server 2019+ (Express acceptable for pilot) |
| Application runtime | Node.js 18 LTS or 20 LTS |
| Web server | IIS reverse proxy or NIC-approved stack |
| Network | District LAN; HTTPS recommended if beyond localhost |

### 2.4 Constraints

| ID | Constraint |
|----|------------|
| CON-01 | Data must reside in SQL Server under district/NIC control |
| CON-02 | DEPT users access **only their own** department data |
| CON-03 | Departments submit **only** the designated reporting month |
| CON-04 | Passwords stored hashed (bcrypt); JWT for sessions |
| CON-05 | KPI catalog changes must reflect in guides **without code redeploy** (database-driven) |
| CON-06 | Department weights for TPI must sum to **100** (normalised) |

---

## 3. User classes

| Class | Role | Count | Access |
|-------|------|-------|--------|
| District Commissioner / DC office | ADMIN | 1–5 | Full district dashboard, exports, targets |
| KRA Nodal Officer | DEPT | 14 | Own department — submit data, view KPI guide & DC targets |
| NIC / DIO | IT (server) | — | Deploy, backup, DB admin — not app super-user in v1 |

**URLs**

| Role | Base path |
|------|-----------|
| ADMIN | `/admindashboard` (+ tabs: submissions, target-followup, overview, action-tracker, contacts, history) |
| DEPT | `/deptdashboard` (+ data-submission, action-tracker) |

---

## 4. Functional requirements

Requirements use IDs **`FR-<area>-<nn>`**. Priority: **Must** / **Should**.

### 4.1 Authentication (FR-AUTH)

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-AUTH-01 | Login page with username/password | Must |
| FR-AUTH-02 | Issue JWT on success; validate on all protected APIs | Must |
| FR-AUTH-03 | Redirect ADMIN → admin dashboard; DEPT → dept dashboard | Must |
| FR-AUTH-04 | Session persists on refresh until expiry/logout | Must |
| FR-AUTH-05 | DEPT denied access to other departments (403) | Must |
| FR-AUTH-06 | Configurable JWT secret and expiry via environment | Must |

### 4.2 Reporting cycle (FR-CYCLE)

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-CYCLE-01 | Active reporting month = **previous calendar month** | Must |
| FR-CYCLE-02 | Submission window opens 1st of current month (configurable) | Must |
| FR-CYCLE-03 | Deadline configurable in DistrictConfig (default: day 1, hour 23) | Must |
| FR-CYCLE-04 | DEPT portal locked to active reporting month only | Must |
| FR-CYCLE-05 | Late submissions flagged (`is_late`) | Must |
| FR-CYCLE-06 | DC default review month = reporting month | Must |

### 4.3 Department portal (FR-DEPT)

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-DEPT-01 | List all KPIs with unit label, target, frequency | Must |
| FR-DEPT-02 | Enter actual values and submit monthly batch | Must |
| FR-DEPT-03 | Show department score and G/Y/R counts | Must |
| FR-DEPT-04 | Read-only view of DC action items for department | Must |
| FR-DEPT-05 | **KPI Guide** modal — loaded from API/DB (units, targets, entry hints) | Must |
| FR-DEPT-06 | Resubmit before deadline allowed | Should |

### 4.4 Scoring (FR-SCORE)

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-SCORE-01 | KPI score 0–100 from actual, min, max, polarity (HIGHER/LOWER) | Must |
| FR-SCORE-02 | RAG: Green ≥90, Yellow 70–89, Red &lt;70 | Must |
| FR-SCORE-03 | KRA score = weighted average of KPI scores in department | Must |
| FR-SCORE-04 | District TPI = Σ(KRA score × dept weight) ÷ 100 | Must |
| FR-SCORE-05 | Quarterly KPIs: cumulative actual ÷ quarterly target × 100 | Must |

### 4.5 DC Command Center (FR-DC)

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-DC-01 | District TPI gauge and KPI status counts | Must |
| FR-DC-02 | KRA heatmap (count of departments dynamic) | Must |
| FR-DC-03 | Workflow guide with **dynamic** badge counts (pending, RED depts, new REDs, overdue) | Must |
| FR-DC-04 | “Who is RED?” list with drill-down to KPI modal | Must |
| FR-DC-05 | Pending submissions and overdue targets panels | Must |
| FR-DC-06 | Top RED indicators table with Contacts menu | Must |
| FR-DC-07 | Guide steps scroll to relevant section (e.g. RED list) | Should |

### 4.6 Submission tracker (FR-SUB)

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-SUB-01 | All departments — status: Pending / On time / Late | Must |
| FR-SUB-02 | Submission timestamp displayed | Must |
| FR-SUB-03 | Sidebar badge = unsubmitted count | Must |

### 4.7 Action tracker & target follow-up (FR-ACT / FR-TGT)

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-ACT-01 | List new RED indicators for review month | Must |
| FR-ACT-02 | DC sets owner, target type (monthly score OR quarterly count), due date, plan | Must |
| FR-ACT-03 | Group by department; accordion UI | Should |
| FR-ACT-04 | Contacts dropdown (portal overlay, not clipped by UI) | Must |
| FR-TGT-01 | Follow-up prior commitments vs current month actual | Must |
| FR-TGT-02 | Deviation, due status (ON_TRACK, OVERDUE, MET, MISSED, etc.) | Must |
| FR-TGT-03 | DC updates completion status and remarks | Must |

### 4.8 Overview, history, export (FR-KRA / FR-HIST / FR-EXP)

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-KRA-01 | Ranked KRA table + heatmap + drill-down modal | Must |
| FR-HIST-01 | 3- and 6-month history charts | Must |
| FR-EXP-01 | CSV export (Excel-compatible) | Must |
| FR-EXP-02 | HTML report for Print → PDF | Must |

### 4.9 Configuration (FR-CFG)

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-CFG-01 | DistrictConfig: name, state, app title, deadline, fiscal year | Must |
| FR-CFG-02 | KPI master in database: name, unit, unit_label, target_value, freq, weight, polarity | Must |
| FR-CFG-03 | Department weights in database; normalised to TPI total 100 | Must |
| FR-CFG-04 | Seed/migration scripts for KPI catalog updates | Must |

---

## 5. Non-functional requirements

| ID | Category | Requirement | Priority |
|----|----------|-------------|----------|
| NFR-01 | Performance | Dashboard summary &lt; 10 s on LAN (124 KPIs, 14 depts) | Should |
| NFR-02 | Security | HTTPS in production; CORS restricted to frontend origin | Must |
| NFR-03 | Security | No default JWT secret in production | Must |
| NFR-04 | Availability | Office hours operation when DB + API running | Must |
| NFR-05 | Backup | Daily SQL Server backup (NIC standard) | Must |
| NFR-06 | Maintainability | KPI changes via DB seed/admin without frontend rebuild | Must |
| NFR-07 | Usability | Consistent RAG colours; plain-language empty states | Must |
| NFR-08 | Portability | Runs on Windows LAN without mandatory cloud | Must |
| NFR-09 | Audit | Submission timestamps and action item updates persisted | Must |
| NFR-10 | Locale | Dates in Indian format (en-IN) | Should |

---

## 6. System architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌──────────────────┐
│  HoD browsers   │     │  DC browsers    │     │  NIC admin       │
│  (14 depts)     │     │  (DC office)    │     │  (server/DB)     │
└────────┬────────┘     └────────┬────────┘     └────────┬─────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │ HTTP(S)
                                 ▼
                    ┌────────────────────────┐
                    │  Web UI (React)        │
                    │  Port 3000 / IIS       │
                    └────────────┬───────────┘
                                 │ REST JSON + JWT
                                 ▼
                    ┌────────────────────────┐
                    │  API (Node.js/Express) │
                    │  Port 3001             │
                    └────────────┬───────────┘
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │  Microsoft SQL Server  │
                    │  (DistrictDB)          │
                    └────────────────────────┘
```

**Deployment modes (NIC to confirm)**

| Mode | Description |
|------|-------------|
| A | Localhost on DC laptop (pilot/demo) |
| B | District LAN server — HoDs access via IP |
| C | NIC/state data centre with VPN or secure access |

---

## 7. Data model summary

| Table | Purpose |
|-------|---------|
| `DistrictConfig` | District name, submission deadline, branding |
| `Departments` | 14 KRAs, weights |
| `KPIs` | 124 indicators — unit, target, freq, polarity, weight |
| `Users` | ADMIN and DEPT logins (dept_id for DEPT) |
| `PerformanceData` | Monthly actual values per KPI |
| `DeptMonthlySubmissions` | Submit audit (timestamp, is_late) |
| `ActionItems` | DC targets, plans, review status |
| `ReportingMonths` | Available months for UI/history |
| `ReminderLog` | Optional audit of DC reminders |

---

## 8. API summary

| Method | Endpoint | Role | Purpose |
|--------|----------|------|---------|
| POST | `/api/auth/login` | Public | Authenticate |
| GET | `/api/dashboard/summary` | Auth | Full DC dashboard payload |
| GET | `/api/dashboard/dept/:id/kpis` | ADMIN | KRA drill-down |
| PATCH | `/api/dashboard/action-items/:id` | ADMIN | Save DC target/review |
| GET | `/api/dashboard/export/review` | ADMIN | CSV/HTML export |
| GET | `/api/dashboard/history` | Auth | Trend data |
| GET | `/api/dashboard/contacts` | ADMIN | HoD directory |
| GET | `/api/dept/kpis/:id` | DEPT | KPI list for entry |
| GET | `/api/dept/kpi-guide/:id` | DEPT/ADMIN | **Dynamic KPI guide** |
| POST | `/api/dept/submit` | DEPT | Submit monthly data |

---

## 9. Reporting cycle and business rules

| Rule | Description |
|------|-------------|
| BR-01 | Reporting month = previous calendar month (never hardcoded) |
| BR-02 | DEPT cannot submit current or future month |
| BR-03 | RED KPI (score &lt; 70) appears in Action Tracker |
| BR-04 | Target due default = 1st of next month if DC leaves blank |
| BR-05 | Quarterly KPI: monthly entries summed within fiscal quarter |
| BR-06 | TPI weights: workbook raw weights normalised to total **100** |
| BR-07 | KPI Guide reads live from `KPIs` + `Departments` tables |

---

## 10. NIC deliverables and project phases

### Phase 1 — Review and planning (2 weeks)

- SRS sign-off with DC and DIO  
- Infrastructure selection (Mode B or C)  
- Security review checklist  

### Phase 2 — Development / adoption (4–6 weeks)

- Deploy prototype or re-implement per NIC standards  
- Load 124 KPI master from approved workbook  
- Create 14 DEPT + 1–3 ADMIN users  
- Configure DistrictConfig and reporting cycle  

### Phase 3 — UAT (2 weeks)

- DC office UAT per Section 12  
- 14 department submission test (one cycle)  
- Export and history verification  

### Phase 4 — Go-live and handover (1 week)

- Production deployment  
- User training (DC + nodal officers)  
- Backup schedule documented  
- Warranty support period (recommended: 3 months)  

### NIC deliverables checklist

- [ ] Hosted application URL(s) on district/state infrastructure  
- [ ] SQL Server database with backup procedure  
- [ ] Admin and department user accounts  
- [ ] Deployment and operations manual  
- [ ] Source code repository (per NIC policy)  
- [ ] UAT sign-off sheet  
- [ ] Training attendance record  

---

## 11. Security and compliance

| Area | Requirement |
|------|-------------|
| Authentication | JWT; bcrypt password hashing (≥10 rounds) |
| Authorisation | Role-based; dept isolation for DEPT users |
| Transport | TLS/HTTPS for production |
| Secrets | Environment variables — no secrets in source repo |
| Data | District data remains within India; NIC data centre policy |
| Logging | Failed login and critical errors logged (NIC standard) |
| PII | HoD phone/email in contacts — access ADMIN only |

---

## 12. Acceptance criteria and sign-off

### 12.1 UAT checklist

- [ ] AC-01: 14 DEPT users submit May data when active month is May (in June)  
- [ ] AC-02: Late submission after 11 PM deadline shows as Late  
- [ ] AC-03: Command Center shows correct TPI, heatmap, and RED count  
- [ ] AC-04: KPI Guide shows current units/targets after DB update **without redeploy**  
- [ ] AC-05: DC saves target on RED KPI; appears in Target Follow-up  
- [ ] AC-06: Contacts menu visible and functional in Action Tracker  
- [ ] AC-07: CSV and PDF export complete for review month  
- [ ] AC-08: History chart shows 6 months for all departments  
- [ ] AC-09: DEPT user cannot access another department’s data  
- [ ] AC-10: System accessible from district LAN per agreed URL  

### 12.2 Sign-off

| Role | Name | Signature | Date |
|------|------|-----------|------|
| District Commissioner, Tirap | | | |
| District Informatics Officer, NIC | | | |
| State Informatics Officer (if applicable) | | | |
| NIC Project Lead / Developer | | | |

---

## 13. Appendices

### Appendix A — 14 Key Result Areas (Tirap)

| ID | Code | KRA | Nodal owner |
|----|------|-----|-------------|
| D01 | H | Health Service Delivery | DMO |
| D02 | E | Education Attendance & Outcomes | DDSE |
| D03 | A | Anganwadi & ECCE | DPO (ICDS) |
| D04 | D | Drug Demand-Reduction & Youth | DC + DMO + SP |
| D05 | S | Sanitation, Cleanliness & Urban Services | TMC / SDO |
| D06 | I | Infrastructure, Roads & Connectivity | PWD SE |
| D07 | W | Power Supply & Distribution | Executive Engineer (Power) |
| D08 | L | Law & Order, Public Safety | SP |
| D09 | G | Agriculture, Horticulture & Allied | DAO + DHO |
| D10 | C | Convergence & Saturation Villages | DC (chair) |
| D11 | R | Revenue & Land | Revenue Officer |
| D12 | J | Jan Suvidha (Certificates & Services) | OIC Jan Suvidha |
| D13 | M | Disaster Management & Resilience | DDMO |
| D14 | P | Process, People & Citizen Grievance | DC Office |

### Appendix B — Indicator scale

| Metric | Tirap (current) |
|--------|-----------------|
| Key Result Areas | 14 |
| Key Performance Indicators | 124 |
| Total department weight (TPI) | 100 (normalised) |
| RAG thresholds | Green ≥90, Yellow 70–89, Red &lt;70 |

### Appendix C — Related district documents

| Document | Location |
|----------|----------|
| Letter to DIO NIC | `docs/08_Letter_District_Administration_to_DIO_NIC.md` |
| DC User Guide | `docs/01_DC_User_Guide.md` |
| Local deployment guide | `docs/04_Local_Deployment_Without_Cloud.md` |
| KPI weights & contribution | `docs/07_KPI_Weights_and_Contribution.md` |

---

**End of SRS — SRS-TPI-NIC-001**

*Submitted by District Administration, Tirap District, for implementation by National Informatics Centre.*
