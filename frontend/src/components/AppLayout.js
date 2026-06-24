/**
 * Shared shell — left sidebar navigation + main content area.
 * Used by both Admin and Department dashboards.
 */
import React from "react";
import "./AppLayout.css";

const NAV_ICONS = {
  home: (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7A1 1 0 003 10v7a1 1 0 001 1h4a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1h4a1 1 0 001-1v-7a1 1 0 00-.293-.707l-7-7z" />
    </svg>
  ),
  submissions: (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V4a2 2 0 00-2-2H6zm2 4a1 1 0 000 2h4a1 1 0 100-2H8zm0 4a1 1 0 100 2h4a1 1 0 100-2H8z" clipRule="evenodd" />
    </svg>
  ),
  "target-followup": (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
    </svg>
  ),
  overview: (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  ),
  dashboard: (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M3 4a1 1 0 011-1h3a1 1 0 011 1v5a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm8 0a1 1 0 011-1h3a1 1 0 011 1v2a1 1 0 01-1 1h-3a1 1 0 01-1-1V4zm0 6a1 1 0 011-1h3a1 1 0 011 1v6a1 1 0 01-1 1h-3a1 1 0 01-1-1v-6zM3 12a1 1 0 011-1h3a1 1 0 011 1v4a1 1 0 01-1 1H4a1 1 0 01-1-1v-4z" />
    </svg>
  ),
  "action-tracker": (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
    </svg>
  ),
  history: (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
    </svg>
  ),
  contacts: (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
    </svg>
  ),
  "data-submission": (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm0 2h12v10H4V5zm2 2a1 1 0 000 2h8a1 1 0 100-2H6zm0 4a1 1 0 100 2h5a1 1 0 100-2H6z" />
    </svg>
  )
};

export default function AppLayout({
  brandTitle = "Tirap Performance Index",
  brandSubtitle,
  user,
  onLogout,
  navItems,
  activeNav,
  onNavChange,
  pageTitle,
  pageSubtitle,
  toolbar,
  children
}) {
  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Main navigation">
        <div className="sidebar-brand">
          <div className="sidebar-brand-mark">TPI</div>
          <div className="sidebar-brand-text">
            <span className="sidebar-brand-title">{brandTitle}</span>
            {brandSubtitle && (
              <span className="sidebar-brand-sub">{brandSubtitle}</span>
            )}
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(({ id, label, badge, hint }) => (
            <button
              key={id}
              type="button"
              title={hint || label}
              className={activeNav === id ? "sidebar-link active" : "sidebar-link"}
              onClick={() => onNavChange(id)}
              aria-current={activeNav === id ? "page" : undefined}
            >
              <span className="sidebar-link-icon">
                {NAV_ICONS[id] || NAV_ICONS.dashboard}
              </span>
              <span className="sidebar-link-label">{label}</span>
              {badge > 0 && (
                <span className="sidebar-badge">{badge}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <span className="sidebar-user-name">{user?.username || "User"}</span>
            <span className="sidebar-user-role">
              {String(user?.role || "").toUpperCase() === "ADMIN" ? "District Commissioner" : "Department"}
            </span>
          </div>
          <button type="button" className="sidebar-logout" onClick={onLogout}>
            Logout
          </button>
        </div>
      </aside>

      <div className="app-main">
        <header className="main-header">
          <div className="main-header-titles">
            <h1 className="main-header-title">{pageTitle}</h1>
            {pageSubtitle && (
              <p className="main-header-subtitle">{pageSubtitle}</p>
            )}
          </div>
          {toolbar && <div className="main-header-toolbar">{toolbar}</div>}
        </header>
        <div className="page-body">{children}</div>
      </div>
    </div>
  );
}
