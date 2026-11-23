"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Icon from "@/components/Icon";
import { useRole } from "@/context/RoleContext";
import { USE_MOCK } from "@/lib/auth/api";
import { notificationsApi } from "@/lib/notifications/api";
import { formatTanggal } from "@/lib/format";

export default function NotificationBell({ sidebarOpen = true }) {
  const { status } = useRole();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const wrapRef = useRef(null);

  const load = useCallback(async () => {
    if (USE_MOCK || status !== "authenticated") return;
    const res = await notificationsApi.list();
    if (res.ok) {
      setItems(res.data);
      setUnreadCount(res.unreadCount);
    }
  }, [status]);

  useEffect(() => {
    load();
    const timer = setInterval(load, 30000);
    return () => clearInterval(timer);
  }, [load]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  async function handleRead(item) {
    if (item.read_at) return;
    const res = await notificationsApi.markRead(item.id);
    if (res.ok) {
      setItems((prev) => prev.map((n) => (n.id === item.id ? { ...n, read_at: new Date().toISOString() } : n)));
      setUnreadCount((c) => Math.max(0, c - 1));
    }
  }

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <button
        type="button"
        className="nav-item"
        style={{ width: "100%", background: "none", border: "none", padding: 0, textAlign: "left", cursor: "pointer", color: "inherit", font: "inherit" }}
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (next) load();
        }}
        aria-label="Notifikasi"
        aria-expanded={open}
      >
        <div className="nav-row">
          <span className="nav-icon"><Icon name="bell" /></span>
          <span className="nav-label">Notifikasi</span>
          {unreadCount > 0 && (
            <span className="badge badge-primary" style={{ marginLeft: "auto", fontSize: 11, padding: "2px 6px" }}>
              {unreadCount}
            </span>
          )}
        </div>
      </button>

      {open && (
        <div
          className="card"
          style={{
            position: "absolute",
            left: sidebarOpen ? 8 : 68,
            top: "100%",
            marginTop: 6,
            width: 300,
            maxHeight: 360,
            overflowY: "auto",
            zIndex: 300,
            padding: 12,
          }}
          role="dialog"
          aria-label="Daftar Notifikasi"
        >
          <div className="row-between mb-8">
            <span className="t-small" style={{ fontWeight: 700 }}>Notifikasi</span>
            {unreadCount > 0 && <span className="t-caption muted">{unreadCount} belum dibaca</span>}
          </div>
          {items.length === 0 ? (
            <p className="t-small muted" style={{ padding: "12px 0", textAlign: "center" }}>Belum ada notifikasi.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {items.map((n) => {
                const unread = !n.read_at;
                const dateStr = n.created_at ? formatTanggal(String(n.created_at).slice(0, 10)) : "";
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => handleRead(n)}
                    style={{
                      textAlign: "left",
                      background: unread ? "var(--bg-muted, rgba(16,185,129,0.08))" : "transparent",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      padding: "8px 10px",
                      cursor: unread ? "pointer" : "default",
                      color: "inherit",
                      font: "inherit",
                    }}
                  >
                    <div className="row-between" style={{ gap: 6 }}>
                      <span className="t-small" style={{ fontWeight: unread ? 700 : 500 }}>{n.title}</span>
                      {dateStr && <span className="t-caption muted">{dateStr}</span>}
                    </div>
                    {n.body && <p className="t-caption muted mt-4" style={{ margin: "4px 0 0" }}>{n.body}</p>}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
