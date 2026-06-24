import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { PATHS, adminPath, deptPath } from "../routes/paths";

export default function ProtectedRoute({ user, allowedRoles, children }) {
  const location = useLocation();

  if (!user) {
    return (
      <Navigate
        to={PATHS.login}
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }

  const role = String(user.role || "").trim().toUpperCase();
  const roles = (allowedRoles || []).map((r) => r.toUpperCase());

  if (!roles.includes(role)) {
    if (role === "ADMIN") return <Navigate to={adminPath("home")} replace />;
    if (role === "DEPT") return <Navigate to={deptPath("data-submission")} replace />;
    return <Navigate to={PATHS.login} replace />;
  }

  return children;
}
