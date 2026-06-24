/**
 * Load department dashboard summary (action tracker + RAG counts).
 */
import { useCallback, useState } from "react";
import { fetchDashboardSummary } from "../utils/api";

const EMPTY_COUNTS = { green: 0, yellow: 0, red: 0, totalIndicators: 0 };

const EMPTY_SUMMARY = {
  selectedMonth: null,
  monthsAvailable: [],
  department: null,
  actionTracker: [],
  priorCommitments: [],
  kpiStatusCounts: EMPTY_COUNTS
};

export default function useDeptDashboardSummary(deptId) {
  const [selectedMonth, setSelectedMonth] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [reportingCycle, setReportingCycle] = useState(null);
  const [district, setDistrict] = useState(null);

  const loadSummary = useCallback(
    async (monthKey = "") => {
      if (!deptId) return;
      setLoading(true);
      setLoadError("");
      try {
        const res = await fetchDashboardSummary(monthKey);
        const dept = (res.departments || []).find((d) => d.id === deptId) || null;
        setSummary({
          selectedMonth: res.selectedMonth,
          monthsAvailable: res.monthsAvailable || [],
          department: dept,
          actionTracker: (res.actionTracker || []).filter((row) => row.deptId === deptId),
          priorCommitments: (res.priorCommitments || []).filter((row) => row.deptId === deptId),
          kpiStatusCounts: dept
            ? {
                green: dept.greenCount,
                yellow: dept.yellowCount,
                red: dept.redCount,
                totalIndicators: dept.indicators
              }
            : EMPTY_COUNTS
        });
        setReportingCycle(res.reportingCycle || null);
        setDistrict(res.district || null);

        // Keep user-selected month when browsing history; default to active month on first load.
        if (monthKey) {
          setSelectedMonth(monthKey);
        } else {
          const active =
            res.reportingCycle?.activeReportingMonth ||
            res.suggestedMonth ||
            res.selectedMonth;
          if (active) setSelectedMonth(active);
        }
      } catch (err) {
        console.error("Dept dashboard load error:", err);
        setLoadError(err.message || "Failed to load department data.");
      } finally {
        setLoading(false);
      }
    },
    [deptId]
  );

  const activeMonth = reportingCycle?.activeReportingMonth || selectedMonth;

  return {
    selectedMonth,
    setSelectedMonth,
    loading,
    loadError,
    summary,
    reportingCycle,
    district,
    activeMonth,
    loadSummary
  };
}
