/**
 * Dashboard API smoke + integration tests.
 * Run: node scripts/test-dashboard-api.js
 * Requires: backend server on port 3001, SQL Server connected.
 */
const API = process.env.API_BASE || 'http://localhost:3001';

const ADMIN = { username: 'admin', password: 'admin123' };
const DEPT = { username: 'd01_health_nhm', password: '123' };

let passed = 0;
let failed = 0;

function ok(name, cond, detail = '') {
  if (cond) {
    passed += 1;
    console.log(`  PASS  ${name}${detail ? ` — ${detail}` : ''}`);
  } else {
    failed += 1;
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

async function login(creds) {
  const res = await fetch(`${API}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(creds)
  });
  const body = await res.json();
  return { status: res.status, body };
}

async function authedGet(path, token) {
  const res = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { status: res.status, body };
}

async function run() {
  console.log('\n=== TPI Dashboard API Tests ===\n');

  // Health
  const root = await fetch(`${API}/`);
  ok('API root responds', root.status === 200, await root.text());

  // Auth — invalid
  const badLogin = await login({ username: 'admin', password: 'wrong' });
  ok('Rejects bad password', badLogin.status === 401);

  // Auth — admin
  const adminLogin = await login(ADMIN);
  ok('Admin login', adminLogin.status === 200 && adminLogin.body.token);
  const adminToken = adminLogin.body.token;
  ok('Admin role', adminLogin.body.user?.role === 'ADMIN');

  // Auth — dept
  const deptLogin = await login(DEPT);
  ok('Dept login', deptLogin.status === 200 && deptLogin.body.token);
  const deptToken = deptLogin.body.token;
  ok('Dept mapped to D01', deptLogin.body.user?.dept_id === 'D01');

  // Config
  const config = await authedGet('/api/dashboard/config', adminToken);
  ok('GET /config', config.status === 200);
  ok('District config present', config.body.district?.districtName);
  ok('Reporting cycle present', config.body.reportingCycle?.activeReportingMonth);

  // Summary
  const summary = await authedGet('/api/dashboard/summary', adminToken);
  ok('GET /summary', summary.status === 200);
  ok('Departments array', Array.isArray(summary.body.departments) && summary.body.departments.length === 14);
  ok('124 KPIs in system', (summary.body.totalKpis || 0) >= 124, `count=${summary.body.totalKpis}`);
  ok('District PI number', typeof summary.body.districtPI === 'number');
  ok('dcHome payload', summary.body.dcHome?.submissionTracker?.length === 14);
  ok('Submission tracker rows', summary.body.dcHome.submissionTracker.every((r) => r.deptId && r.status));
  ok('Alerts object', summary.body.dcHome.alerts != null);

  const deptsWithScore = summary.body.departments.filter((d) => d.score != null);
  ok('At least one KRA has score', deptsWithScore.length > 0, `${deptsWithScore.length}/14`);
  ok('District TPI in range', summary.body.districtPI >= 0 && summary.body.districtPI <= 100,
    `TPI=${summary.body.districtPI}`);

  // History
  const history = await authedGet('/api/dashboard/history?months=6', adminToken);
  ok('GET /history', history.status === 200);
  ok('History departments', Array.isArray(history.body.departments));

  // Contacts (admin only)
  const contacts = await authedGet('/api/dashboard/contacts', adminToken);
  ok('GET /contacts', contacts.status === 200);
  ok('14 contacts', contacts.body.contacts?.length === 14);

  const deptContacts = await authedGet('/api/dashboard/contacts', deptToken);
  ok('Contacts blocked for dept', deptContacts.status === 403);

  // Dept context
  const ctx = await authedGet('/api/dept/context', deptToken);
  ok('GET /dept/context', ctx.status === 200);
  ok('Dept submission locked', ctx.body.reportingCycle?.deptSubmissionLocked === true);

  // Dept KPIs
  const kpis = await authedGet('/api/dept/kpis/D01', deptToken);
  ok('GET /dept/kpis/D01', kpis.status === 200);
  ok('KPI list for health', Array.isArray(kpis.body.kpis) && kpis.body.kpis.length > 0);

  // Scoring sanity — KRA scores in 0-100
  const kraScores = (summary.body.departments || []).map((d) => d.score).filter((s) => s != null);
  ok('KRA scores in 0–100', kraScores.every((s) => s >= 0 && s <= 100), `n=${kraScores.length}`);

  // Drill-down KPI detail (admin)
  const drill = await authedGet('/api/dashboard/dept/D01/kpis?month=5&year=2026', adminToken);
  ok('GET /dept/D01/kpis drill-down', drill.status === 200);
  ok('Drill-down has KPIs', Array.isArray(drill.body.kpis) && drill.body.kpis.length > 0);
  const kpiScores = (drill.body.kpis || []).map((k) => k.score).filter((s) => s != null);
  ok('Drill-down KPI scores 0–100', kpiScores.length === 0 || kpiScores.every((s) => s >= 0 && s <= 100),
    `n=${kpiScores.length}`);

  // RAG values valid
  const rags = (summary.body.departments || []).map((d) => d.ragStatus).filter(Boolean);
  ok('RAG statuses valid', rags.every((r) => ['GREEN', 'YELLOW', 'RED'].includes(r)));

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error('Test runner error:', err);
  process.exit(1);
});
