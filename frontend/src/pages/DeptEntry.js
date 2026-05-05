import { useEffect, useState } from "react";
import "./DeptEntry.css";

export default function DeptEntry({ deptId }) {
  const [kpis, setKpis] = useState([]);
  const [values, setValues] = useState({});

  useEffect(() => {
    fetch(`http://localhost:3001/api/dept/kpis/${deptId}`)
      .then(res => res.json())
      .then(data => {
        setKpis(data);

        const initial = {};
        data.forEach(k => {
          initial[k.kpi_id] = k.actual_value || "";
        });
        setValues(initial);
      });
  }, [deptId]);

  const submit = async () => {
    const entries = Object.entries(values).map(([kpi_id, val]) => ({
      kpi_id,
      actual_value: val
    }));

    await fetch("http://localhost:3001/api/dept/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entries })
    });

    alert("Data Saved Successfully");
  };

  return (
    <div className="dept-container">
      <div className="dept-card">
        <h2 className="title">Department Data Entry</h2>

        <div className="form-grid">
          {kpis.map(k => (
            <div className="form-group" key={k.kpi_id}>
              <label>{k.name}</label>
              <input
                type="text"
                value={values[k.kpi_id]}
                onChange={e =>
                  setValues({ ...values, [k.kpi_id]: e.target.value })
                }
                placeholder="Enter value"
              />
            </div>
          ))}
        </div>

        <button className="submit-btn" onClick={submit}>
          Submit
        </button>
      </div>
    </div>
  );
}