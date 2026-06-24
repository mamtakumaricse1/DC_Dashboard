import React, { useState } from "react";

import { RAG_LEGEND } from "../constants/tpi";

import RagBadge from "./RagBadge";



/**

 * Collapsible plain-language guide: reported value vs performance score.

 */

export default function ScoreExplainer({ compact = false }) {

  const [open, setOpen] = useState(!compact);



  return (

    <div className={`score-explainer ${compact ? "score-explainer--compact" : ""}`}>

      <button

        type="button"

        className="score-explainer-toggle"

        onClick={() => setOpen((v) => !v)}

        aria-expanded={open}

      >

        <span className="score-explainer-icon" aria-hidden="true">?</span>

        Quick score reference

        <span className="score-explainer-chevron">{open ? "▲" : "▼"}</span>

      </button>

      {open && (

        <div className="score-explainer-body">

          <dl className="score-explainer-dl">

            <div>

              <dt>Reported result</dt>

              <dd>

                Computed from two fields: <em>(Achieved ÷ Total) × 100</em> — e.g. 27 immunized ÷ 30 registered = <em>90%</em>, or 3 deaths ÷ 30 mothers = <em>10%</em>.

              </dd>

            </div>

            <div>

              <dt>Performance score (0–100)</dt>

              <dd>

                Normalised from actual vs min–max band (monthly) or quarter progress (quarterly / DC count target).

              </dd>

            </div>

            <div>

              <dt>District TPI contribution</dt>

              <dd>

                All 124 indicators contribute equally (~0.806% each). District TPI is the average score across all indicators.

              </dd>

            </div>

            <div>

              <dt>DC target → next review</dt>

              <dd>

                <strong>Monthly score target</strong> — reviewed next month in Target Follow-up.{" "}

                <strong>Quarterly count target</strong> — monthly entries sum; reviewed at quarter-end.

              </dd>

            </div>

          </dl>

          <div className="score-explainer-rag">

            {RAG_LEGEND.map((item) => (

              <span key={item.status} className="score-explainer-rag-item">

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

