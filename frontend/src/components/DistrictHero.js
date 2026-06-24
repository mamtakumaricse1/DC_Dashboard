import React from "react";
import TpiGauge from "./TpiGauge";
import RagBadge from "./RagBadge";

function KpiCountPill({ status, count }) {
  return (
    <div className={`kpi-count-pill kpi-count-pill--${status.toLowerCase()}`}>
      <RagBadge status={status} className="kpi-count-pill-badge">
        {status}
      </RagBadge>
      <span className="kpi-count-pill-value">{count}</span>
      <span className="kpi-count-pill-label">KPIs</span>
    </div>
  );
}

/** Top-of-page hero: TPI gauge + KPI breakdown + RAG legend. */
export default function DistrictHero({ data, monthLabel }) {
  const counts = data.kpiStatusCounts || {};

  return (
    <section className="district-hero" aria-label="District performance summary">
      <div className="district-hero-gauge">
        <TpiGauge score={data.districtPI} monthLabel={monthLabel} />
      </div>
      <div className="district-hero-stats">
        <div className="kpi-count-row">
          <KpiCountPill status="GREEN" count={counts.green ?? 0} />
          <KpiCountPill status="YELLOW" count={counts.yellow ?? 0} />
          <KpiCountPill status="RED" count={counts.red ?? 0} />
        </div>
        <div className="district-hero-total">
          <span className="district-hero-total-label">Total indicators</span>
          <span className="district-hero-total-value">
            {counts.totalIndicators || data.totalKpis || 0}
          </span>
        </div>
      </div>
    </section>
  );
}
