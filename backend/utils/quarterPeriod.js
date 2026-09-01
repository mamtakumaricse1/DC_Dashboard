/**
 * Fiscal quarter labels — April-start year (matches DistrictConfig default).
 */
const { toMonthKey } = require('./reportingMonths');

const MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

function getQuarterKey(monthKey, fiscalStartMonth = 4) {
  const [y, m] = monthKey.split('-').map(Number);
  const fiscalYear = m >= fiscalStartMonth ? y : y - 1;
  const monthInFy = m >= fiscalStartMonth ? m - fiscalStartMonth : m + (12 - fiscalStartMonth);
  const q = Math.floor(monthInFy / 3) + 1;
  return `${fiscalYear}-Q${q}`;
}

function getQuarterMonthKeys(quarterKey, fiscalStartMonth = 4) {
  const [fy, qPart] = quarterKey.split('-Q');
  const fiscalYear = Number(fy);
  const q = Number(qPart);
  if (!fiscalYear || !q || q < 1 || q > 4) return [];

  const keys = [];
  for (let i = 0; i < 3; i += 1) {
    const monthNum = fiscalStartMonth + (q - 1) * 3 + i;
    if (monthNum <= 12) {
      keys.push(toMonthKey(fiscalYear, monthNum));
    } else {
      keys.push(toMonthKey(fiscalYear + 1, monthNum - 12));
    }
  }
  return keys;
}

function formatQuarterRangeLabel(quarterKey, fiscalStartMonth = 4) {
  const months = getQuarterMonthKeys(quarterKey, fiscalStartMonth);
  if (!months.length) return quarterKey;

  const [y1, m1] = months[0].split('-').map(Number);
  const [y2, m2] = months[months.length - 1].split('-').map(Number);
  const start = MONTH_SHORT[m1 - 1];
  const end = MONTH_SHORT[m2 - 1];

  if (y1 === y2) {
    return start === end ? `${start} ${y2}` : `${start}–${end} ${y2}`;
  }
  return `${start} ${y1}–${end} ${y2}`;
}

/** e.g. Q1 (Apr–Jun 2026) */
function formatQuarterReportingLabel(monthKey, fiscalStartMonth = 4) {
  const quarterKey = getQuarterKey(monthKey, fiscalStartMonth);
  const qNum = quarterKey.split('-Q')[1];
  const range = formatQuarterRangeLabel(quarterKey, fiscalStartMonth);
  return `Q${qNum} (${range})`;
}

function isQuarterEndMonth(monthKey, fiscalStartMonth = 4) {
  const months = getQuarterMonthKeys(getQuarterKey(monthKey, fiscalStartMonth), fiscalStartMonth);
  return months.length > 0 && monthKey === months[months.length - 1];
}

function getQuarterEndMonthKey(monthKey, fiscalStartMonth = 4) {
  const months = getQuarterMonthKeys(getQuarterKey(monthKey, fiscalStartMonth), fiscalStartMonth);
  return months[months.length - 1] || monthKey;
}

function buildQuarterEntryContext(kpi, activeMonthKey, fiscalStartMonth = 4) {
  if (!activeMonthKey || kpi.freq !== 'Q') {
    return null;
  }

  const quarterKey = getQuarterKey(activeMonthKey, fiscalStartMonth);
  const quarterMonths = getQuarterMonthKeys(quarterKey, fiscalStartMonth);
  const quarterEndMonth = quarterMonths[quarterMonths.length - 1];
  const dueThisMonth = activeMonthKey === quarterEndMonth;

  return {
    reporting_quarter_key: quarterKey,
    reporting_quarter_label: formatQuarterReportingLabel(activeMonthKey, fiscalStartMonth),
    reporting_quarter_range: formatQuarterRangeLabel(quarterKey, fiscalStartMonth),
    reporting_quarter_months: quarterMonths,
    quarter_end_month: quarterEndMonth,
    quarter_due_this_month: dueThisMonth,
    quarter_due_note: dueThisMonth
      ? `File figures for ${formatQuarterRangeLabel(quarterKey, fiscalStartMonth)}.`
      : `Quarterly — file when reporting ${MONTH_SHORT[Number(quarterEndMonth.split('-')[1]) - 1]} (${formatQuarterRangeLabel(quarterKey, fiscalStartMonth)}).`
  };
}

module.exports = {
  MONTH_SHORT,
  getQuarterKey,
  getQuarterMonthKeys,
  formatQuarterRangeLabel,
  formatQuarterReportingLabel,
  isQuarterEndMonth,
  getQuarterEndMonthKey,
  buildQuarterEntryContext
};
