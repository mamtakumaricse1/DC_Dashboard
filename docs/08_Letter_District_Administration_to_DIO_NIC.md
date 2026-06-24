# OFFICE OF THE DEPUTY COMMISSIONER  
## DISTRICT ADMINISTRATION, TIRAP DISTRICT  
### ARUNACHAL PRADESH

---

**No.** TIRAP/DC/IT/2026/\_\_\_  
**Dated:** \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_ 2026  

**To**  
The District Informatics Officer  
National Informatics Centre (NIC)  
Tirap District, Arunachal Pradesh  

**Copy to:**  
1. The Secretary to the Government of Arunachal Pradesh, Planning & Investment Department, Itanagar — for kind information.  
2. The State Informatics Officer, NIC Arunachal Pradesh State Centre, Itanagar.  

---

**Subject:** Request for **development, deployment, and technical support** of the **Tirap Performance Index (TPI)** — a web-based District Performance Monitoring System — **reg.**

---

Sir/Madam,

With reference to the district governance and monthly performance review framework adopted under the Tirap Performance Index (TPI), the District Administration seeks the **technical assistance of NIC** for formal **development, hosting, and sustained support** of a dedicated software application.

### 1. Background

The District Commissioner’s office conducts **monthly review** of performance across **14 Key Result Areas (KRAs)** covering health, education, anganwadi, law & order, agriculture, infrastructure, power, sanitation, revenue, citizen services, disaster management, and related sectors. At present, performance is tracked through **124 Key Performance Indicators (KPIs)** with defined units, targets, and scoring rules.

Manual compilation of data, follow-up on underperforming indicators, and preparation of review materials is **time-consuming** and delays evidence-based decision-making. A **single, secure, district-owned digital platform** is required so that:

- Department nodal officers submit monthly KPI actuals in a **standardised format**;
- The District Commissioner views **consolidated district performance**, RED areas, and submission status in real time;
- **Action targets** set for underperforming indicators are tracked to completion;
- **Monthly review packs** can be exported for conferences and official records.

A **functional prototype** has been prepared by the district team to demonstrate workflows, scoring logic, and user interfaces. The district now requests NIC to take this forward as an **official, maintainable, and securely hosted** solution.

### 2. Summary of software required

| Item | Description |
|------|-------------|
| **Product name** | Tirap Performance Index (TPI) |
| **Type** | Web application (browser-based) |
| **Primary users** | District Commissioner / DC office (Admin); 14 KRA nodal officers (Department users) |
| **Core functions** | (i) Monthly KPI data collection from departments; (ii) Automatic scoring (0–100) and RAG status (Green / Yellow / Red); (iii) District TPI and KRA heatmap; (iv) Submission tracker with late-submission flag; (v) DC Command Center with alerts; (vi) Action Tracker and Target Follow-up for RED indicators; (vii) KPI drill-down and 3/6-month history charts; (viii) Excel (CSV) and PDF-ready monthly export; (ix) Per-department KPI Guide loaded from live database; (x) HoD contact directory for follow-up |
| **Reporting cycle** | Departments submit **previous calendar month** data during a configurable window (default: from 1st of month until **11:00 PM** on the 1st) |
| **Scoring** | KPI score from actual vs min/max band; District TPI = weighted average of 14 KRA scores (weights normalised to **100**) |
| **Technology (proposed)** | React web UI; Node.js REST API; Microsoft SQL Server database; JWT authentication |
| **Deployment** | District LAN or state/district data centre; **cloud hosting not mandatory**; must operate without public internet where required |
| **Scalability** | Architecture should allow onboarding of **additional districts** with separate configuration and database |

### 3. Request to NIC

It is requested that NIC may kindly:

1. **Review** the attached Software Requirements Specification (SRS) and confirm feasibility.  
2. **Develop / adopt** the application in line with NIC standards, security policy, and Government of India guidelines for web applications.  
3. **Deploy** the system on suitable district or state infrastructure (with backup and access control).  
4. **Provide** user credentials for DC office and 14 department nodal officers; support password reset and basic administration.  
5. **Conduct** User Acceptance Testing (UAT) with the District Commissioner’s office and nodal officers.  
6. **Hand over** documentation, source code custody (as per NIC policy), and **post-go-live support** for a defined warranty period.  
7. **Train** DC secretariat staff and one nodal officer per KRA on data entry and review workflows.

### 4. District commitments

The District Administration undertakes to:

- Nominate **one officer per KRA** for monthly data submission;  
- Approve KPI definitions, weights, and targets before go-live;  
- Designate a **district nodal officer** for coordination with NIC;  
- Participate in UAT and sign acceptance as per SRS Annexure;  
- Ensure timely submission by departments during the reporting window.

### 5. Enclosures

| Sl. No. | Enclosure | Document ID |
|---------|-----------|---------------|
| **1** | **Software Requirements Specification (SRS)** — Tirap Performance Index (TPI) | **SRS-TPI-NIC-001** (attached) |
| 2 | Tirap Performance Index — KPI master list & weights (Excel / approved workbook) | As available with DC office |
| 3 | Prototype demonstration / access details | On request |

### 6. Action solicited

You are requested to **examine the proposal**, indicate **estimated timeline and resource requirement**, and communicate the **way forward** at the earliest so that the system may be operationalised for the **forthcoming monthly district review cycle**.

Thanking you in anticipation.

Yours faithfully,

&nbsp;

&nbsp;

&nbsp;

**(Sd/-)**  
**DISTRICT COMMISSIONER**  
**Tirap District**  
**Arunachal Pradesh**

&nbsp;

**Place:** Khonsa / District HQ, Tirap  
**Contact:** \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_ (Office of the Deputy Commissioner)  
**Email:** \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_  

---

**Endorsement (for office use)**

| Received in NIC | Date | Remarks |
|-----------------|------|---------|
| DIO / SIO | | |
| Technical review assigned to | | |
| Expected response date | | |
