/** URL paths for admin / dept dashboards. */
export const PATHS = {
  login: "/login",
  admin: "/admindashboard",
  dept: "/deptdashboard"
};

export const ADMIN_TABS = [
  "home",
  "submissions",
  "target-followup",
  "overview",
  "action-tracker",
  "contacts",
  "history"
];

export const DEPT_TABS = ["data-submission", "action-tracker"];

export function adminPath(tab = "home") {
  return tab === "home" ? PATHS.admin : `${PATHS.admin}/${tab}`;
}

export function deptPath(tab = "data-submission") {
  return `${PATHS.dept}/${tab}`;
}

export function tabFromAdminUrl(pathname) {
  const seg = pathname.replace(/^\/admindashboard\/?/, "").split("/")[0];
  if (!seg) return "home";
  return ADMIN_TABS.includes(seg) ? seg : "home";
}

export function tabFromDeptUrl(pathname) {
  const seg = pathname.replace(/^\/deptdashboard\/?/, "").split("/")[0];
  if (!seg) return "data-submission";
  return DEPT_TABS.includes(seg) ? seg : "data-submission";
}
