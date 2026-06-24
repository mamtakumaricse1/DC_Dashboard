/**
 * HoD contact dropdown — Call, WhatsApp, Email, Copy reminder text.
 * Contact data from GET /api/dashboard/contacts (cached in api.js).
 */
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { fetchContacts, getCachedContact } from "../utils/api";
import { buildReminderMessage, mailUrl, telUrl, whatsappUrl } from "../utils/contacts";

function computePanelStyle(anchor, panelEl, preferUp) {
  if (!anchor) return null;
  const rect = anchor.getBoundingClientRect();
  const panelHeight = panelEl?.offsetHeight || 260;
  const spaceBelow = window.innerHeight - rect.bottom;
  const openUp =
    preferUp ||
    (spaceBelow < panelHeight + 12 && rect.top > panelHeight + 12);
  const left = Math.min(rect.right, window.innerWidth - 12);

  if (openUp) {
    return {
      position: "fixed",
      top: `${Math.max(8, rect.top - 4)}px`,
      left: `${left}px`,
      transform: "translate(-100%, -100%)",
      zIndex: 10050
    };
  }

  return {
    position: "fixed",
    top: `${rect.bottom + 4}px`,
    left: `${left}px`,
    transform: "translateX(-100%)",
    zIndex: 10050
  };
}

export default function OwnerContactMenu({
  deptId,
  indicator,
  compact = false,
  label = "Contacts",
  preferUp = false
}) {
  const [open, setOpen] = useState(false);
  const [contact, setContact] = useState(() => getCachedContact(deptId));
  const [loading, setLoading] = useState(false);
  const [panelStyle, setPanelStyle] = useState(null);
  const rootRef = useRef(null);
  const panelRef = useRef(null);

  const refreshContact = useCallback(async () => {
    setLoading(true);
    try {
      await fetchContacts();
      setContact(getCachedContact(deptId));
    } catch {
      setContact(null);
    } finally {
      setLoading(false);
    }
  }, [deptId]);

  useEffect(() => {
    if (contact) return undefined;
    let cancelled = false;
    (async () => {
      try {
        await fetchContacts();
        if (!cancelled) setContact(getCachedContact(deptId));
      } catch {
        /* retry on open */
      }
    })();
    return () => { cancelled = true; };
  }, [deptId, contact]);

  const reposition = useCallback(() => {
    setPanelStyle(computePanelStyle(rootRef.current, panelRef.current, preferUp));
  }, [preferUp]);

  useLayoutEffect(() => {
    if (!open) {
      setPanelStyle(null);
      return undefined;
    }
    reposition();
    const onReflow = () => reposition();
    window.addEventListener("resize", onReflow);
    window.addEventListener("scroll", onReflow, true);
    return () => {
      window.removeEventListener("resize", onReflow);
      window.removeEventListener("scroll", onReflow, true);
    };
  }, [open, reposition]);

  useEffect(() => {
    if (!open || !panelRef.current) return undefined;
    const observer = new ResizeObserver(() => reposition());
    observer.observe(panelRef.current);
    return () => observer.disconnect();
  }, [open, reposition]);

  useEffect(() => {
    if (!open) return undefined;
    const onDocClick = (e) => {
      const inAnchor = rootRef.current?.contains(e.target);
      const inPanel = panelRef.current?.contains(e.target);
      if (!inAnchor && !inPanel) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const handleToggle = async (e) => {
    e.stopPropagation();
    if (!open && !contact) {
      await refreshContact();
    }
    setOpen((v) => !v);
  };

  if (!contact && !loading) {
    return (
      <button
        type="button"
        className="contact-menu-trigger contact-menu-trigger--retry"
        onClick={(e) => {
          e.stopPropagation();
          refreshContact().then(() => setOpen(true));
        }}
      >
        Contacts ▾
      </button>
    );
  }

  const message = buildReminderMessage(indicator);
  const wa = contact ? whatsappUrl(contact.phone, message) : null;
  const tel = contact ? telUrl(contact.phone) : null;
  const mail = contact
    ? mailUrl(contact.email, "TPI RED indicator reminder", message)
    : null;

  const copyMessage = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(message);
        alert(`Reminder copied for ${contact.owner} (${contact.phone})`);
      } else {
        window.prompt("Copy this reminder:", message);
      }
    } catch {
      window.prompt("Copy this reminder:", message);
    }
    setOpen(false);
  };

  const panel =
    open && contact ? (
      <div
        ref={panelRef}
        className="contact-menu-panel contact-menu-panel--portal"
        style={panelStyle || { position: "fixed", visibility: "hidden" }}
        role="menu"
      >
        <div className="contact-menu-header">
          <strong>{contact.owner}</strong>
          <span className="contact-menu-dept">{contact.deptName}</span>
        </div>
        <div className="contact-menu-row">
          <span className="contact-menu-label">Mobile</span>
          <a className="contact-menu-value" href={tel || undefined}>
            {contact.phone || "—"}
          </a>
        </div>
        <div className="contact-menu-row">
          <span className="contact-menu-label">Email</span>
          <a className="contact-menu-value" href={mail || undefined}>
            {contact.email || "—"}
          </a>
        </div>
        <div className="contact-menu-actions">
          {tel && (
            <a className="contact-action contact-action--call" href={tel}>
              Call
            </a>
          )}
          {wa && (
            <a
              className="contact-action contact-action--wa"
              href={wa}
              target="_blank"
              rel="noopener noreferrer"
            >
              WhatsApp
            </a>
          )}
          {mail && (
            <a className="contact-action contact-action--mail" href={mail}>
              Email
            </a>
          )}
          <button type="button" className="contact-action contact-action--copy" onClick={copyMessage}>
            Copy reminder
          </button>
        </div>
      </div>
    ) : null;

  return (
    <div
      ref={rootRef}
      className={`contact-menu ${compact ? "contact-menu--compact" : ""} ${open ? "contact-menu--open" : ""}`}
    >
      <button
        type="button"
        className="contact-menu-trigger"
        onClick={handleToggle}
        aria-expanded={open}
        aria-haspopup="true"
        disabled={loading}
      >
        {loading ? "Loading…" : `${label} ▾`}
      </button>
      {panel && createPortal(panel, document.body)}
    </div>
  );
}
