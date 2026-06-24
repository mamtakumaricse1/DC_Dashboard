/**
 * KPI list + form state for department monthly submission.
 */
import { useCallback, useState } from "react";
import { DEPT_API, fetchWithAuth } from "../utils/api";
import {
  buildSubmitEntries,
  hydrateEntryStateFromKpis
} from "../utils/kpiEntry";

export default function useDeptKpiSubmission(deptId, { onSubmitted, onReportingCycle } = {}) {
  const [kpis, setKpis] = useState([]);
  const [field1Values, setField1Values] = useState({});
  const [field2Values, setField2Values] = useState({});
  const [singleValues, setSingleValues] = useState({});
  const [submission, setSubmission] = useState({ exists: false, isUpdate: false });
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [submitFeedback, setSubmitFeedback] = useState(null);

  const setField1 = useCallback((kpiId, value) => {
    setField1Values((prev) => ({ ...prev, [kpiId]: value }));
  }, []);

  const setField2 = useCallback((kpiId, value) => {
    setField2Values((prev) => ({ ...prev, [kpiId]: value }));
  }, []);

  const setSingle = useCallback((kpiId, value) => {
    setSingleValues((prev) => ({ ...prev, [kpiId]: value }));
  }, []);

  const loadKpis = useCallback(async () => {
    if (!deptId) return null;
    setLoadError("");
    try {
      const res = await fetchWithAuth(`${DEPT_API}/kpis/${deptId}`);
      const data = await res.json();
      const list = Array.isArray(data.kpis) ? data.kpis : [];
      setKpis(list);
      setSubmission(data.submission || { exists: false, isUpdate: false });

      const hydrated = hydrateEntryStateFromKpis(list);
      setField1Values(hydrated.field1Values);
      setField2Values(hydrated.field2Values);
      setSingleValues(hydrated.singleValues);

      if (onReportingCycle) {
        onReportingCycle({
          reportingCycle: data.reportingCycle,
          district: data.district,
          activeMonth: data.activeReportingMonth
        });
      }
      return data;
    } catch (err) {
      console.error("KPI load error:", err);
      setLoadError(err.message || "Failed to load KPIs for submission.");
      return null;
    }
  }, [deptId, onReportingCycle]);

  const submit = useCallback(
    async (selectedMonth) => {
      if (!selectedMonth) return;
      const [year, month] = selectedMonth.split("-");
      setSaving(true);
      setSubmitFeedback(null);
      try {
        const entries = buildSubmitEntries(kpis, field1Values, field2Values, singleValues);
        const res = await fetchWithAuth(`${DEPT_API}/submit`, {
          method: "POST",
          body: JSON.stringify({ entries, month: Number(month), year: Number(year) })
        });
        if (!res.ok) throw new Error(await res.text());
        const result = await res.json();
        setSubmission(result.submission || { exists: true, isUpdate: result.isUpdate });
        setSubmitFeedback({
          tone: "ok",
          message: result.message || "Data saved successfully."
        });
        if (onSubmitted) await onSubmitted(result.monthKey || selectedMonth);
      } catch (err) {
        setSubmitFeedback({
          tone: "error",
          message: err.message || "Save failed."
        });
      } finally {
        setSaving(false);
      }
    },
    [kpis, field1Values, field2Values, singleValues, onSubmitted]
  );

  return {
    kpis,
    field1Values,
    field2Values,
    singleValues,
    setField1,
    setField2,
    setSingle,
    submission,
    loadError,
    saving,
    submitFeedback,
    loadKpis,
    submit
  };
}
