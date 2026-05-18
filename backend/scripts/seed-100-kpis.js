/**
 * Seeds exactly 100 KPIs (weight 1 each) and 6 months of performance data.
 * Run after SQLQuery1.sql schema: node scripts/seed-100-kpis.js
 */
const { getPool, sql } = require('../db');

const DEPT_CAPS = {
  D01: 10,
  D02: 8,
  D03: 5,
  D04: 6,
  D05: 5,
  D06: 9,
  D07: 7,
  D08: 9,
  D09: 6,
  D10: 7,
  D11: 6,
  D12: 12,
  D13: 5,
  D14: 5
};

const KPI_MASTER = {
  D01: [
    'PHC Functionality Score (% of PHCs scoring >=70% on 6-parameter audit)',
    'Institutional Delivery Rate',
    'Full Immunisation Coverage (children 0-1 yr)',
    'eSanjeevani Tele-OPD Consults per active SC',
    'ANC 4 Visits Completed (% of registered pregnancies)',
    'Ayushman Card Coverage in Priority Villages',
    'Drug Stock-out Days at PHCs (cumulative across district)',
    'OST (Opioid Substitution) Active Patients',
    'De-addiction Centre Treatment Retention (3-month)',
    'TB Case Notification Rate (per lakh population)',
    'Maternal Deaths (this month, district total)',
    'Infant Deaths (this month, district total)'
  ],
  D02: [
    'Teacher Attendance Rate (avg across govt schools)',
    'Student Attendance Rate (Classes 1-8)',
    'FLN Reading Proficiency, Class 3 (NIPUN Bharat)',
    'FLN Numeracy Proficiency, Class 3 (NIPUN Bharat)',
    'Schools with Functional Toilets (separate boy/girl)',
    'Schools with Drinking Water',
    'Class 10 Board Pass Rate (annual; reported in March-April)',
    'Class 12 Board Pass Rate (annual)',
    'Out-of-School Children Identified & Mainstreamed',
    'Teacher Training Days Completed (cumulative)',
    'Schools Receiving Mid-Day Meal All Working Days',
    'EMRS / Ashram School Hostel Occupancy'
  ],
  D03: [
    'AWC Functionality Score (% scoring >=70% on 5-parameter audit)',
    'Children 0-6 Registered in ICDS MIS',
    'AWCs Running Daily Pre-school Activity',
    'Saksham AWC Upgrade Status (cumulative count)',
    'Take-Home Ration Distribution Coverage',
    'Hot Cooked Meal Days (per AWC per month)',
    'Severely Underweight Children (% of registered 0-6)',
    'Stunting Rate (Class 1 entrants, annual)',
    'AWWs with Smartphone & POSHAN App Active'
  ],
  D04: [
    'New Patients Inducted into De-addiction Programme',
    'Recovered Users Placed in Skilling/Employment',
    'Peer Counsellors Active (recovered users)',
    'School-Based Drug Awareness Sessions Conducted',
    'Sports Tournaments at Circle Level Held',
    'Football League Registered Teams',
    'Youth Skilling Enrolments (current month)'
  ],
  D05: [
    'ODF-Plus Villages Declared & Sustained (cumulative)',
    'Khonsa Town Door-to-Door Waste Collection Coverage',
    'Public Toilets Functional (% of constructed)',
    'Swachh Tirap Awards Participating Villages',
    'Waste Segregation at Source (% HHs in town)',
    'Drains Cleaned Pre-Monsoon (% of urban drains)'
  ],
  D06: [
    'PWD Road Condition (% rated passable, dry season)',
    'PWD Road Condition (% passable, monsoon)',
    'PMGSY Projects On-Schedule (%)',
    'JJM Tap Connections Functional',
    'Villages with 24x7 Power',
    'Mobile Network Coverage (villages with 4G)',
    'Bridges/Culverts Damaged & Awaiting Repair',
    'Power Outage Hours (district total, monthly)',
    'Villages Connected by All-Weather Road (%)'
  ],
  D07: [
    'Average Daily Power Supply Hours (district HQ + circle HQs)',
    'Total Unscheduled Outage Hours (district aggregate, monthly)',
    'Villages with Functional 11kV/LT Connectivity',
    'Households with Metered Connection (RDSS / DDUGJY)',
    'New Service Connection - Mean Days Application to Energization',
    'Billing Efficiency (units billed / units input)',
    'Collection Efficiency (revenue collected / billed)',
    'Distribution Transformer Failure Rate (% of installed base)',
    'Solar Rooftop / PM-Surya Ghar Installations Completed (cumulative)',
    'Critical Substation Maintenance Compliance (% schedule met)'
  ],
  D08: [
    'FIR Registration Compliance (% of complaints leading to FIR)',
    'Case Disposal Rate (% of pending docket disposed)',
    'NDPS Seizure-to-Treatment Referral Ratio',
    'Crimes Against Women (FIRs registered)',
    'CAW Conviction Rate (% of cases reaching judgment)',
    'Police Public Grievance Days Held (per month, district-wide)',
    'Excise / Opium Field Destruction (acres)',
    'Communal/Tribal Tension Incidents',
    'Night Patrolling Coverage (% beats covered as per plan)'
  ],
  D09: [
    'Farmer Field Demonstration Plots Active',
    'FPOs Active with >100 Members',
    'KCC (Kisan Credit Card) Coverage of Farmers',
    'PM-Kisan Beneficiaries Receiving Installment',
    'Soil Health Cards Distributed (cumulative)',
    'Agarwood Saplings Distributed (cumulative)',
    'Large Cardamom Acreage Brought Under Cultivation',
    'Mithun Vaccination Coverage',
    'SHGs with Active Bank Credit Line',
    'DDU-GKY Skilling Placements (cumulative)'
  ],
  D10: [
    'Saturation Villages Where Camp Held (cumulative)',
    'Aadhaar Saturation in Priority Villages',
    'Jan Dhan Account Coverage (adult HHs)',
    'Ration Card Backlog (pending applications)',
    'PMAY-G Houses Sanctioned vs Completed',
    'NSAP Pension Disbursement (% of beneficiaries received)',
    'PM-JANMAN Plan Implementation (% of approved activities executed)',
    'DANGUA District Plan Activities On-Schedule'
  ],
  D11: [
    'Land Mutation Cases Disposed Within 30 Days',
    'Land Records Digitisation Coverage',
    'Pending Court Cases Involving District (%)',
    'Public Hearing Days (CO + SDO Darbar) Held',
    'Revenue Court Cases Disposed',
    'RTI Replies Disposed Within 30 Days'
  ],
  D12: [
    'ST Certificate Issued Within 15 Days',
    'PRC Issued Within 15 Days',
    'TRC Issued Within 15 Days',
    'Government ID Card Issued Within 15 Days',
    'ILP Issued Within 7 Days',
    'Driving Licence - Applications Forwarded to DTO Within 3 Working Days',
    'Driving Licence - Applications Received (volume, this month)',
    'Driving Licence - Applications Pending Forwarding (>3 days)',
    'Vehicle Registration - Applications Forwarded to DTO Within 3 Working Days',
    'Vehicle Registration - Applications Received (volume, this month)',
    'Vehicle Registration - Applications Pending Forwarding (>3 days)',
    'Citizen Satisfaction with Jan Suvidha (random phone sample)'
  ],
  D13: [
    'Disaster Preparedness Drills Conducted',
    'Pre-Monsoon Stocking at PHCs/Schools (% complete by April)',
    'Villages with Documented DRR Plans',
    'Relief Reached Within 7 Days of Reported Incident',
    'Early Warning System Coverage (flood/landslide-prone villages)',
    'VHF/HF Radio Backup Functional at Critical Locations'
  ],
  D14: [
    'DC Field Days Completed',
    'SDO Field Days (avg per SDO)',
    'Officer Tour Diaries Submitted On-Time',
    'GB 360 Feedback Forms Received (quarterly)',
    'Grievances Registered (PGRS-DARPAN + WhatsApp)',
    'Grievances Disposed Within 30 Days',
    'Citizen Satisfaction (random phone sample of closed cases)',
    'Public Dashboard Released On Time (5th of month)',
    'Press Notes / Public Communications Issued',
    'Vacancies in Critical Posts (district total)'
  ]
};

