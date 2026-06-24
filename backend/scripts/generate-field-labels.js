/**
 * Generate field1/field2 labels for ALL 124 KPIs.
 * field1 = base/total (denominator), field2 = achieved/events (numerator).
 * Score % = (field2 ÷ field1) × 100  (deaths, backlog = lower is better).
 * Run: node backend/scripts/generate-field-labels.js
 */
const fs = require('fs');
const path = require('path');
const { buildKpiRows } = require('../constants/kpiCatalog');

/**
 * Explicit labels by dept + indicator number — absolute counts HoDs enter in the field.
 * Order matters only within fallback rules below; this map is checked first.
 */
const EXPLICIT_LABELS = {
  // D01 — Health & NHM
  'D01:1': ['Total PHCs', 'Scoring ≥70%'],
  'D01:2': ['Total Deliveries', 'Institutional Deliveries'],
  'D01:3': ['Registered Children (0–1 yr)', 'Fully Immunized'],
  'D01:4': ['Active Sub-Centres', 'Tele-OPD Consults'],
  'D01:5': ['Registered Pregnancies', 'With 4 ANC Visits'],
  'D01:6': ['Total Households (Priority Villages)', 'Households with Ayushman Card'],
  'D01:7': ['Total PHCs', 'Stock-out Days (This Month)'],
  'D01:8': ['Sanctioned OST Capacity', 'Active OST Patients'],
  'D01:9': ['Enrolled 3 Months Ago', 'Retained at 3 Months'],
  'D01:10': ['District Population', 'TB Cases Notified'],
  'D01:11': ['Registered Mothers', 'Maternal Deaths'],
  'D01:12': ['Registered Infants', 'Infant Deaths'],

  // D02 — School Education
  'D02:1': ['Total Teachers', 'Teachers Present'],
  'D02:2': ['Total Students', 'Students Present'],
  'D02:3': ['Students Assessed', 'Students Achieving Proficiency'],
  'D02:4': ['Students at Start of Academic Year', 'Students Continuing in School'],
  'D02:5': ['Total Schools', 'Schools with Functional Toilets'],
  'D02:6': ['Total Schools', 'Schools with Drinking Water Facility'],
  'D02:7': ['Students Appeared', 'Students Passed'],
  'D02:8': ['Students Appeared', 'Students Passed'],
  'D02:9': ['Children Identified (Out-of-School)', 'Children Mainstreamed'],
  'D02:10': ['Annual Training Target (Days)', 'Training Days Completed'],
  'D02:11': ['Total Schools', 'Schools Receiving Mid-Day Meal Daily'],
  'D02:12': ['Total Hostel Capacity', 'Occupied Seats'],

  // D03 — ICDS / WCD
  'D03:1': ['Total AWCs', 'Functional AWCs (≥70% Score)'],
  'D03:2': ['Target Children (0–6 Years)', 'Registered in ICDS MIS'],
  'D03:3': ['Total AWCs', 'AWCs with Daily Pre-school Activity'],
  'D03:4': ['Annual Target AWCs', 'Upgraded Saksham AWCs (FY Cumulative)'],
  'D03:5': ['Eligible Beneficiaries', 'Beneficiaries Covered'],
  'D03:6': ['Total AWCs', 'AWCs Providing Hot Cooked Meals'],
  'D03:7': ['Registered Children (0–6 Years)', 'Severely Underweight Children'],
  'D03:8': ['Children Assessed (Class 1 Entrants)', 'Stunted Children'],
  'D03:9': ['Total AWWs', 'AWWs Active on POSHAN App'],

  // D04 — Social Justice / Youth
  'D04:1': ['Sanctioned Treatment Capacity', 'New Patients Inducted'],
  'D04:2': ['Recovered Users Eligible', 'Placed in Skilling/Employment'],
  'D04:3': ['Sanctioned Peer Counsellor Posts', 'Active Peer Counsellors'],
  'D04:4': ['Schools Targeted', 'Drug Awareness Sessions Conducted'],
  'D04:5': ['Circles in District', 'Sports Tournaments Held'],
  'D04:6': ['Target Teams (League)', 'Registered Teams'],
  'D04:7': ['Monthly Skilling Target', 'Youth Enrolments This Month'],
  'D04:8': ['NDPS Cases Registered', 'NDPS Cases Disposed'],

  // D05 — Sanitation / ULB
  'D05:1': ['Annual ODF-Plus Target (Villages)', 'Villages Declared ODF-Plus (FY Cumulative)'],
  'D05:2': ['Total Households (Khonsa Town)', 'Households with Door-to-Door Collection'],
  'D05:3': ['Total Public Toilets Constructed', 'Functional Public Toilets'],
  'D05:4': ['Target Participating Villages', 'Villages Participating in Swachh Tirap'],
  'D05:5': ['Total Households (Town)', 'Households Segregating Waste'],
  'D05:6': ['Total Urban Drains', 'Drains Cleaned Pre-Monsoon'],

  // D06 — PWD / Infrastructure
  'D06:1': ['Total Road Length Assessed (km)', 'Road Length Passable (Dry Season)'],
  'D06:2': ['Total Road Length Assessed (km)', 'Road Length Passable (Monsoon)'],
  'D06:3': ['Total PMGSY Projects', 'Projects On Schedule'],
  'D06:4': ['Total JJM Tap Connections', 'Functional Tap Connections'],
  'D06:5': ['Total Villages', 'Villages with 24×7 Power'],
  'D06:6': ['Total Villages', 'Villages with 4G Coverage'],
  'D06:7': ['Total Bridges and Culverts', 'Damaged and Awaiting Repair'],
  'D06:8': ['Total Possible Supply Hours', 'Outage Hours This Month'],

  // D07 — Power / DISCOM
  'D07:1': ['Location-Days (HQs × Days in Month)', 'Total Supply Hours'],
  'D07:2': ['Total Possible Supply Hours', 'Unscheduled Outage Hours'],
  'D07:3': ['Total Villages', 'Villages with Functional 11kV/LT Connectivity'],
  'D07:4': ['Total Households', 'Households with Metered Connection'],
  'D07:5': ['Connections Energised This Month', 'Total Days (Application to Energisation)'],
  'D07:6': ['Units Input (Energy Supplied)', 'Units Billed'],
  'D07:7': ['Revenue Billed (₹)', 'Revenue Collected (₹)'],
  'D07:8': ['Total Distribution Transformers', 'Transformers Failed This Month'],
  'D07:9': ['Annual Installation Target', 'Installations Completed (FY Cumulative)'],
  'D07:10': ['Scheduled Maintenance Tasks', 'Tasks Completed On Schedule'],

  // D08 — Police
  'D08:1': ['Total Complaints Received', 'Complaints Converted to FIR'],
  'D08:2': ['Pending Cases (Start of Month)', 'Cases Disposed This Month'],
  'D08:3': ['NDPS Seizures', 'Treatment Referrals from Seizures'],
  'D08:4': ['District Population (lakhs)', 'CAW FIRs Registered'],
  'D08:5': ['CAW Cases Reaching Judgment', 'Cases with Conviction'],
  'D08:6': ['Target Grievance Days (District)', 'Grievance Days Held'],
  'D08:7': ['Target Acres for Destruction', 'Acres Destroyed'],
  'D08:8': ['Villages/Areas Monitored', 'Communal/Tribal Tension Incidents'],

  // D09 — Agriculture
  'D09:1': ['Target Demonstration Plots', 'Active Demonstration Plots'],
  'D09:2': ['Target FPOs', 'FPOs Active with >100 Members'],
  'D09:3': ['Total Farmer Households', 'Farmers with KCC'],
  'D09:4': ['Total PM-Kisan Beneficiaries', 'Beneficiaries Who Received Instalment'],
  'D09:5': ['Annual Soil Health Card Target', 'Cards Distributed (FY Cumulative)'],
  'D09:6': ['Annual Sapling Target', 'Agarwood Saplings Distributed (FY Cumulative)'],
  'D09:7': ['Target Cardamom Acres', 'Acres Brought Under Cultivation'],
  'D09:8': ['Total Mithun Population', 'Mithun Vaccinated'],
  'D09:9': ['Total SHGs', 'SHGs with Active Bank Credit Line'],
  'D09:10': ['Annual Placement Target', 'DDU-GKY Placements (FY Cumulative)'],

  // D10 — Food & Welfare
  'D10:1': ['Annual Saturation Village Target', 'Villages Where Camp Held (FY Cumulative)'],
  'D10:2': ['Residents in Priority Villages', 'Residents with Aadhaar'],
  'D10:3': ['Total Adult Households', 'Households with Jan Dhan Account'],
  'D10:4': ['Ration Card Applications Received', 'Pending Backlog'],
  'D10:5': ['PMAY-G Houses Sanctioned', 'PMAY-G Houses Completed'],
  'D10:6': ['Total NSAP Beneficiaries', 'Beneficiaries Who Received Pension'],
  'D10:7': ['Approved PM-JANMAN Activities', 'Activities Executed'],
  'D10:8': ['Total DAJGUA Plan Activities', 'Activities On Schedule'],

  // D11 — Revenue
  'D11:1': ['Mutation Cases Received', 'Cases Disposed Within 30 Days'],
  'D11:2': ['Total Revenue Villages/Parcels', 'Records Digitised'],
  'D11:3': ['Total Court Cases (District)', 'Pending Cases'],
  'D11:4': ['Target Public Hearing Days', 'Hearing Days Held (CO + SDO Darbar)'],
  'D11:5': ['Total Revenue Court Cases', 'Cases Disposed'],

  // D12 — Transport / Jan Suvidha
  'D12:1': ['ST Certificate Applications Received', 'Issued Within 15 Days'],
  'D12:2': ['PRC Applications Received', 'Issued Within 15 Days'],
  'D12:3': ['TRC Applications Received', 'Issued Within 15 Days'],
  'D12:4': ['Government ID Applications Received', 'Issued Within 15 Days'],
  'D12:5': ['ILP Applications Received', 'Issued Within 7 Days'],
  'D12:6': ['Driving Licence Applications Received', 'Forwarded to DTO Within 3 Days'],
  'D12:7': ['Expected Monthly Volume', 'Driving Licence Applications Received'],
  'D12:8': ['Driving Licence Applications Received', 'Pending Forwarding >3 Days'],
  'D12:9': ['Vehicle Registration Applications Received', 'Forwarded to DTO Within 3 Days'],
  'D12:10': ['Expected Monthly Volume', 'Vehicle Registration Applications Received'],
  'D12:11': ['Vehicle Registration Applications Received', 'Pending Forwarding >3 Days'],
  'D12:12': ['Citizens Surveyed', 'Citizens Satisfied'],

  // D13 — Disaster Management
  'D13:1': ['Drills Planned', 'Drills Conducted'],
  'D13:2': ['Total PHCs and Schools', 'Pre-Monsoon Stocking Complete by April'],
  'D13:3': ['Target Villages', 'Villages with Documented DRR Plans'],
  'D13:4': ['Reported Incidents', 'Incidents with Relief Within 7 Days'],
  'D13:5': ['Flood/Landslide-Prone Villages', 'Villages with Early Warning Coverage'],
  'D13:6': ['Critical Locations', 'Locations with Functional VHF/HF Radio'],

  // D14 — DC Office
  'D14:1': ['Field Days Target (DC)', 'Field Days Completed'],
  'D14:2': ['Number of SDOs', 'Total SDO Field Days'],
  'D14:3': ['Officers Required to Submit Diaries', 'Tour Diaries Submitted On Time'],
  'D14:4': ['Quarterly Feedback Target', 'GB 360 Feedback Forms Received'],
  'D14:5': ['Monthly Grievance Target', 'Grievances Registered'],
  'D14:6': ['Total Grievances Open', 'Grievances Disposed Within 30 Days'],
  'D14:7': ['Citizens Surveyed (Closed Cases)', 'Citizens Satisfied'],
  'D14:9': ['Monthly Communications Target', 'Press Notes Issued'],
  'D14:10': ['Sanctioned Critical Posts', 'Vacant Critical Posts']
};

