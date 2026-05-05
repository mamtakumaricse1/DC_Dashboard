import React, { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  CartesianGrid
} from "recharts";

import "./AdminDashboard.css";

const COLORS = {
  Achiever: "#22c55e",
  Performer: "#eab308",
  Aspirant: "#f97316",
  Laggard: "#ef4444"
};

export default function AdminDashboard() {
  const [data, setData] = useState({
    districtPI: 0,
    departments: [],
    top3: [],
    bottom3: []
  });

  const [loading, setLoading] = useState(true);

  // ✅ CATEGORY LOGIC
  const getCategory = (score) => {
    if (score >= 85) return { label: "Achiever", color: COLORS.Achiever };
    if (score >= 65) return { label: "Performer", color: COLORS.Performer };
    if (score >= 40) return { label: "Aspirant", color: COLORS.Aspirant };
    return { label: "Laggard", color: COLORS.Laggard };
  };

  const getTrendMeta = (trend) => {
    if (trend === "UP") return { icon: "🔼", label: "Upward" };
    if (trend === "DOWN") return { icon: "🔽", label: "Downward" };
    return { icon: "➖", label: "Flat" };
  };

  // ✅ TOOLTIP (KPI DRILLDOWN)
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;

      return (
        <div className="customTooltip">
          <p><b>{d.name}</b></p>
          <p>Score: {Number(d.score).toFixed(1)}</p>

          <p style={{ marginTop: "8px", fontWeight: "600" }}>
            KPI Breakdown:
          </p>

          <ul>
            {d.kpis && d.kpis.length > 0 ? (
              d.kpis.map((k, i) => (
                <li key={i}>
                  {k.name}: <b>{Number(k.value).toFixed(1)}</b>
                </li>
              ))
            ) : (
              <li>No KPI data</li>
            )}
          </ul>
        </div>
      );
    }
    return null;
  };

  useEffect(() => {
    fetch("http://localhost:3001/api/dashboard/summary")
      .then((res) => res.json())
      .then((res) => {
        console.log("API RESPONSE:", res);

        // Backend returns departments as array
        const deptArray = Array.isArray(res?.departments)
          ? res.departments.map((d) => ({
              id: d?.id,
              name: d?.name || "Unknown Department",
              score: Number(d?.score || 0),
              trend: d?.trend || "FLAT",
              trendSeries: Array.isArray(d?.trendSeries) ? d.trendSeries : [],
              kpis: Array.isArray(d?.kpis) ? d.kpis : []
            }))
          : [];

        // ✅ SORT (IMPORTANT FIX)
        const sorted = [...deptArray].sort((a, b) => b.score - a.score);

        // ✅ TOP 3
        const top3 = sorted.slice(0, 3).map((d, i) => ({
          rank: i + 1,
          ...d
        }));

        const bottom3Count = Math.min(3, sorted.length);
        const bottom3 = sorted.slice(-bottom3Count).map((d, i) => ({
          rank: sorted.length - bottom3Count + i + 1,
          ...d
        }));

        setData({
          districtPI: Number(res?.districtPI || 0),
          departments: sorted, // ✅ USE SORTED (FIXED)
          top3,
          bottom3
        });

        setLoading(false);
      })
      .catch((err) => {
        console.error("API ERROR:", err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="loading">Loading District Index...</div>;
  }

  return (
    <div className="container">

      {/* HEADER */}
      <div className="header">
        <div>
          <h1>District Performance Index</h1>
          <p>Monthly Administrative Review Dashboard</p>
        </div>

        <div className="scoreBox">
          <div className="scoreValue">
            {data.districtPI.toFixed(1)}
          </div>
          <span>District Score</span>
        </div>
      </div>

      {/* TOP / BOTTOM */}
      <div className="grid">

        {/* TOP 3 */}
        <div className="card greenCard">
          <h2>🏆 Top 3 Performers</h2>

          {data.top3.length === 0 ? (
            <p>No data available</p>
          ) : (
            data.top3.map((d, i) => (
              <div key={i} className="row greenRow">
                <span>#{d.rank} {d.name}</span>
                <b>{d.score.toFixed(1)}</b>
              </div>
            ))
          )}
        </div>

        {/* BOTTOM 3 */}
        <div className="card redCard">
          <h2>⚠️ Bottom 3</h2>

          {data.bottom3.length === 0 ? (
            <p>No data available</p>
          ) : (
            data.bottom3.map((d, i) => (
              <div key={i} className="row redRow">
                <span>#{d.rank} {d.name}</span>
                <b>{d.score.toFixed(1)}</b>
              </div>
            ))
          )}
        </div>

      </div>

      {/* CHART */}
      <div className="chartBox">
        <h2>Department-wise Comparison</h2>

        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data.departments}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis domain={[0, 100]} />

            <Tooltip content={<CustomTooltip />} />

            <Bar dataKey="score">
              {data.departments.map((entry, i) => (
                <Cell key={i} fill={getCategory(entry.score).color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* TABLE */}
      <div className="tableBox">
        <table>
          <thead>
            <tr>
              <th>Rank</th>
              <th>Department</th>
              <th>Score</th>
              <th>Trend</th>
              <th>3M Sparkline</th>
              <th>Category</th>
            </tr>
          </thead>

          <tbody>
            {data.departments.length === 0 ? (
              <tr>
                <td colSpan="6">No data available</td>
              </tr>
            ) : (
              data.departments.map((d, i) => {
                const cat = getCategory(d.score);
                const trendMeta = getTrendMeta(d.trend);

                return (
                  <tr key={d.id || i}>
                    <td>#{i + 1}</td>
                    <td>{d.name}</td>
                    <td>{d.score.toFixed(1)}</td>
                    <td>{`${trendMeta.icon} ${trendMeta.label}`}</td>
                    <td>
                      <div className="sparklineBox">
                        {d.trendSeries.length > 0 ? (
                          <ResponsiveContainer width="100%" height={36}>
                            <LineChart data={d.trendSeries}>
                              <Line
                                type="monotone"
                                dataKey="score"
                                stroke={cat.color}
                                strokeWidth={2}
                                dot={{ r: 2 }}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        ) : (
                          <small>No trend data</small>
                        )}
                      </div>
                    </td>
                    <td>
                      <span
                        className="badge"
                        style={{ backgroundColor: cat.color }}
                      >
                        {cat.label}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}