const TIERS = ['G', 'G', 'Y', 'Y', 'R'];

function makeKpiId(deptId, name) {
  return `${deptId}_${name
    .toUpperCase()
    .replace(/ /g, '_')
    .replace(/\//g, '_')
    .replace(/-/g, '_')
    .replace(/\(/g, '')
    .replace(/\)/g, '')
    .replace(/%/g, 'PCT')
    .replace(/&/g, 'AND')
    .replace(/\./g, '')
    .replace(/,/g, '')
    .replace(/\+/g, 'PLUS')
    .replace(/>/g, '')
    .replace(/</g, '')
    .replace(/=/g, '')}`;
}

function tierActual(tier, kpiId, monthKey, sortOrder, maxSort) {
  const h = (s) => {
    let n = 0;
    for (let i = 0; i < s.length; i += 1) n = (n * 31 + s.charCodeAt(i)) >>> 0;
    return n;
  };
  const drift =
    sortOrder < maxSort ? h(`${monthKey}:${kpiId}`) % 4 : 0;

  if (tier === 'G') return 92 + (h(`${kpiId}:${monthKey}`) % 7) - drift;
  if (tier === 'Y') return 72 + (h(`${kpiId}:${monthKey}:y`) % 13) - (drift > 0 ? drift - 1 : 0);
  return 42 + (h(`${kpiId}:${monthKey}:r`) % 18) + (drift > 0 ? drift : 0);
}

