# Software Requirements Specification (SRS)

## Tirap Performance Index (TPI) — District Performance Monitoring System

| Field | Detail |
|-------|--------|
| **Document ID** | SRS-TPI-UD-001 |
| **Version** | 1.0 |
| **Date** | 8 June 2026 |
| **Prepared by** | User Department / District Administration (Tirap) |
| **Prepared for** | District Commissioner Office, HoD Users, IT / Development Team |
| **Status** | Draft for review |

---

## Document control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 08-06-2026 | User Department | Initial SRS from user-department perspective |

**Distribution**

| Copy | Recipient |
|------|-----------|
| 1 | District Commissioner |
| 2 | District Informatics Officer / IT Cell |
| 3 | Development / Implementation Team |
| 4 | 14 Key Result Area (KRA) Nodal Officers |

---

## Table of contents

1. [Introduction](#1-introduction)  
2. [Overall description](#2-overall-description)  
3. [User classes and characteristics](#3-user-classes-and-characteristics)  
4. [Functional requirements](#4-functional-requirements)  
5. [Non-functional requirements](#5-non-functional-requirements)  
6. [External interface requirements](#6-external-interface-requirements)  
7. [Use cases](#7-use-cases)  
8. [Reporting cycle rules](#8-reporting-cycle-rules-business-rules)  
9. [Data requirements](#9-data-requirements)  
10. [Assumptions and dependencies](#10-assumptions-and-dependencies)  
11. [Acceptance criteria](#11-acceptance-criteria)  
12. [Appendices](#12-appendices)  

---

## 1. Introduction

### 1.1 Purpose

This Software Requirements Specification (SRS) defines the **functional and non-functional requirements** of the **Tirap Performance Index (TPI)** system from the **User Department** viewpoint — i.e. requirements as needed by the District Commissioner (DC), department heads (HoDs), and district administration for monthly performance monitoring, review, and follow-up.

This document is intended for:

- Approval by district senior officers  
- Guidance to developers and IT implementers  
- User acceptance testing (UAT) by DC office and departments  
- Onboarding of additional districts on the same platform  

### 1.2 Scope

**Product name:** Tirap Performance Index (TPI)  
**Product type:** Web-based district performance dashboard  

The system shall:

1. Collect monthly KPI actuals from **14 departments** (Key Result Areas).  
2. Compute scores (0–100) and RAG status (Green / Yellow / Red) per KPI and per KRA.  
3. Provide the **District Commissioner** a consolidated view: district TPI, who is underperforming, who has not submitted data, and which DC targets are overdue.  
4. Support **action tracking** — DC sets targets for RED indicators and reviews prior commitments.  
5. Export **monthly review packs** (Excel and print-ready PDF) for conferences and records.  
6. Show **historical trends** (3 or 6 months) for all departments.  

**In scope**

- Admin (DC) dashboard  
- Department (HoD) data entry portal  
- Monthly reporting cycle enforcement  
- Submission tracking  
- Target follow-up and action tracker  
- History charts and exports  
- Multi-district configuration (one deployment per district database)  

**Out of scope (current version)**

- Mobile native apps (iOS/Android)  
- SMS / WhatsApp alerts  
- Integration with state government portals (e.g. real-time external APIs)  
- Automatic data pull from department MIS (manual entry only)  
- Multi-level hierarchy above district (state dashboard)  
- Offline mobile data collection without network  

### 1.3 Definitions, acronyms, and abbreviations

| Term | Definition |
|------|------------|
| **DC** | District Commissioner |
| **HoD** | Head of Department / KRA nodal officer |
| **KRA** | Key Result Area — one of 14 departmental performance domains |
| **KPI** | Key Performance Indicator — measurable indicator under a KRA (~100 total) |
| **TPI** | Tirap Performance Index — composite district performance score |
| **RAG** | Red–Amber–Green status based on score bands |
| **RED** | Score &lt; 70 — mandatory DC action plan |
| **YELLOW** | Score 70–89 — watch list |
| **GREEN** | Score ≥ 90 — on track |
| **Reporting month** | Calendar month for which performance data is measured |
| **Submission window** | Period when departments may file data for the reporting month |
| **Action item** | DC commitment (target score, due date, plan) for a RED KPI |
| **Deviation** | Actual score minus DC target score |
| **JWT** | JSON Web Token — session authentication mechanism |
| **SRS** | Software Requirements Specification |
| **UAT** | User Acceptance Testing |

### 1.4 References

| Ref | Document |
|-----|----------|
| [R1] | `docs/01_DC_User_Guide.md` — DC operational guide |
| [R2] | `docs/02_Technical_Flow.md` — Technical architecture |
| [R3] | `docs/03_District_Onboarding.md` — New district setup |
| [R4] | `docs/04_Local_Deployment_Without_Cloud.md` — Local / LAN deployment |
| [R5] | `SQLQuery1.sql` — Database schema |
| [R6] | NITI Aayog / district governance performance review practice (conceptual alignment) |

### 1.5 Overview of document

Section 2 describes the system context. Section 3 defines user roles. Sections 4–5 list functional and non-functional requirements with unique IDs (e.g. `FR-DC-01`). Section 6 covers interfaces. Section 7 provides use cases. Sections 8–11 cover business rules, data, assumptions, and acceptance criteria.

---

## 2. Overall description

### 2.1 Product perspective

TPI is a **standalone district system** comprising:

- **Web browser (user interface)** — React application  
- **Application server (API)** — Node.js / Express  
- **Database** — Microsoft SQL Server  

It may run on:

- DC / district office laptop (**localhost**)  
- District LAN server (**no cloud hosting required**)  

```
[HoD Browser] ──┐
[DC Browser]  ──┼──► Web UI (port 3000) ──► API (port 3001) ──► SQL Server
[IT Admin]      ──┘
```

### 2.2 Product functions (summary)

| # | Function |
|---|----------|
| F1 | Secure login for DC and department users |
| F2 | Monthly KPI data entry by departments |
| F3 | Automatic scoring and RAG classification |
| F4 | DC Command Center — alerts and summaries |
| F5 | Submission tracker (14 departments) |
| F6 | Target follow-up for DC commitments |
| F7 | Action tracker — set and review targets |
| F8 | KRA drill-down — all KPIs with actual vs target |
| F9 | History — 3/6 month trends |
| F10 | Export monthly review pack (CSV / PDF) |

### 2.3 User department context

The **User Department** (District Administration) is the **owning department** of this system. Requirements herein reflect:

- DC’s need for **daily situational awareness** before review meetings  
- HoDs’ need for **simple, locked monthly submission** without confusion over which month to enter  
- Secretariat need for **exportable records** for conferences and file notings  
- IT need for **deployability on district infrastructure** without mandatory cloud hosting  

### 2.4 Operating environment

| Component | Requirement |
|-----------|-------------|
| Client | Modern web browser (Chrome, Edge, Firefox — latest 2 versions) |
| Server OS | Windows 10/11 or Windows Server 2019+ |
| Database | SQL Server Express 2019+ |
| Runtime | Node.js 18 LTS or 20 LTS |
| Network | Localhost or district LAN; internet not required after installation |
| Display | Minimum 1280×720; tablet-friendly for DC review in meetings |

### 2.5 Design and implementation constraints

| ID | Constraint |
|----|------------|
| CON-01 | System must use district SQL Server for data persistence |
| CON-02 | Passwords must be stored hashed (bcrypt) in production |
| CON-03 | Sessions must use JWT with configurable expiry |
| CON-04 | Department users may access **only their own** KRA data |
| CON-05 | Departments may submit data **only for the designated reporting month** |
| CON-06 | 14 KRAs (D01–D14) structure is fixed per district deployment |
| CON-07 | RAG thresholds: Green ≥90, Yellow ≥70, Red &lt;70 (unless policy changed centrally) |

### 2.6 Assumptions

- Each KRA has one designated nodal officer with login credentials  
- DC office has at least one ADMIN user  
- SQL Server is maintained by district IT / NIC  
- KPI definitions (min, max, polarity) are agreed before seeding  
- Monthly review meeting follows calendar month cycle  

---

## 3. User classes and characteristics

### 3.1 User class summary

| Class | Role code | Count | Technical skill | Primary goal |
|-------|-----------|-------|-----------------|--------------|
| District Commissioner | ADMIN | 1–3 | Low–medium | Monitor district performance; set targets; conduct review |
| KRA Nodal Officer (HoD) | DEPT | 14 | Low–medium | Submit monthly KPI actuals; view DC actions |
| District IT / DIO | ADMIN or IT support | 1–2 | High | Deploy, backup, user management |
| Secretariat / Review staff | ADMIN (read) | 0–2 | Low | Export reports for meetings |

### 3.2 District Commissioner (ADMIN)

- **Access URL:** `/admindashboard`  
- **Privileges:** Full district view; all 14 KRAs; set/review action items; export; history  
- **Frequency of use:** Daily (alerts), weekly (chase submissions), monthly (review meeting)  

### 3.3 Department user (DEPT)

- **Access URL:** `/deptdashboard`  
- **Privileges:** Own department KPIs only; submit monthly data; read-only action tracker  
- **Frequency of use:** Monthly (during submission window), occasionally to view DC targets  

### 3.4 IT administrator

- Not a separate application role in v1.0 — uses database and server tools  
- Responsibilities: database backup, user password reset, server start/stop, onboarding new districts  

---

## 4. Functional requirements

Requirements are numbered **`FR-<role>-<nn>`** (Functional Requirement).

### 4.1 Authentication and access control

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-AUTH-01 | The system shall provide a login page at `/login` with username and password fields. | Must |
| FR-AUTH-02 | The system shall authenticate users against the Users table and issue a session token (JWT). | Must |
| FR-AUTH-03 | The system shall redirect ADMIN users to `/admindashboard` after successful login. | Must |
| FR-AUTH-04 | The system shall redirect DEPT users to `/deptdashboard` after successful login. | Must |
| FR-AUTH-05 | The system shall persist session across browser refresh until token expiry or logout. | Must |
| FR-AUTH-06 | The system shall provide logout and clear session on all devices using that browser. | Must |
| FR-AUTH-07 | The system shall deny access to admin-only functions for DEPT users (HTTP 403). | Must |
| FR-AUTH-08 | The system shall deny DEPT users access to other departments’ KPI data. | Must |
| FR-AUTH-09 | The system shall display a clear error when database is unavailable at login. | Should |

### 4.2 Reporting cycle and month locking

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-CYCLE-01 | The system shall define the **active reporting month** as the **previous calendar month** relative to today. | Must |
| FR-CYCLE-02 | The system shall open the department submission window on the **1st day of the current calendar month** (configurable per district). | Must |
| FR-CYCLE-03 | The system shall enforce a submission **deadline** (configurable day/time in DistrictConfig). | Must |
| FR-CYCLE-04 | Department users shall **only** enter and submit data for the active reporting month. | Must |
| FR-CYCLE-05 | The system shall mark submissions after deadline as **late** (`is_late` flag). | Must |
| FR-CYCLE-06 | The DC dashboard shall default to viewing the **previous month** (reporting month under review). | Must |
| FR-CYCLE-07 | Target follow-up shall evaluate commitments against **current month** scores without manual month selection by DC. | Must |
| FR-CYCLE-08 | The system shall display the locked reporting period label to department users. | Must |

### 4.3 Department data submission (DEPT)

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-DEPT-01 | The system shall display all KPIs for the logged-in department with units and input fields. | Must |
| FR-DEPT-02 | The system shall allow entry of actual values for each KPI for the locked reporting month. | Must |
| FR-DEPT-03 | The system shall validate submission is for the active reporting month only; reject other months. | Must |
| FR-DEPT-04 | The system shall record submission timestamp upon successful submit. | Must |
| FR-DEPT-05 | The system shall allow update of submission before deadline (resubmit). | Should |
| FR-DEPT-06 | The system shall show department KRA score and G/Y/R KPI counts after data is processed. | Must |
| FR-DEPT-07 | The system shall show read-only DC action items (targets, plans) for the department. | Must |
| FR-DEPT-08 | The system shall provide tabs: Action Tracker and Data Submission. | Must |

### 4.4 Scoring and RAG classification

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-SCORE-01 | The system shall convert each KPI actual value to a score between 0 and 100 using min/max band and polarity (higher/lower is better). | Must |
| FR-SCORE-02 | The system shall assign RAG status: GREEN if score ≥ 90, YELLOW if 70–89, RED if &lt; 70. | Must |
| FR-SCORE-03 | The system shall compute KRA score as weighted average of KPI scores. | Must |
| FR-SCORE-04 | The system shall compute District TPI as aggregate across all KPIs. | Must |
| FR-SCORE-05 | The system shall apply the same RAG colour rules on gauge, heatmap, tables, and charts. | Must |

### 4.5 DC Command Center (ADMIN — Home)

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-DC-01 | The system shall provide a Command Center as the default admin home screen. | Must |
| FR-DC-02 | The system shall display a district TPI gauge (0–100) with RAG-coloured indicator. | Must |
| FR-DC-03 | The system shall display a 14-KRA heatmap with colour by RAG status. | Must |
| FR-DC-04 | The system shall show alert counts: pending submissions, overdue targets, RED departments. | Must |
| FR-DC-05 | The system shall list departments that have **not submitted** for the active reporting month. | Must |
| FR-DC-06 | The system shall list departments with **RED** KRA status for the selected review month. | Must |
| FR-DC-07 | The system shall list **overdue or due today** DC targets (top items + link to full list). | Must |
| FR-DC-08 | The system shall show friendly empty states when all submitted / no RED / no overdue. | Should |
| FR-DC-09 | Alert cards shall navigate to the relevant tab when clicked. | Should |

### 4.6 Submission tracker (ADMIN)

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-SUB-01 | The system shall display a table of all 14 departments with submission status. | Must |
| FR-SUB-02 | Status shall be one of: Submitted on time, Submitted late, Pending. | Must |
| FR-SUB-03 | The system shall show submission timestamp where available. | Must |
| FR-SUB-04 | The sidebar shall show a badge with count of unsubmitted departments. | Must |

### 4.7 Target follow-up (ADMIN)

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-TGT-01 | The system shall list open DC commitments with target score, due date, and due status. | Must |
| FR-TGT-02 | The system shall compute deviation (actual − target) using current month performance. | Must |
| FR-TGT-03 | Due status shall include: ON_TRACK, DUE_TODAY, OVERDUE, MET, MISSED (as applicable). | Must |
| FR-TGT-04 | DC shall update completion status and remarks per commitment. | Must |
| FR-TGT-05 | The sidebar shall show badge count for overdue targets. | Must |
| FR-TGT-06 | No manual month switch shall be required for follow-up view. | Must |

### 4.8 KRA overview and drill-down (ADMIN)

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-KRA-01 | The system shall display all 14 KRAs ranked by score with G/Y/R counts and trend. | Must |
| FR-KRA-02 | The system shall provide heatmap and detailed table views. | Must |
| FR-KRA-03 | Clicking a KRA shall open drill-down showing **all KPIs** with actual, score, status, DC target, deviation. | Must |
| FR-KRA-04 | Drill-down shall be available from Command Center, Overview, and heatmap. | Must |

### 4.9 Action tracker (ADMIN)

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-ACT-01 | The system shall list new RED indicators for the selected review month. | Must |
| FR-ACT-02 | The system shall list prior-month commitments still open. | Must |
| FR-ACT-03 | DC shall set action owner, target score (0–100), due date, and action plan per RED indicator. | Must |
| FR-ACT-04 | The system shall show timeline: origin month → target due → review month. | Should |
| FR-ACT-05 | Action items shall be grouped by department to reduce scrolling. | Should |
| FR-ACT-06 | The sidebar shall show badge with total open action items. | Should |
| FR-ACT-07 | Default target due date shall follow district rule (e.g. 1st of next month) if DC leaves date empty. | Must |

### 4.10 History and trends (ADMIN)

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-HIST-01 | The system shall provide history view for last **3** or **6** months. | Must |
| FR-HIST-02 | The system shall show a grouped bar chart: months on X-axis, all departments with **distinct colours** per department. | Must |
| FR-HIST-03 | The system shall allow drill-down to single-department monthly trend. | Must |
| FR-HIST-04 | The system shall provide a department selection table with latest score and period trend. | Must |
| FR-HIST-05 | History data shall be sourced from database with fallback if history API unavailable. | Should |

### 4.11 Export and reporting (ADMIN)

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-EXP-01 | The system shall export **Excel-compatible CSV** monthly review pack. | Must |
| FR-EXP-02 | The system shall export **HTML report** suitable for Print → Save as PDF. | Must |
| FR-EXP-03 | Export shall include: district TPI, G/Y/R counts, submissions, KRA performance, target follow-up, RED indicators. | Must |
| FR-EXP-04 | Export shall respect the selected review month. | Must |
| FR-EXP-05 | Only ADMIN users may export. | Must |

### 4.12 Navigation and usability

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-UI-01 | Admin navigation shall use sidebar: Command Center, Submissions, Target Follow-up, KRA Overview, Action Tracker, History. | Must |
| FR-UI-02 | URLs shall be bookmarkable: `/admindashboard`, `/admindashboard/history`, etc. | Must |
| FR-UI-03 | The interface shall be usable on tablet screen sizes for meeting review. | Should |
| FR-UI-04 | Month picker shall be available on overview and action tracker (not on Command Center home). | Must |

### 4.13 Multi-district configuration

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-MULTI-01 | Each district deployment shall have a DistrictConfig record (name, state, app title). | Must |
| FR-MULTI-02 | Submission deadline and fiscal year start shall be configurable per district. | Must |
| FR-MULTI-03 | Each district shall use a separate database or isolated dataset. | Must |

---

## 5. Non-functional requirements

| ID | Category | Requirement | Priority |
|----|----------|-------------|----------|
| NFR-01 | Performance | Dashboard summary shall load within 10 seconds on district LAN with 14 departments and 100 KPIs. | Should |
| NFR-02 | Performance | Login shall complete within 5 seconds under normal DB connectivity. | Should |
| NFR-03 | Availability | System shall be operable during office hours when SQL Server and API are running. | Must |
| NFR-04 | Security | Passwords shall be hashed with bcrypt (10 rounds) in production. | Must |
| NFR-05 | Security | JWT secret shall be configurable and not use default in production. | Must |
| NFR-06 | Security | All API endpoints (except login) shall require valid JWT. | Must |
| NFR-07 | Security | CORS shall restrict browser origin to configured frontend URL. | Must |
| NFR-08 | Reliability | Database connection shall retry on startup failure. | Should |
| NFR-09 | Maintainability | KPI/KRA metadata shall be maintainable without code change where possible (DB + config). | Should |
| NFR-10 | Usability | RAG colours and labels shall be consistent across all screens. | Must |
| NFR-11 | Usability | Empty states shall use plain language (e.g. “All departments submitted”). | Should |
| NFR-12 | Portability | System shall run on Windows without cloud hosting. | Must |
| NFR-13 | Backup | Database shall support standard SQL Server backup (.bak). | Must |
| NFR-14 | Audit | Submission timestamp and action item updates shall be persisted in database. | Must |
| NFR-15 | Localization | Dates and numbers shall display in Indian locale format where applicable. | Should |

---

## 6. External interface requirements

### 6.1 User interfaces

| Screen | Users | Key elements |
|--------|-------|--------------|
| Login | All | Username, password, error message |
| Command Center | DC | Gauge, heatmap, alerts, pending/RED/overdue panels |
| Submissions | DC | 14-row status table |
| Target Follow-up | DC | Accordion commitments, save review |
| KRA Overview | DC | Heatmap, sortable table, drill-down modal |
| Action Tracker | DC | Grouped RED items, target form |
| History | DC | 3/6 month toggle, multi-dept chart, dept drill-down |
| Dept portal | HoD | KPI entry form, submit button, action tracker read-only |

### 6.2 Hardware interfaces

- Standard PC, laptop, or tablet with keyboard/touch  
- No specialised hardware required  

### 6.3 Software interfaces

| Interface | Description |
|-----------|-------------|
| SQL Server | Primary data store via TCP (instance e.g. SQLEXPRESS) |
| Web browser | Chrome / Edge / Firefox — ES6+ JavaScript |
| Node.js runtime | API server v18+ |
| Excel | Opens exported CSV files |

### 6.4 Communication interfaces

| Protocol | Port | Usage |
|----------|------|-------|
| HTTP | 3000 | React web UI |
| HTTP | 3001 | REST JSON API |
| HTTPS | Optional | Recommended if exposed beyond LAN |

**API authentication:** `Authorization: Bearer <JWT>`

---

## 7. Use cases

### UC-01 — DC daily situational check

| Field | Detail |
|-------|--------|
| **Actor** | District Commissioner |
| **Precondition** | Logged in; departments have begun monthly cycle |
| **Main flow** | 1. Open Command Center → 2. View pending submission count → 3. View overdue targets → 4. View RED departments → 5. Click KRA for drill-down if needed |
| **Postcondition** | DC knows who to chase before meeting |
| **Requirements** | FR-DC-01 to FR-DC-09, FR-SUB-04, FR-TGT-05 |

### UC-02 — HoD monthly data submission

| Field | Detail |
|-------|--------|
| **Actor** | Department nodal officer |
| **Precondition** | Submission window open; reporting month = previous calendar month |
| **Main flow** | 1. Login → 2. Open Data Submission → 3. Enter actuals for all KPIs → 4. Submit → 5. See confirmation |
| **Alternate** | 3a. Resubmit before deadline to correct values |
| **Postcondition** | Submission recorded; visible in DC submission tracker |
| **Requirements** | FR-DEPT-01 to FR-DEPT-05, FR-CYCLE-01 to FR-CYCLE-04 |

### UC-03 — DC sets target for RED indicator

| Field | Detail |
|-------|--------|
| **Actor** | District Commissioner |
| **Precondition** | RED KPI exists for review month |
| **Main flow** | 1. Open Action Tracker → 2. Expand department → 3. Expand RED item → 4. Enter owner, target score, due date, plan → 5. Save target |
| **Postcondition** | Action item stored; appears in Target Follow-up when due |
| **Requirements** | FR-ACT-01, FR-ACT-03, FR-ACT-07 |

### UC-04 — DC monthly review meeting export

| Field | Detail |
|-------|--------|
| **Actor** | DC / Secretariat |
| **Precondition** | Review month data available |
| **Main flow** | 1. Select review month → 2. Click Excel (CSV) → 3. Click PDF Report → 4. Print HTML to PDF → 5. Use in conference |
| **Postcondition** | Review pack archived for records |
| **Requirements** | FR-EXP-01 to FR-EXP-04 |

### UC-05 — DC reviews 6-month trend

| Field | Detail |
|-------|--------|
| **Actor** | District Commissioner |
| **Precondition** | At least 3 months data in system |
| **Main flow** | 1. Open History → 2. Select Last 6 months → 3. View all-department chart → 4. Click department for detail |
| **Postcondition** | Trend discussed in policy review |
| **Requirements** | FR-HIST-01 to FR-HIST-04 |

### UC-06 — DC reviews prior commitment outcome

| Field | Detail |
|-------|--------|
| **Actor** | District Commissioner |
| **Precondition** | Prior month target exists; current month scores available |
| **Main flow** | 1. Open Target Follow-up → 2. View deviation per item → 3. Set completion status and remarks → 4. Save review |
| **Postcondition** | Commitment marked COMPLETED / MISSED / etc. |
| **Requirements** | FR-TGT-01 to FR-TGT-04 |

---

## 8. Reporting cycle rules (business rules)

| Rule ID | Rule |
|---------|------|
| BR-01 | Active reporting month = previous calendar month (dynamic, never hardcoded). |
| BR-02 | Departments cannot submit future month or current month performance — only BR-01 month. |
| BR-03 | DC default dashboard month = active reporting month (same as BR-01). |
| BR-04 | Target follow-up uses current calendar month actuals. |
| BR-05 | Late submission = submitted after configured deadline in DistrictConfig. |
| BR-06 | RED KPI automatically creates or links an Action Item requiring DC response. |
| BR-07 | RAG: Green ≥ 90; Yellow 70–89; Red &lt; 70. |
| BR-08 | One submission record per department per reporting month. |

---

## 9. Data requirements

### 9.1 Master data

| Entity | Description | Owner |
|--------|-------------|-------|
| Departments | 14 KRAs (D01–D14) | District / User Dept |
| KPIs | ~100 indicators with min, max, polarity, unit | District / User Dept |
| Users | Admin and dept logins | IT / DC office |
| DistrictConfig | District name, cycle parameters | User Dept |

### 9.2 Transactional data

| Entity | Description | Retention |
|--------|-------------|-----------|
| PerformanceData | Monthly KPI actuals | Permanent (minimum 24 months recommended) |
| DeptMonthlySubmissions | Submit audit (time, late flag) | Permanent |
| ActionItems | DC targets, plans, reviews | Permanent |
| ReportingMonths | Available months for UI | Grows monthly |

### 9.3 Reports

| Report | Format | Frequency |
|--------|--------|-----------|
| Monthly review pack | CSV, PDF (via HTML print) | Monthly |
| Command Center snapshot | On-screen | Daily |
| History trend chart | On-screen | Quarterly / as needed |

---

## 10. Assumptions and dependencies

### 10.1 Assumptions

- User Department agrees KPI definitions before go-live  
- Each HoD nominates one login operator per KRA  
- DC office designates at least one ADMIN user  
- District IT provides SQL Server and backup media  
- Monthly review meeting calendar aligns with submission window  

### 10.2 Dependencies

| Dependency | Impact if unavailable |
|------------|----------------------|
| SQL Server running | No login, no data — system unavailable |
| Node API running | UI loads but no data |
| District LAN (multi-user) | HoDs cannot submit from office network |
| HoD timely submission | Submission tracker shows pending; DC must chase manually |

---

## 11. Acceptance criteria

The system shall be **accepted by User Department** when all criteria below pass UAT:

### 11.1 Authentication

- [ ] AC-01: ADMIN and DEPT users login successfully with assigned credentials  
- [ ] AC-02: DEPT user cannot access `/admindashboard` data of other departments  
- [ ] AC-03: Session persists on page refresh within token validity  

### 11.2 Reporting cycle

- [ ] AC-04: In June, department portal locks to May data entry only  
- [ ] AC-05: Submission after deadline shows as late in DC tracker  
- [ ] AC-06: DC Command Center shows correct pending count  

### 11.3 DC dashboard

- [ ] AC-07: Command Center shows gauge, heatmap, and three alert panels  
- [ ] AC-08: KRA drill-down shows all KPIs with actual vs target  
- [ ] AC-09: Sidebar badges match unsubmitted and overdue counts  

### 11.4 Action and targets

- [ ] AC-10: DC can save target for RED indicator and see it in Target Follow-up  
- [ ] AC-11: Deviation computes correctly when current month score available  
- [ ] AC-12: DC can mark prior commitment COMPLETED / MISSED  

### 11.5 History and export

- [ ] AC-13: History shows 6 months for all 14 departments with distinct bar colours  
- [ ] AC-14: CSV export opens correctly in Excel with all sections  
- [ ] AC-15: PDF path (HTML print) produces readable conference pack  

### 11.6 Deployment

- [ ] AC-16: System runs on district laptop without internet (localhost mode)  
- [ ] AC-17: HoDs access system from district LAN using server IP (LAN mode)  

**Sign-off**

| Role | Name | Signature | Date |
|------|------|-----------|------|
| District Commissioner | | | |
| User Department / Nodal Officer | | | |
| District Informatics Officer | | | |
| Development Team Lead | | | |

---

## 12. Appendices

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

### Appendix B — URL map

| URL | Role |
|-----|------|
| `/login` | All |
| `/admindashboard` | DC — Command Center |
| `/admindashboard/submissions` | DC |
| `/admindashboard/target-followup` | DC |
| `/admindashboard/overview` | DC |
| `/admindashboard/action-tracker` | DC |
| `/admindashboard/history` | DC |
| `/deptdashboard/action-tracker` | HoD |
| `/deptdashboard/data-submission` | HoD |

### Appendix C — Related documents

| Document | Path |
|----------|------|
| DC User Guide | `docs/01_DC_User_Guide.md` |
| Technical Flow | `docs/02_Technical_Flow.md` |
| District Onboarding | `docs/03_District_Onboarding.md` |
| Local Deployment | `docs/04_Local_Deployment_Without_Cloud.md` |

---

**End of SRS Document**

*This SRS is prepared from the User Department perspective and shall be reviewed and approved by the District Commissioner office before being treated as the baseline for UAT and future enhancements.*
