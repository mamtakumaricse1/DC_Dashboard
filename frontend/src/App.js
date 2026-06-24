/**
 * App root — auth gate + URL routes.
 *
 *   /login              → Login
 *   /admindashboard/*   → Admin (DC) dashboard
 *   /deptdashboard/*    → Department portal
 */
import "./styles.css";
import { useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from "react-router-dom";

import Login from "./pages/Login";
import AdminDashboard from "./pages/AdminDashboard";
import DeptDashboard from "./pages/DeptDashboard";
import ProtectedRoute from "./components/ProtectedRoute";
import { PATHS, adminPath, deptPath } from "./routes/paths";
import { clearSession, logoutSession, validateSession } from "./utils/api";

function RootRedirect({ user }) {
  if (!user) return <Navigate to={PATHS.login} replace />;
  const role = String(user.role || "").trim().toUpperCase();
  if (role === "ADMIN") return <Navigate to={adminPath("home")} replace />;
  if (role === "DEPT") return <Navigate to={deptPath("data-submission")} replace />;
  return <Navigate to={PATHS.login} replace />;
}

function AppRoutes({ user, setUser }) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logoutSession();
    setUser(null);
    navigate(PATHS.login, { replace: true });
  };

  return (
    <Routes>
      <Route
        path={PATHS.login}
        element={
          user ? (
            <RootRedirect user={user} />
          ) : (
            <Login setUser={setUser} />
          )
        }
      />
      <Route
        path="/admindashboard/*"
        element={
          <ProtectedRoute user={user} allowedRoles={["ADMIN"]}>
            <AdminDashboard user={user} onLogout={handleLogout} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/deptdashboard/*"
        element={
          <ProtectedRoute user={user} allowedRoles={["DEPT"]}>
            <DeptDashboard user={user} onLogout={handleLogout} />
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<RootRedirect user={user} />} />
      <Route path="*" element={<Navigate to={PATHS.login} replace />} />
    </Routes>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const profile = await validateSession();
      if (!cancelled) {
        setUser(profile || null);
        if (!profile) clearSession();
        setBooting(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  if (booting) {
    return <div className="loading-screen">Loading...</div>;
  }

  return (
    <BrowserRouter>
      <AppRoutes user={user} setUser={setUser} />
    </BrowserRouter>
  );
}

export default App;