function buildKpiList() {
  const list = [];
  let globalIdx = 0;
  Object.entries(DEPT_CAPS).forEach(([deptId, cap]) => {
    const names = KPI_MASTER[deptId].slice(0, cap);
    if (names.length < cap) {
      throw new Error(`${deptId} needs ${cap} KPIs but only ${names.length} defined`);
    }
    names.forEach((name, i) => {
      list.push({
        dept_id: deptId,
        name,
        kpi_id: makeKpiId(deptId, name),
        seed_tier: TIERS[(globalIdx + i) % TIERS.length]
      });
    });
    globalIdx += names.length;
  });
  if (list.length !== 100) {
    throw new Error(`Expected 100 KPIs, got ${list.length}`);
  }
  return list;
}

(async () => {
  const kpis = buildKpiList();
  const pool = await getPool();

  await pool.request().query(`
    DELETE FROM PerformanceData;
    DELETE FROM KPIs;
  `);

  const kpiTable = new sql.Table('KPIs');
  kpiTable.create = false;
  kpiTable.columns.add('kpi_id', sql.VarChar(400), { nullable: false });
  kpiTable.columns.add('dept_id', sql.VarChar(10), { nullable: false });
  kpiTable.columns.add('name', sql.NVarChar(255), { nullable: false });
  kpiTable.columns.add('unit', sql.NVarChar(50), { nullable: false });
  kpiTable.columns.add('min_value', sql.Float, { nullable: false });
  kpiTable.columns.add('max_value', sql.Float, { nullable: false });
  kpiTable.columns.add('weight', sql.Float, { nullable: false });
  kpiTable.columns.add('polarity', sql.VarChar(10), { nullable: false });

  kpis.forEach((k) => {
    kpiTable.rows.add(k.kpi_id, k.dept_id, k.name, 'pct', 0, 100, 1, 'HIGHER');
  });

  await pool.request().bulk(kpiTable);

  const months = (
    await pool.request().query(
      'SELECT month_key, month_num, year_num, sort_order FROM ReportingMonths ORDER BY sort_order'
    )
  ).recordset;

  const maxSort = Math.max(...months.map((m) => m.sort_order));
  const perfTable = new sql.Table('PerformanceData');
  perfTable.create = false;
  perfTable.columns.add('kpi_id', sql.VarChar(400), { nullable: false });
  perfTable.columns.add('actual_value', sql.Float, { nullable: false });
  perfTable.columns.add('entry_month', sql.Int, { nullable: false });
  perfTable.columns.add('entry_year', sql.Int, { nullable: false });

  kpis.forEach((k) => {
    months.forEach((m) => {
      perfTable.rows.add(
        k.kpi_id,
        tierActual(k.seed_tier, k.kpi_id, m.month_key, m.sort_order, maxSort),
        m.month_num,
        m.year_num
      );
    });
  });

  await pool.request().bulk(perfTable);

  for (const [deptId, cap] of Object.entries(DEPT_CAPS)) {
    await pool.request()
      .input('deptId', sql.VarChar(10), deptId)
      .input('w', sql.Decimal(5, 2), cap)
      .query('UPDATE Departments SET weight = @w WHERE dept_id = @deptId');
  }

  const counts = await pool.request().query(`
    SELECT COUNT(*) AS kpi_cnt FROM KPIs;
    SELECT COUNT(*) AS perf_cnt FROM PerformanceData;
    SELECT dept_id, COUNT(*) AS n FROM KPIs GROUP BY dept_id ORDER BY dept_id;
  `);

  const kpiCnt = counts.recordsets[0][0].kpi_cnt;
  const perfCnt = counts.recordsets[1][0].perf_cnt;

  console.log(`Seeded ${kpiCnt} KPIs (weight 1 each).`);
  console.log(`Seeded ${perfCnt} PerformanceData rows (${months.length} months).`);
  console.log('Per department:', counts.recordsets[2].map((r) => `${r.dept_id}:${r.n}`).join(', '));

  if (kpiCnt !== 100 || perfCnt !== 600) {
    throw new Error(`Seed incomplete: expected 100 KPIs and 600 performance rows, got ${kpiCnt} and ${perfCnt}`);
  }
  process.exit(0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
