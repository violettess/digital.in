"use client";

<<<<<<< HEAD
import { useCallback, useEffect, useState } from "react";
import Drawer from "@/components/ui/Drawer";
import DataTable from "@/components/ui/DataTable";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import usePolling from "@/components/admin/usePolling";
import { adminApi } from "@/lib/admin/api";
import { formatTanggal } from "@/lib/format";

const TABS = [
  { id: "STUDENT_KTM", label: "Mahasiswa" },
  { id: "MENTOR", label: "Mentor" },
];
const METHOD_LABEL = { KTM: "Unggah KTM", MENTOR_REVIEW: "Tinjau profil mentor" };

const universityOf = (row) => row.university_name || row.university_name_custom || "—";

// Verifikasi Pengguna: antrean dari GET /admin/verifications (mahasiswa yang
// mengunggah KTM + mentor yang menunggu). Tiap baris bisa dibuka untuk melihat
// KTM (diambil dengan header Authorization) lalu Setujui / Tolak lewat endpoint
// keputusan; pelaku keputusan dicatat backend di audit log. Antrean diperbarui
// otomatis tiap 30 detik selama tab terlihat, atau lewat tombol "Muat ulang".
export default function VerificationsView() {
  const [tab, setTab] = useState("STUDENT_KTM");
  const [rows, setRows] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [active, setActive] = useState(null);
  const [doc, setDoc] = useState(null); // { url, type } | { error }
  const [confirm, setConfirm] = useState(null); // "approve" | "reject"
  const [toast, setToast] = useState(null);

  const load = useCallback(async () => {
    setRefreshing(true);
    const res = await adminApi.verifications();
    setRefreshing(false);
    if (!res.ok) {
      setLoadError(res.error.message);
      return;
    }
    setLoadError(null);
    setRows(res.data);
    setUpdatedAt(new Date());
  }, []);

  usePolling(load, 30000);

  // KTM untuk baris yang dibuka; object URL dilepas saat drawer ditutup.
  useEffect(() => {
    if (!active || active.type !== "STUDENT_KTM") return undefined;
    let url = null;
    let alive = true;
    setDoc(null);
    adminApi.ktm(active.id).then((res) => {
      if (!alive) {
        if (res.ok) URL.revokeObjectURL(res.data.url);
        return;
      }
      if (res.ok) url = res.data.url;
      setDoc(res.ok ? res.data : { error: res.error.message });
    });
    return () => {
      alive = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [active]);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  }

  async function decide(reason) {
    const res = await adminApi.decideVerification(active.id, confirm, active.type, reason);
    if (!res.ok) return res;
    showToast(confirm === "approve" ? `${active.user?.name} disetujui.` : `${active.user?.name} ditolak.`);
    setConfirm(null);
    setActive(null);
    load();
    return res;
  }

  const list = (rows || []).filter((r) => r.type === tab);

  const columns = [
    { key: "name", label: "Nama", render: (r) => <span style={{ fontWeight: 700 }}>{r.user?.name || "—"}</span> },
    ...(tab === "STUDENT_KTM" ? [{ key: "university", label: "Kampus", render: universityOf }] : []),
    { key: "method", label: "Metode", render: (r) => METHOD_LABEL[r.method] || r.method },
    { key: "submitted", label: "Diajukan", render: (r) => (r.submitted_at ? formatTanggal(r.submitted_at.slice(0, 10)) : "—") },
    { key: "attempts", label: "Pengajuan", render: (r) => `ke-${r.attempts}` },
    { key: "action", label: "", align: "right", render: () => <span className="link-btn">Tinjau</span> },
=======
import { useMemo, useState } from "react";
import Icon from "@/components/Icon";
import Drawer from "@/components/ui/Drawer";
import DataTable from "@/components/ui/DataTable";
import { useActivityLog } from "@/context/ActivityLogContext";
import { verificationDecisions } from "@/lib/activity-log";
import { PLATFORM_USERS, VERIFICATION_DOCS } from "@/lib/users.mock";
import { formatTanggal } from "@/lib/format";

const TABS = [
  { id: "mahasiswa", label: "Mahasiswa" },
  { id: "umkm", label: "UMKM" },
];

// Verifikasi Pengguna: daftar akun pending per tipe (tab Mahasiswa/UMKM),
// tiap baris bisa dibuka buat lihat dokumen dummy-nya lalu Setujui/Tolak.
// Keputusan DICATAT ke log aktivitas terpusat (context/ActivityLogContext.js)
// dan daftar "Sudah Diproses" diturunkan darinya — jadi tidak hilang saat
// pindah halaman, dan otomatis terhitung di statistik & Aktivitas Terbaru
// profil admin. Baris pindah ke "Sudah Diproses" begitu diputuskan.
export default function VerificationsView() {
  const [tab, setTab] = useState("mahasiswa");
  const { entries, log } = useActivityLog();
  const decisions = useMemo(() => verificationDecisions(entries), [entries]); // { [userId]: { action, reason } }
  const [active, setActive] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [toast, setToast] = useState(null);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 2400);
  }

  function decide(user, action, reason) {
    log({
      category: "verifikasi", action,
      summary: `${action === "approve" ? "Menyetujui" : "Menolak"} verifikasi ${user.name}`,
      refs: { userId: user.id }, meta: { reason: reason || null, joinedAt: user.joinedAt },
    });
    setActive(null);
    setRejecting(false);
    setRejectReason("");
    showToast(action === "approve" ? `${user.name} disetujui.` : `${user.name} ditolak.`);
  }

  const pending = PLATFORM_USERS.filter((u) => u.type === tab && u.verification === "pending" && !decisions[u.id]);
  // Hanya akun yang awalnya "pending" yang masuk "Sudah Diproses" — riwayat
  // verifikasi lama (akun yang sudah terverifikasi sejak awal) ada di log,
  // bukan di tabel ini.
  const processed = PLATFORM_USERS.filter((u) => u.type === tab && u.verification === "pending" && decisions[u.id]);
  const docs = active ? VERIFICATION_DOCS[active.id] || [] : [];

  const columns = [
    { key: "name", label: "Nama", render: (u) => <span style={{ fontWeight: 700 }}>{u.name}</span> },
    { key: "info", label: tab === "mahasiswa" ? "Kampus" : "Jenis Usaha", render: (u) => (tab === "mahasiswa" ? u.university : u.business) },
    { key: "joinedAt", label: "Daftar", render: (u) => formatTanggal(u.joinedAt) },
    { key: "action", label: "", align: "right", render: (u) => <span className="link-btn">Tinjau</span> },
  ];

  const processedColumns = [
    { key: "name", label: "Nama" },
    { key: "status", label: "Keputusan", render: (u) => (
      <span className={`badge ${decisions[u.id].action === "approve" ? "badge-success" : "badge-error"}`}>
        {decisions[u.id].action === "approve" ? "Disetujui" : "Ditolak"}
      </span>
    ) },
    { key: "reason", label: "Alasan", render: (u) => decisions[u.id].reason || "—" },
>>>>>>> 3d15cf437f7342a62ab35a2a9a5a2e615e4b4f99
  ];

  return (
    <>
<<<<<<< HEAD
      <div className="row-between mb-4" style={{ flexWrap: "wrap", gap: 12 }}>
        <h1 className="t-h1">Verifikasi Pengguna</h1>
        <button type="button" className="btn btn-secondary btn-sm" onClick={load} disabled={refreshing}>
          {refreshing ? "Memuat…" : "Muat ulang"}
        </button>
      </div>
      <p className="t-body muted mb-20">
        Tinjau dokumen akun baru sebelum mereka bisa bertransaksi di platform.
        {updatedAt && <> Diperbarui {updatedAt.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}, otomatis tiap 30 detik.</>}
      </p>
=======
      <h1 className="t-h1 mb-4">Verifikasi Pengguna</h1>
      <p className="t-body muted mb-20">Tinjau dokumen akun baru sebelum mereka bisa bertransaksi di platform.</p>
>>>>>>> 3d15cf437f7342a62ab35a2a9a5a2e615e4b4f99

      <div className="history-tabs mb-20" role="tablist" style={{ borderBottom: "1px solid var(--border)" }}>
        {TABS.map((t) => (
          <button
            key={t.id} type="button" role="tab" aria-selected={tab === t.id}
            className={`history-tab ${tab === t.id ? "active" : ""}`}
            onClick={() => setTab(t.id)}
          >
<<<<<<< HEAD
            {t.label} ({(rows || []).filter((r) => r.type === t.id).length})
=======
            {t.label} ({PLATFORM_USERS.filter((u) => u.type === t.id && u.verification === "pending" && !decisions[u.id]).length})
>>>>>>> 3d15cf437f7342a62ab35a2a9a5a2e615e4b4f99
          </button>
        ))}
      </div>

<<<<<<< HEAD
      {loadError && <div className="card card-pad mb-16" role="alert" style={{ color: "var(--error)" }}>{loadError}</div>}

      {rows === null && !loadError ? (
        <div className="empty-state">Memuat antrean verifikasi…</div>
      ) : (
        <DataTable columns={columns} rows={list} onRowClick={setActive} empty="Tidak ada pengajuan yang menunggu." />
      )}

      <Drawer open={!!active} onClose={() => setActive(null)} title={active?.user?.name || "Verifikasi"}>
        {active && (
          <div className="job-detail">
            <div className="row-between">
              <span className="badge badge-info">{active.type === "STUDENT_KTM" ? "Mahasiswa" : "Mentor"}</span>
              <span className="t-caption">Pengajuan ke-{active.attempts}</span>
            </div>
            {active.type === "STUDENT_KTM" && <div className="t-small muted mt-8">{universityOf(active)}</div>}
            <div className="t-small muted mt-4">{active.user?.email || "—"}</div>
            {active.submitted_at && <div className="t-caption mt-4">Diajukan {formatTanggal(active.submitted_at.slice(0, 10))}</div>}

            <div className="divider" />

            {active.type === "STUDENT_KTM" && (
              <>
                <div className="t-caption mb-8">KARTU TANDA MAHASISWA</div>
                {!doc ? (
                  <div className="empty-state">Memuat dokumen…</div>
                ) : doc.error ? (
                  <div className="empty-state" role="alert">{doc.error}</div>
                ) : doc.type === "application/pdf" ? (
                  <iframe title="KTM" src={doc.url} style={{ width: "100%", height: 420, border: "1px solid var(--border)", borderRadius: 8 }} />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={doc.url} alt={`KTM ${active.user?.name}`} style={{ width: "100%", borderRadius: 8, border: "1px solid var(--border)" }} />
                )}
              </>
            )}

            <div className="drawer-footer row gap-10">
              <button type="button" className="btn btn-secondary btn-block" onClick={() => setConfirm("reject")}>Tolak</button>
              <button type="button" className="btn btn-primary btn-block" onClick={() => setConfirm("approve")}>Setujui</button>
=======
      <DataTable columns={columns} rows={pending} onRowClick={setActive} empty="Tidak ada pengajuan yang menunggu." />

      {processed.length > 0 && (
        <div className="mt-24">
          <h2 className="t-h3 mb-16">Sudah Diproses</h2>
          <DataTable columns={processedColumns} rows={processed} />
        </div>
      )}

      <Drawer open={!!active} onClose={() => { setActive(null); setRejecting(false); setRejectReason(""); }} title={active?.name || "Verifikasi"}>
        {active && (
          <div className="job-detail">
            <div className="row-between">
              <span className="badge badge-info">{active.type === "mahasiswa" ? "Mahasiswa" : "UMKM"}</span>
              <span className="t-caption">Daftar {formatTanggal(active.joinedAt)}</span>
            </div>

            <div className="t-small muted mt-8">{active.type === "mahasiswa" ? active.university : active.business}</div>

            <div className="divider" />

            <div className="t-caption mb-8">DOKUMEN</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {docs.map((d, i) => (
                <div key={i} className="card card-pad row-between">
                  <span className="t-small" style={{ fontWeight: 600 }}>{d.label}</span>
                  {d.file ? (
                    <span className="row gap-6 t-caption"><Icon name="fileText" /> {d.file}</span>
                  ) : (
                    <span className="t-caption">{d.value}</span>
                  )}
                </div>
              ))}
            </div>

            {rejecting && (
              <div className="mt-16">
                <label className="t-caption mb-4" style={{ display: "block" }}>ALASAN PENOLAKAN</label>
                <textarea
                  className="input" rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Wajib diisi sebelum menolak..."
                />
              </div>
            )}

            <div className="drawer-footer row gap-10">
              {rejecting ? (
                <>
                  <button type="button" className="btn btn-secondary btn-block" onClick={() => setRejecting(false)}>Batal</button>
                  <button
                    type="button" className="btn btn-block" style={{ background: "var(--error)", color: "#fff" }}
                    disabled={!rejectReason.trim()}
                    onClick={() => decide(active, "reject", rejectReason.trim())}
                  >
                    Konfirmasi Tolak
                  </button>
                </>
              ) : (
                <>
                  <button type="button" className="btn btn-secondary btn-block" onClick={() => setRejecting(true)}>Tolak</button>
                  <button type="button" className="btn btn-primary btn-block" onClick={() => decide(active, "approve")}>Setujui</button>
                </>
              )}
>>>>>>> 3d15cf437f7342a62ab35a2a9a5a2e615e4b4f99
            </div>
          </div>
        )}
      </Drawer>

<<<<<<< HEAD
      <ConfirmDialog
        open={!!confirm && !!active}
        onClose={() => setConfirm(null)}
        title={confirm === "approve" ? "Setujui verifikasi?" : "Tolak verifikasi?"}
        confirmLabel={confirm === "approve" ? "Ya, setujui" : "Ya, tolak"}
        danger={confirm === "reject"}
        reason={confirm === "reject" ? "required" : "none"}
        reasonLabel="Alasan penolakan"
        reasonPlaceholder="Mis. foto KTM buram atau nama tidak sesuai"
        onConfirm={decide}
      >
        {confirm === "approve"
          ? <>Akun <b>{active?.user?.name}</b> akan menjadi aktif dan bisa memakai semua fitur.</>
          : <>Pengajuan <b>{active?.user?.name}</b> ditolak. Alasan akan ditampilkan ke pengguna.</>}
      </ConfirmDialog>

=======
>>>>>>> 3d15cf437f7342a62ab35a2a9a5a2e615e4b4f99
      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