function shortLabels(kpi) {
  const key = `${kpi.deptId}:${kpi.num}`;
  if (EXPLICIT_LABELS[key]) return EXPLICIT_LABELS[key];

  const n = kpi.name;
  if (/% of/i.test(n)) {
    const m = n.match(/^(.+?)\s*\(%\s*of\s+(.+?)\)/i);
    if (m) return [`Total ${m[2].replace(/\).*/, '').trim()}`, m[1].trim()];
  }
  if (kpi.polarity === 'LOWER') return ['Total Base', 'Adverse Count'];
  return ['Total Base', 'Achieved Count'];
}

const kpis = buildKpiRows();
const map = {};
const missing = [];

kpis.forEach((k) => {
  if (k.unitLabel === 'yes/no') return;
  const key = `${k.deptId}:${k.num}`;
  if (!EXPLICIT_LABELS[key]) missing.push(key + ' ' + k.name);
  map[k.kpi_id] = shortLabels(k);
});

if (missing.length) {
  console.warn('Missing explicit labels (using fallback):', missing.length);
  missing.forEach((m) => console.warn(' ', m));
}

const backendOut = path.join(__dirname, '../constants/kpiFieldLabels.json');
const frontendOut = path.join(__dirname, '../../frontend/src/constants/kpiFieldLabels.json');
const json = JSON.stringify(map, null, 2) + '\n';
fs.writeFileSync(backendOut, json);
fs.writeFileSync(frontendOut, json);
console.log('Wrote', Object.keys(map).length, 'label pairs (all KPIs)');
