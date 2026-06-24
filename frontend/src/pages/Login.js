import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AUTH_API, fetchPublicConfig, saveSession } from "../utils/api";
import { adminPath, deptPath } from "../routes/paths";
import "./Login.css";

export default function Login({ setUser }) {
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = location.state?.from;
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [branding, setBranding] = useState({
    appTitle: "Performance Index",
    districtName: ""
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const config = await fetchPublicConfig();
      if (!cancelled && config?.district) {
        setBranding({
          appTitle: config.district.appTitle || "Performance Index",
          districtName: config.district.districtName || ""
        });
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const login = async () => {
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${AUTH_API}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: form.username.trim(),
          password: form.password.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Login failed");
      }

      saveSession(data.token, data.user, data.refreshToken);
      setUser(data.user);
      const role = String(data.user?.role || "").trim().toUpperCase();
      const defaultPath =
        role === "ADMIN" ? adminPath("home") : deptPath("data-submission");
      navigate(returnTo || defaultPath, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h2>{branding.appTitle}</h2>
        <p className="subtitle">
          {branding.districtName
            ? `Sign in — ${branding.districtName}`
            : "Sign in to your dashboard"}
        </p>

        <input
          className="input"
          placeholder="Username"
          value={form.username}
          onChange={(e) => setForm({ ...form, username: e.target.value })}
        />

        <input
          className="input"
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          onKeyDown={(e) => e.key === "Enter" && login()}
        />

        {error && <p className="error">{error}</p>}

        <button className="button" type="button" onClick={login} disabled={loading}>
          {loading ? "Signing in…" : "Sign In"}
        </button>
      </div>
    </div>
  );
}
