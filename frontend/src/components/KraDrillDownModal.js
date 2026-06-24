import React, { useEffect, useState } from "react";
import { fetchDeptKpiDetail, toMonthLabel } from "../utils/api";
import { formatKpiActual, formatMeasurementPeriodTag } from "../utils/formatKpi";
import { formatTpiSharePct } from "../constants/tpi";
import { resolveKpiDisplayFields } from "../utils/kpiDisplay";
import KpiMeasurementHint from "./KpiMeasurementHint";
import OwnerContactMenu from "./OwnerContactMenu";
import RagBadge from "./RagBadge";

export default function KraDrillDownModal({ dept, monthKey, onClose }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    if (!dept?.id || !monthKey) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await fetchDeptKpiDetail(dept.id, monthKey);
        if (!cancelled) setDetail(data);
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [dept?.id, monthKey]);

  if (!dept) return null;

  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div
        className="modal-panel modal-panel--wide"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="kra-drill-title"
      >
        <div className="modal-header">
          <div>
            <h2 id="kra-drill-title" className="modal-title">{dept.kra || detail?.kra}</h2>
            <p className="modal-subtitle">
              {dept.name || detail?.deptName} · {toMonthLabel(monthKey)}
              {detail?.kraScore != null && (
                <> · KRA score <strong>{detail.kraScore.toFixed(1)}</strong></>
              )}
            </p>
            <p className="modal-hint">
              Each of 124 indicators contributes equally (<strong>0.80645%</strong> of district TPI).
              Rows show unit, frequency, score, and contribution. Expand any indicator for the full formula.
            </p>
            {detail?.owner && (
              <div className="modal-owner-row">
                <span>Owner: {detail.owner}</span>
                <OwnerContactMenu deptId={detail.deptId} indicator={dept?.name} compact />
              </div>
            )}
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        {loading ? (
          <div className="loading">Loading KPIs…</div>
        ) : (
          <div className="table-scroll modal-body">
            <table className="tpi-table kpi-detail-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Indicator</th>
                  <th>Reporting</th>
                  <th>Reported</th>
                  <th>Score</th>
                  <th>TPI %</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {(detail?.kpis || []).map((raw, idx) => {
                  const k = resolveKpiDisplayFields(raw);
                  return (
                  <React.Fragment key={k.kpiId}>
                    <tr
                      className={expandedId === k.kpiId ? "kpi-row-expanded" : "kpi-row-clickable"}
                      onClick={() =>
                        setExpandedId((id) => (id === k.kpiId ? null : k.kpiId))
                      }
                    >
                      <td>{idx + 1}</td>
                      <td className="kra">{k.name}</td>
                      <td>{formatMeasurementPeriodTag(k.freq, k.reportedUnit || k.unit, k.reportedUnitLabel || k.unitLabel, k.name)}</td>
                      <td>{formatKpiActual(k.actualValue, k.reportedUnit || k.unit, k.reportedUnitLabel || k.unitLabel, k.name)}</td>
                      <td>{k.score != null ? k.score.toFixed(1) : "—"}</td>
                      <td>{formatTpiSharePct(k.shareInTpiPct)}</td>
                      <td>
                        {k.status && k.status !== "NO_DATA" ? (
                          <RagBadge status={k.status === "AWAITING" ? "YELLOW" : k.status}>
                            {k.status === "AWAITING" ? "Awaiting" : k.status}
                          </RagBadge>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="kpi-expand-cell">{expandedId === k.kpiId ? "▲" : "▼"}</td>
                    </tr>
                    {expandedId === k.kpiId && (
                      <tr className="kpi-detail-expand-row">
                        <td colSpan="8">
                          <KpiMeasurementHint kpi={k} />
                          {k.evaluationNote && (
                            <p className="kpi-evaluation-note">
                              <strong>DC evaluation:</strong> {k.evaluationNote}
                            </p>
                          )}
                          {k.cumulativeActual != null && (
                            <p className="kpi-quarter-total">
                              Quarter total: {formatKpiActual(k.cumulativeActual, k.unit, k.unitLabel)}
                            </p>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
