/**
 * How district TPI is measured — units, frequency, weights, DC targets, evaluation.
 */
import React, { useState } from "react";
import { RAG_LEGEND } from "../constants/tpi";
import RagBadge from "./RagBadge";

export default function MeasurementModelPanel({ model, compact = false }) {
  const [open, setOpen] = useState(!compact);

  if (!model) return null;

  return (
    <div className={`measurement-panel ${compact ? "measurement-panel--compact" : ""}`}>
      <button
        type="button"
        className="measurement-panel-toggle"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="measurement-panel-icon" aria-hidden="true">📐</span>
        {model.title || "How TPI is measured"}
        <span className="measurement-panel-chevron">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="measurement-panel-body">
          <ol className="measurement-ladder">
            {model.ladder?.map((step) => (
              <li key={step.step} className="measurement-ladder-step">
                <span className="measurement-ladder-num">{step.step}</span>
                <div>
                  <strong>{step.title}</strong>
                  <p>{step.detail}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="measurement-grid">
            <section className="measurement-card">
              <h3>Reporting frequency</h3>
              <ul>
                {model.frequencies?.map((f) => (
                  <li key={f.code}>
                    <strong>{f.label}</strong> — {f.reporting}. Scoring: {f.scoring}
                  </li>
                ))}
              </ul>
            </section>

            <section className="measurement-card">
              <h3>When DC sets a target (RED indicators)</h3>
              {model.dcTargetTypes?.map((t) => (
                <div key={t.type} className="measurement-target-type">
                  <strong>{t.label}</strong>
                  <p className="measurement-muted">{t.when}</p>
                  <p>{t.evaluation}</p>
                </div>
              ))}
            </section>
          </div>

          <div className="measurement-rag">
            {RAG_LEGEND.map((item) => (
              <span key={item.status} className="measurement-rag-item">
                <RagBadge status={item.status}>{item.label}</RagBadge>
                <span>{item.desc}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
