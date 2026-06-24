/** Distinct bar colors — one per department (14 KRAs). */
export const DEPT_CHART_COLORS = [
  "#1e3a5f",
  "#2563eb",
  "#16a34a",
  "#ca8a04",
  "#dc2626",
  "#7c3aed",
  "#0891b2",
  "#db2777",
  "#ea580c",
  "#4d7c0f",
  "#b45309",
  "#be123c",
  "#0369a1",
  "#475569"
];

export function deptChartColor(index) {
  return DEPT_CHART_COLORS[index % DEPT_CHART_COLORS.length];
}

export function deptColorMap(departments) {
  const map = {};
  (departments || []).forEach((d, i) => {
    map[d.id] = deptChartColor(i);
  });
  return map;
}
