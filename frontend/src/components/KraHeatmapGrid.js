import React from "react";
import {
  KRA_DEPT_ORDER,
  RAG_LEGEND,
  ragCellClass,
  ragStatusClass
} from "../constants/tpi";

function KraTile({ dept, onSelect }) {
  const code = dept.kra?.split(" - ")[0]?.trim() || dept.id;
  const shortLabel = dept.kra?.split(" - ")[1]?.trim() || dept.name || dept.id;
  const status = dept.ragStatus || "RED";

  return (
    <button
      type="button"
      className={`kra-tile ${ragCellClass(status)}`}
      onClick={() => onSelect?.(dept)}
      title={`${dept.kra} — ${Number(dept.score || 0).toFixed(1)} (${status})`}
    >
      <span className="kra-tile-code">{code}</span>
      <span className="kra-tile-label">{shortLabel}</span>
      <span className="kra-tile-score">{Number(dept.score || 0).toFixed(1)}</span>
      <span className={`kra-tile-status ${ragStatusClass(status)}`}>{status}</span>
    </button>
  );
}

/**
 * 14-department visual heatmap — green / yellow / red by KRA score.
 */
export default function KraHeatmapGrid({ departments = [], onSelect, title, hint }) {
  const byId = new Map(departments.map((d) => [d.id, d]));
  const ordered = KRA_DEPT_ORDER.map((id) => byId.get(id)).filter(Boolean);

  if (!ordered.length) {
    return null;
  }

  return (
    <section className="kra-heatmap" aria-label="KRA performance heatmap">
      {(title || hint) && (
        <div className="kra-heatmap-header">
          {title && <h3 className="kra-heatmap-title">{title}</h3>}
          {hint && <p className="kra-heatmap-hint">{hint}</p>}
          <div className="rag-legend" aria-label="RAG legend">
            {RAG_LEGEND.map((item) => (
              <span key={item.status} className="rag-legend-item">
                <span className={`rag-legend-swatch ${ragCellClass(item.status)}`} />
                <span className="rag-legend-text">
                  {item.label} {item.desc}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}
      <div className="kra-heatmap-grid">
        {ordered.map((dept) => (
          <KraTile key={dept.id} dept={dept} onSelect={onSelect} />
        ))}
      </div>
    </section>
  );
}
