import React, { useEffect, useState } from "react";
import { fetchContacts } from "../utils/api";
import { buildReminderMessage, mailUrl, telUrl, whatsappUrl } from "../utils/contacts";
import EmptyState from "./EmptyState";

export default function AdminContactsPanel() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await fetchContacts();
        if (!cancelled) setContacts(list);
      } catch (err) {
        if (!cancelled) setError(err.message || "Failed to load contacts");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return <div className="loading">Loading contacts…</div>;
  }

  if (error) {
    return (
      <EmptyState tone="warn" title="Could not load contacts" subtitle={error} />
    );
  }

  return (
    <div className="panel contacts-panel">
      <div className="panel-header">
        <h2 className="panel-title">Officer contact directory</h2>
        <p className="panel-hint">
          When a department is RED or late, call or WhatsApp the officer listed here. Open from{" "}
          <strong>Top RED indicators</strong> on Command Center or use this full directory.
        </p>
      </div>
      <div className="table-scroll">
        <table className="tpi-table contacts-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Dept</th>
              <th>KRA</th>
              <th>Officer</th>
              <th>Mobile</th>
              <th>Email</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {contacts.map((c, idx) => {
              const msg = buildReminderMessage(`${c.deptName} performance`);
              const wa = whatsappUrl(c.phone, msg);
              const tel = telUrl(c.phone);
              const mail = mailUrl(c.email, "TPI follow-up", msg);
              return (
                <tr key={c.deptId}>
                  <td>{idx + 1}</td>
                  <td>
                    <span className="contact-dept-id">{c.deptId}</span>
                    {c.deptName}
                  </td>
                  <td className="kra">{c.kra}</td>
                  <td>{c.owner}</td>
                  <td>
                    <a href={tel || undefined}>{c.phone}</a>
                  </td>
                  <td>
                    <a href={mail || undefined}>{c.email}</a>
                  </td>
                  <td className="contact-actions-cell">
                    <a className="contact-action contact-action--call" href={tel || undefined}>
                      Call
                    </a>
                    <a
                      className="contact-action contact-action--wa"
                      href={wa || undefined}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      WhatsApp
                    </a>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
