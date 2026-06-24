/**
 * Monthly review pack export — CSV (Excel) and HTML (print to PDF).
 */
const { MONTH_LABELS } = require('../constants/kra');

function csvEscape(val) {
  const s = val == null ? '' : String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function monthLabel(monthKey) {
  if (!monthKey) return '';
  const [y, m] = monthKey.split('-');
  return `${MONTH_LABELS[Number(m) - 1]} ${y}`;
}

function buildReviewCsv(payload) {
  const lines = [];
  const dc = payload.dcHome || {};
  const month = payload.selectedMonth;

  lines.push('Tirap Performance Index — Monthly Review Pack');
  lines.push(`Reporting Month,${csvEscape(monthLabel(month))}`);
  lines.push(`District TPI,${payload.districtPI}`);
  lines.push(`Green,${payload.kpiStatusCounts?.green || 0}`);
  lines.push(`Yellow,${payload.kpiStatusCounts?.yellow || 0}`);
  lines.push(`Red,${payload.kpiStatusCounts?.red || 0}`);
  lines.push('');

  lines.push('DEPARTMENT SUBMISSIONS');
  lines.push('Dept ID,Department,KRA,Status,Submitted At,Late');
  (dc.submissionTracker || []).forEach((s) => {
    lines.push([
      s.deptId,
      csvEscape(s.deptName),
      csvEscape(s.kra),
      s.statusLabel,
      s.submittedAt ? new Date(s.submittedAt).toISOString() : '',
      s.isLate ? 'Yes' : 'No'
    ].join(','));
  });
  lines.push('');

  lines.push('DEPARTMENT PERFORMANCE');
  lines.push('Dept ID,KRA,Score,Status,Green,Yellow,Red,Owner');
  (payload.departments || []).forEach((d) => {
    lines.push([
      d.id,
      csvEscape(d.kra),
      d.score,
      d.ragStatus,
      d.greenCount,
      d.yellowCount,
      d.redCount,
      csvEscape(d.owner)
    ].join(','));
  });
  lines.push('');

  lines.push('TARGET FOLLOW-UP');
  lines.push('Dept,KRA,Indicator,Target,Actual,Deviation,Due,Status');
  (dc.targetFollowUp || []).forEach((t) => {
    lines.push([
      csvEscape(t.deptId),
      csvEscape(t.kra),
      csvEscape(t.indicator),
      t.targetScore ?? '',
      t.actualScore ?? '',
      t.deviation ?? '',
      t.targetDate ?? '',
      t.completionStatus
    ].join(','));
  });
  lines.push('');

  lines.push('RED INDICATORS (CURRENT MONTH)');
  lines.push('Dept,KRA,Indicator,Score');
  (payload.actionTracker || []).forEach((t) => {
    lines.push([
      csvEscape(t.deptId),
      csvEscape(t.kra),
      csvEscape(t.indicator),
      t.indicatorScore
    ].join(','));
  });

  return lines.join('\n');
}

function buildReviewHtml(payload) {
  const dc = payload.dcHome || {};
  const month = monthLabel(payload.selectedMonth);
  const district = payload.district?.districtName || 'District';

  const deptRows = (payload.departments || [])
    .map(
      (d) => `<tr>
        <td>${d.kra}</td>
        <td>${d.score.toFixed(1)}</td>
        <td class="${d.ragStatus.toLowerCase()}">${d.ragStatus}</td>
        <td>${d.greenCount}</td>
        <td>${d.yellowCount}</td>
        <td>${d.redCount}</td>
        <td>${d.owner}</td>
      </tr>`
    )
    .join('');

  const subRows = (dc.submissionTracker || [])
    .map(
      (s) => `<tr>
        <td>${s.deptName}</td>
        <td>${s.statusLabel}</td>
        <td>${s.submittedAt ? new Date(s.submittedAt).toLocaleString('en-IN') : '—'}</td>
      </tr>`
    )
    .join('');

  const targetRows = (dc.targetFollowUp || [])
    .map(
      (t) => `<tr>
        <td>${t.kra}</td>
        <td>${t.indicator}</td>
        <td>${t.targetScore ?? '—'}</td>
        <td>${t.actualScore ?? '—'}</td>
        <td>${t.deviation ?? '—'}</td>
        <td>${t.targetDate ?? '—'}</td>
        <td>${t.dueLabel || ''}</td>
      </tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>TPI Review ${month}</title>
<style>
  body { font-family: Segoe UI, sans-serif; margin: 32px; color: #1a2332; }
  h1 { color: #1e3a5f; font-size: 22px; }
  h2 { color: #1e3a5f; font-size: 16px; margin-top: 28px; border-bottom: 2px solid #dde3eb; padding-bottom: 6px; }
  .summary { display: flex; gap: 20px; margin: 20px 0; }
  .card { border: 1px solid #dde3eb; padding: 14px 20px; border-radius: 8px; min-width: 100px; }
  .card strong { font-size: 28px; display: block; color: #1e3a5f; }
  table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }
  th { background: #e8eef5; text-align: left; padding: 8px; }
  td { border-bottom: 1px solid #dde3eb; padding: 8px; }
  .green { color: #16a34a; font-weight: 600; }
  .yellow { color: #ca8a04; font-weight: 600; }
  .red { color: #dc2626; font-weight: 600; }
  @media print { body { margin: 16px; } }
</style></head><body>
  <h1>${district} — Performance Review</h1>
  <p>Reporting month: <strong>${month}</strong> · Generated ${new Date().toLocaleString('en-IN')}</p>
  <div class="summary">
    <div class="card"><span>District TPI</span><strong>${payload.districtPI.toFixed(1)}</strong></div>
    <div class="card"><span>Green</span><strong>${payload.kpiStatusCounts?.green || 0}</strong></div>
    <div class="card"><span>Yellow</span><strong>${payload.kpiStatusCounts?.yellow || 0}</strong></div>
    <div class="card"><span>Red</span><strong>${payload.kpiStatusCounts?.red || 0}</strong></div>
  </div>
  <h2>Department Submissions</h2>
  <table><thead><tr><th>Department</th><th>Status</th><th>Submitted</th></tr></thead><tbody>${subRows}</tbody></table>
  <h2>KRA Performance</h2>
  <table><thead><tr><th>KRA</th><th>Score</th><th>Status</th><th>G</th><th>Y</th><th>R</th><th>Owner</th></tr></thead><tbody>${deptRows}</tbody></table>
  <h2>Target Follow-up</h2>
  <table><thead><tr><th>KRA</th><th>Indicator</th><th>Target</th><th>Actual</th><th>Dev</th><th>Due</th><th>Due status</th></tr></thead><tbody>${targetRows || '<tr><td colspan="7">None</td></tr>'}</tbody></table>
  <script>window.onload = () => window.print();</script>
</body></html>`;
}

module.exports = { buildReviewCsv, buildReviewHtml, monthLabel };
