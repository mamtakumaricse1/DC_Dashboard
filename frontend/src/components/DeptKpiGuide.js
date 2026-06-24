import React, { useEffect, useState } from "react";

import { fetchDeptKpiGuide } from "../utils/api";



/**

 * In-portal guide for HoDs — loaded live from DB (KPIs table).

 * Updates when KPIs, units, targets, or weights change (no static file rebuild).

 */

export default function DeptKpiGuide({ deptId, onClose }) {

  const [guide, setGuide] = useState(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");



  useEffect(() => {

    let cancelled = false;

    setLoading(true);

    setError("");



    fetchDeptKpiGuide(deptId)

      .then((data) => {

        if (!cancelled) setGuide(data);

      })

      .catch((err) => {

        if (!cancelled) setError(err.message || "Could not load guide");

      })

      .finally(() => {

        if (!cancelled) setLoading(false);

      });



    return () => {

      cancelled = true;

    };

  }, [deptId]);



  return (

    <div className="modal-overlay" onClick={onClose} role="presentation">

      <div

        className="modal-panel dept-kpi-guide"

        role="dialog"

        aria-modal="true"

        aria-labelledby="dept-kpi-guide-title"

        onClick={(e) => e.stopPropagation()}

      >

        <div className="modal-header">

          <div>

            <h2 id="dept-kpi-guide-title" className="modal-title">

              KPI Guide{guide ? ` — ${guide.deptName}` : ""}

            </h2>

            {guide?.kra && <p className="modal-subtitle">{guide.kra}</p>}

          </div>

          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">

            ×

          </button>

        </div>



        <div className="modal-body dept-guide-body">

          {loading && <p className="dept-guide-loading">Loading indicators from database…</p>}

          {error && !loading && (

            <p className="dept-guide-error" role="alert">{error}</p>

          )}

          {guide && !loading && (

            <>

              <div className="dept-guide-summary">

                <div className="dept-guide-stat">

                  <span className="dept-guide-stat-label">Share of district TPI</span>

                  <strong>{guide.deptContributionPct}%</strong>

                </div>

                <div className="dept-guide-stat">

                  <span className="dept-guide-stat-label">Per indicator</span>

                  <strong>{guide.kpis?.[0]?.shareInTpiPct ?? "—"}%</strong>

                </div>

                <div className="dept-guide-stat">

                  <span className="dept-guide-stat-label">Indicators</span>

                  <strong>{guide.indicatorCount}</strong>

                </div>

              </div>



              <section className="dept-guide-section">

                <h3>How to enter data</h3>

                <ol className="dept-guide-list">

                  {guide.howToEnter.map((line) => (

                    <li key={line}>{line}</li>

                  ))}

                </ol>

              </section>



              <section className="dept-guide-section">

                <h3>How scoring affects district TPI</h3>

                <ol className="dept-guide-list">

                  {(guide.howScoringWorks || []).map((line) => (

                    <li key={line}>{line}</li>

                  ))}

                </ol>

              </section>



              <section className="dept-guide-section">

                <h3>How to check DC targets</h3>

                <ol className="dept-guide-list">

                  {guide.howToCheckTargets.map((line) => (

                    <li key={line}>{line}</li>

                  ))}

                </ol>

              </section>



              <section className="dept-guide-section">

                <h3>Your {guide.indicatorCount} indicators</h3>

                <div className="table-scroll dept-guide-table-wrap">

                  <table className="tpi-table dept-guide-table">

                    <thead>

                      <tr>

                        <th>#</th>

                        <th>Indicator</th>

                        <th>Field 1 (Total/Base)</th>

                        <th>Field 2 (Achieved)</th>

                        <th>Target</th>

                        <th>Direction</th>

                        <th>Freq</th>

                        <th>How to enter</th>

                      </tr>

                    </thead>

                    <tbody>

                      {guide.kpis.map((k) => (

                        <tr key={k.kpiId || k.num}>

                          <td>{k.num ?? "—"}</td>

                          <td className="kra">{k.name}</td>

                          <td>{k.field1Label || k.inputLabel || "—"}</td>

                          <td>{k.field2Label || "—"}</td>

                          <td>{k.target != null ? k.target : "—"}</td>

                          <td>{k.polarityLabel}</td>

                          <td>{k.freq === "Q" ? "Quarterly" : "Monthly"}</td>

                          <td className="dept-guide-hint">{k.enterHint}</td>

                        </tr>

                      ))}

                    </tbody>

                  </table>

                </div>

              </section>

            </>

          )}

        </div>

      </div>

    </div>

  );

}


