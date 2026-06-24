/**
 * Frontend API client — all HTTP calls to the Express backend go through here.
 *
 * Sections:
 *   1. Session   — JWT access token + refresh token in localStorage
 *   2. Auth      — login, validate session
 *   3. Dashboard — summary, action items, history
 *   4. Dates     — month labels and fiscal year helpers
 *
 * Base URL: REACT_APP_API_BASE env var, or http://localhost:3001 in development.
 */

export const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:3001";
export const DASHBOARD_API = `${API_BASE}/api/dashboard`;
export const DEPT_API = `${API_BASE}/api/dept`;
export const AUTH_API = `${API_BASE}/api/auth`;

const TOKEN_KEY = "tpi_token";
const REFRESH_KEY = "tpi_refresh";
const USER_KEY = "tpi_user";

let refreshInFlight = null;

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

// ---------------------------------------------------------------------------
// Session storage (survives page refresh until token expires)
// ---------------------------------------------------------------------------

export function saveSession(accessToken, user, refreshToken = null) {
  localStorage.setItem(TOKEN_KEY, accessToken);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  if (refreshToken) {
    localStorage.setItem(REFRESH_KEY, refreshToken);
  }
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
  clearContactsCache();
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_KEY);
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function getAuthHeaders(extra = {}) {
  const token = getToken();
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra
  };
}

/** Client-side JWT expiry check (server still validates on /me). */
function isAccessTokenExpired(token) {
  if (!token) return true;
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    if (!payload.exp) return false;
    return Date.now() >= payload.exp * 1000;
  } catch {
    return true;
  }
}

export function hasStoredCredentials() {
  return Boolean(getToken() || getRefreshToken());
}

/** Exchange refresh token for a new access + refresh pair. */
export async function refreshAccessToken() {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return null;

    const res = await fetch(`${AUTH_API}/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken })
    });

    if (!res.ok) return null;

    const data = await res.json();
    if (!data.token || !data.user) return null;

    saveSession(data.token, data.user, data.refreshToken || refreshToken);
    return data.token;
  })();

  try {
    return await refreshInFlight;
  } finally {
    refreshInFlight = null;
  }
}

/** Wraps fetch — attaches JWT; refreshes once on 401 before clearing session. */
export async function fetchWithAuth(url, options = {}, retried = false) {
  const headers = {
    ...getAuthHeaders(),
    ...(options.body && !(options.body instanceof FormData)
      ? { "Content-Type": "application/json" }
      : {}),
    ...options.headers
  };

  const res = await fetch(url, { ...options, headers });

  if (res.status === 401 && !retried) {
    const renewed = await refreshAccessToken();
    if (renewed) {
      return fetchWithAuth(url, options, true);
    }
    clearSession();
    throw new Error("Session expired. Please log in again.");
  }

  if (res.status === 401) {
    clearSession();
    throw new Error("Session expired. Please log in again.");
  }

  return res;
}

// ---------------------------------------------------------------------------
// Date helpers (YYYY-MM keys used everywhere for reporting months)
// ---------------------------------------------------------------------------

export function toMonthLabel(monthKey) {
  if (!monthKey) return "";
  const [year, month] = monthKey.split("-");
  return `${MONTH_NAMES[Number(month) - 1]} ${year}`;
}

export function parseMonthKey(monthKey) {
  if (!monthKey || !monthKey.includes("-")) {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  }
  const [year, month] = monthKey.split("-").map(Number);
  return { year: year || new Date().getFullYear(), month: month || 1 };
}

export function buildMonthKey(year, month) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

/** Unique years from month keys, plus a sensible default range for browsing history. */
export function yearsFromMonthKeys(monthKeys = [], extraYearsBack = 4) {
  const years = new Set();
  const current = new Date().getFullYear();
  for (let y = current - extraYearsBack; y <= current + 1; y += 1) {
    years.add(y);
  }
  monthKeys.forEach((key) => {
    const { year } = parseMonthKey(key);
    if (year) years.add(year);
  });
  return Array.from(years).sort((a, b) => b - a);
}

export function monthKeysForYear(monthKeys, year) {
  return (monthKeys || []).filter((k) => parseMonthKey(k).year === year);
}

export function latestMonthKeyInYear(monthKeys, year) {
  const inYear = monthKeysForYear(monthKeys, year).sort();
  return inYear[inYear.length - 1] || null;
}

export const CALENDAR_MONTHS = MONTH_NAMES.map((short, i) => ({
  num: i + 1,
  short
}));

export function summaryQueryFromMonthKey(monthKey) {
  if (!monthKey) return "";
  const [year, month] = monthKey.split("-");
  return `?month=${Number(month)}&year=${Number(year)}`;
}

/** Apr–Mar fiscal year keys when ReportingMonths table is empty. */
export function getFiscalMonthKeys() {
  const now = new Date();
  const startYear = now.getMonth() + 1 >= 4 ? now.getFullYear() : now.getFullYear() - 1;
  const months = [];
  for (let m = 4; m <= 12; m += 1) {
    months.push(`${startYear}-${String(m).padStart(2, "0")}`);
  }
  for (let m = 1; m <= 3; m += 1) {
    months.push(`${startYear + 1}-${String(m).padStart(2, "0")}`);
  }
  return months;
}

export function formatDateTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

// ---------------------------------------------------------------------------
// API calls
// ---------------------------------------------------------------------------

export async function fetchDashboardSummary(monthKey = "") {
  const res = await fetchWithAuth(
    `${DASHBOARD_API}/summary${summaryQueryFromMonthKey(monthKey)}`
  );
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function fetchDeptKpiGuide(deptId) {
  const res = await fetchWithAuth(`${DEPT_API}/kpi-guide/${deptId}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to load KPI guide");
  }
  return res.json();
}

