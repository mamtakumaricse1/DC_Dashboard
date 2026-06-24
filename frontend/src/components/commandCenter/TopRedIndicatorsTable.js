import React from "react";
import OwnerContactMenu from "../OwnerContactMenu";

/**
 * Worst individual RED KPIs district-wide (lowest performance score first).
 * Contacts menu uses API /api/dashboard/contacts — Call / WhatsApp / Email / Copy reminder.
 */
export default function TopRedIndicatorsTable({ rows, limit, onViewAll }) {
  if (!rows?.length) return null;

  const visible = limit ? rows.slice(0, limit) : rows;
  const hasMore = limit && rows.length > limit;

  return (
    <div className="panel">
      <div className="panel-header">
        <h2 className="panel-title">Worst indicators</h2>
        <p className="panel-hint">
          Lowest scores first{hasMore ? ` — showing top ${limit}` : ""}.
          {onViewAll && (
            <>
              {" "}
              <button type="button" className="panel-link-btn" onClick={onViewAll}>
                Set targets →
              </button>
            </>
          )}
        </p>
      </div>
      <div className="table-scroll">
        <table className="tpi-table">
          <thead>
            <tr>
              <th>Department</th>
              <th>Indicator</th>
              <th title="0–100 performance score">Perf. score</th>
              <th>Owner</th>
              <th>Contact</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((t, i) => (
              <tr key={`${t.deptId}-${t.indicator}-${i}`}>
                <td className="kra">{t.kra}</td>
                <td className="top-red">{t.indicator}</td>
                <td className="status-red">{t.score != null ? t.score.toFixed(1) : "—"}</td>
                <td className="owner-cell">{t.owner || "—"}</td>
                <td onClick={(e) => e.stopPropagation()}>
                  <OwnerContactMenu deptId={t.deptId} indicator={t.indicator} compact />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
