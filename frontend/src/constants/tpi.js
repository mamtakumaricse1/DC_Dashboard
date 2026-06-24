/**
 * Shared Tirap Performance Index constants and small UI helpers.
 * Keep magic strings/defaults here so pages stay readable.
 */

/** Default shape before first API response (admin dashboard). */
export const EMPTY_DASHBOARD_DATA = {
  districtPI: 0,
  totalKpis: 0,
  selectedMonth: null,
  suggestedMonth: null,
  monthsAvailable: [],
  district: null,
  reportingCycle: null,
  kpiStatusCounts: { green: 0, yellow: 0, red: 0, totalIndicators: 0 },
  departments: [],
  actionTracker: [],
  priorCommitments: [],
  dcHome: null,
  measurementModel: null
};

/** DC review options for prior-month action commitments. */
export const COMPLETION_STATUS_OPTIONS = [
  "PENDING",
  "IN_PROGRESS",
  "PARTIAL",
  "COMPLETED",
  "MISSED"
];

/** Same thresholds as backend scoringService (≥90 green, ≥70 yellow). */
export const RAG_THRESHOLDS = { GREEN: 90, YELLOW: 70 };

/** Derive GREEN / YELLOW / RED from a 0–100 score. */
export function ragStatusFromScore(score) {
  const s = Number(score);
  if (Number.isNaN(s)) return "RED";
  if (s >= RAG_THRESHOLDS.GREEN) return "GREEN";
  if (s >= RAG_THRESHOLDS.YELLOW) return "YELLOW";
  return "RED";
}

/** Map RAG status to CSS class used in tables and badges. */
export function ragStatusClass(status) {
  if (status === "GREEN") return "status-green";
  if (status === "YELLOW") return "status-yellow";
  return "status-red";
}

/** Heatmap tile / cell background class. */
export function ragCellClass(status) {
  const s = (status || "RED").toLowerCase();
  return `rag-cell rag-cell--${s}`;
}

/** Short RAG legend for tooltips and headers. */
export const RAG_LEGEND = [
  { status: "GREEN", label: "≥90", desc: "On track" },
  { status: "YELLOW", label: "70–89", desc: "Watch" },
  { status: "RED", label: "<70", desc: "Needs action" }
];

/** One-line subtitles for each DC sidebar tab. */
export const DC_PAGE_GUIDE = {
  home: "Your district at a glance — score, heatmap, and what to act on now",
  submissions: "Which departments have filed this month's data",
  "target-followup": "Check results on targets you set earlier",
  overview: "All departments — tap a row for full KPI list",
  "action-tracker": "Set targets and action plans for indicators below 70",
  contacts: "Phone numbers for department heads",
  history: "Scores over past months"
};

/** One-line subtitles for department portal tabs. */
export const DEPT_PAGE_GUIDE = {
  "data-submission": "Enter last month's numbers — two fields per indicator, result calculates automatically",
  "action-tracker": "See your scores by month and what DC asked you to improve"
};

/** Canonical department order for KRA grid (D01–D14). */
export const KRA_DEPT_ORDER = [
  "D01", "D02", "D03", "D04", "D05", "D06", "D07",
  "D08", "D09", "D10", "D11", "D12", "D13", "D14"
];

/** All district indicators — each contributes equally to TPI. */
export const TOTAL_KPI_COUNT = 124;

/** Per-KPI share of district TPI (100 ÷ 124). */
export const EQUAL_KPI_TPI_PCT = Number((100 / TOTAL_KPI_COUNT).toFixed(5));

/** Format equal TPI share for tables and tags. */
export function formatTpiSharePct(value = EQUAL_KPI_TPI_PCT) {
  if (value == null || Number.isNaN(Number(value))) return "—";
  return `${Number(value)}%`;
}

/** Map trend arrow to short label. */
export function trendLabel(trend) {
  if (trend === "UP") return "↗ up";
  if (trend === "DOWN") return "↘ down";
  return "→ flat";
}

/** CSS class for deviation column (met vs missed target). */
export function deviationClass(deviation) {
  if (deviation == null) return "";
  return Number(deviation) >= 0 ? "deviation-met" : "deviation-miss";
}

/** Due-date status from reporting cycle engine. */
export function dueStatusClass(dueStatus) {
  if (dueStatus === "MET" || dueStatus === "ON_TRACK") return "due-badge due-badge--ok";
  if (dueStatus === "DUE_TODAY") return "due-badge due-badge--warn";
  if (dueStatus === "OVERDUE" || dueStatus === "MISSED") return "due-badge due-badge--late";
  return "due-badge due-badge--muted";
}