export async function fetchDeptKpiDetail(deptId, monthKey = "") {
  const res = await fetchWithAuth(
    `${DASHBOARD_API}/dept/${deptId}/kpis${summaryQueryFromMonthKey(monthKey)}`
  );
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function downloadReviewExport(monthKey = "", format = "csv") {
  const q = summaryQueryFromMonthKey(monthKey);
  const res = await fetchWithAuth(
    `${DASHBOARD_API}/export/review${q}${q ? "&" : "?"}format=${format}`
  );
  if (!res.ok) throw new Error("Export failed");

  const blob = await res.blob();
  const disposition = res.headers.get("Content-Disposition") || "";
  const match = disposition.match(/filename="?([^"]+)"?/);
  const filename = match?.[1] || `TPI-Review.${format === "csv" ? "csv" : "html"}`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function sendOwnerReminder({ deptId, kpiId, actionId, indicator, channel = "COPY" }) {
  const res = await fetchWithAuth(`${DASHBOARD_API}/remind`, {
    method: "POST",
    body: JSON.stringify({ deptId, kpiId, actionId, indicator, channel })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Reminder failed");
  return data;
}

export async function updateActionItem(actionId, payload) {
  const res = await fetchWithAuth(`${DASHBOARD_API}/action-items/${actionId}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to update action item");
  }
  return res.json();
}

export async function validateSession() {
  const refresh = getRefreshToken();
  let token = getToken();

  if (!token && !refresh) {
    clearSession();
    return null;
  }

  try {
    if (!token || isAccessTokenExpired(token)) {
      if (!refresh) {
        clearSession();
        return null;
      }
      const renewed = await refreshAccessToken();
      if (!renewed) {
        clearSession();
        return null;
      }
      token = getToken();
    }

    let res = await fetch(`${AUTH_API}/me`, { headers: getAuthHeaders() });

    if (res.status === 401) {
      const renewed = await refreshAccessToken();
      if (!renewed) {
        clearSession();
        return null;
      }
      res = await fetch(`${AUTH_API}/me`, { headers: getAuthHeaders() });
    }

    if (!res.ok) {
      clearSession();
      return null;
    }

    const data = await res.json();
    if (data.user) {
      saveSession(getToken(), data.user, getRefreshToken());
      return data.user;
    }

    clearSession();
    return null;
  } catch {
    clearSession();
    return null;
  }
}

export async function logoutSession() {
  const refreshToken = getRefreshToken();
  try {
    if (refreshToken) {
      await fetch(`${AUTH_API}/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders()
        },
        body: JSON.stringify({ refreshToken })
      });
    }
  } catch {
    /* best effort */
  }
  clearSession();
}

/** Public district branding for login screen (no auth). */
export async function fetchPublicConfig() {
  const res = await fetch(`${AUTH_API}/config`);
  if (!res.ok) return null;
  return res.json();
}

// ---------------------------------------------------------------------------
// Contacts cache (single source: GET /api/dashboard/contacts)
// ---------------------------------------------------------------------------

let contactsCache = null;

export async function fetchContacts(force = false) {
  if (contactsCache && !force) return contactsCache;
  const res = await fetchWithAuth(`${DASHBOARD_API}/contacts`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to load contacts");
  }
  const data = await res.json();
  contactsCache = Array.isArray(data.contacts) ? data.contacts : [];
  return contactsCache;
}

export function getCachedContact(deptId) {
  return contactsCache?.find((c) => c.deptId === deptId) || null;
}

export function clearContactsCache() {
  contactsCache = null;
}
