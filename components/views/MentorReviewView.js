"use client";

import { useCallback, useEffect, useState } from "react";
import Icon from "@/components/Icon";
import ProjectsEmptyState from "@/components/projects/ProjectsEmptyState";
import { useRole } from "@/context/RoleContext";
import { mentorApi } from "@/lib/mentor/api";
import { formatRupiah, formatTanggal } from "@/lib/format";

// Dashboard mentor = antrian review. Setiap submission mahasiswa melewati mentor dulu:
// - Setujui -> milestone CLIENT_REVIEW (diteruskan ke UMKM)
// - Minta perbaikan (feedback wajib) -> NEEDS_CHANGES; pengembalian ke-3 -> ESCALATED ke admin.
// Batas & transisi dijaga backend (MilestoneReviewService); UI hanya menampilkan sisa kesempatan.
export default function MentorReviewView() {
  const { authUser } = useRole();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await mentorApi.queue();
    setLoading(false);
    if (!res.ok) {
      setError(res.error.message);
      return;
    }
    setItems(res.data);
  }, []);

  useEffect(() => { load(); }, [load]);

  function onReviewed(milestoneId, message) {
    setItems((list) => list.filter((i) => i.milestoneId !== milestoneId));
    showToast(message);
  }

  const pending = authUser?.status === "PENDING_VERIFICATION";

  return (
    <>
      <div className="row-between" style={{ flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 className="t-h1">Antrian Review</h1>
          <p className="t-small muted mt-4">Hasil kerja mahasiswa yang ditugaskan kepadamu. Setujui untuk diteruskan ke UMKM, atau kembalikan dengan catatan perbaikan.</p>
        </div>
        <button type="button" className="btn btn-secondary btn-sm" onClick={load} disabled={loading}>
          <Icon name="activity" /> {loading ? "Memuat..." : "Muat ulang"}
        </button>
      </div>

      <div className="mt-20">
        {pending ? (
          <ProjectsEmptyState
            variant="no-results"
            title="Akun mentor sedang ditinjau"
            subtitle="Antrian review terbuka setelah tim Verify & Trust mengaktifkan akunmu."
          />
        ) : error ? (
          <ProjectsEmptyState variant="no-results" title="Gagal memuat antrian" subtitle={error} actionLabel="Coba lagi" onAction={load} />
        ) : loading ? (
          <p className="t-small muted">Memuat antrian review...</p>
        ) : items.length === 0 ? (
          <ProjectsEmptyState
            variant="no-results"
            title="Tidak ada yang perlu direview"
            subtitle="Submission baru dari mahasiswa yang kamu mentori akan muncul di sini."
            actionLabel="Muat ulang"
            onAction={load}
          />
        ) : (
          <div className="col gap-16" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="t-small muted">{items.length} submission menunggu review</div>
            {items.map((item) => (
              <ReviewCard key={item.milestoneId} item={item} onReviewed={onReviewed} showToast={showToast} />
            ))}
          </div>
        )}
      </div>

      {toast && <div className="toast" style={{ zIndex: 400 }}>{toast}</div>}
    </>
  );
}

function ReviewCard({ item, onReviewed, showToast }) {
  const [mode, setMode] = useState(null); // null | "changes"
  const [feedback, setFeedback] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const sub = item.submission;
  const remaining = Math.max(item.maxMentorReturns - item.mentorReturns, 0);

  async function decide(decision) {
    if (!sub) return;
    setError(null);
    if (decision === "NEEDS_CHANGES" && !feedback.trim()) {
      setError("Tulis catatan perbaikan untuk mahasiswa.");
      return;
    }
    setSending(true);
    const res = await mentorApi.review(sub.id, { decision, feedback });
    setSending(false);
    if (!res.ok) {
      setError(res.error.message);
      return;
    }
    const status = res.data?.status;
    onReviewed(item.milestoneId,
      decision === "APPROVED"
        ? `"${item.title}" disetujui dan diteruskan ke UMKM.`
        : status === "ESCALATED"
          ? `"${item.title}" dikembalikan untuk ke-${item.maxMentorReturns} kalinya dan dieskalasi ke admin.`
          : `"${item.title}" dikembalikan ke mahasiswa untuk diperbaiki.`);
  }

  async function download(file) {
    const res = await mentorApi.download(sub.id, file);
    if (!res.ok) showToast(res.error.message);
  }

  return (
    <article className="card" style={{ padding: 20 }}>
      <div className="row-between" style={{ gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div style={{ minWidth: 0 }}>
          <div className="t-caption">{item.projectTitle}{item.contractNo && ` · ${item.contractNo}`}</div>
          <div className="t-h3 mt-4" style={{ fontSize: 17 }}>{item.title}</div>
          {item.description && <p className="t-small muted mt-4">{item.description}</p>}
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="t-small" style={{ fontWeight: 700 }}>{formatRupiah(item.amount)}</div>
          {item.dueDate && <div className="t-caption">Tenggat {formatTanggal(item.dueDate)}</div>}
        </div>
      </div>

      <div className="row gap-8 mt-12" style={{ flexWrap: "wrap" }}>
        {sub && <span className="badge badge-info">Versi {sub.version}</span>}
        {item.submittedAt && <span className="badge">Dikirim {formatTanggal(String(item.submittedAt).slice(0, 10))}</span>}
        <span className={`badge ${remaining <= 1 ? "badge-warning" : ""}`}>
          Sisa pengembalian: {remaining} dari {item.maxMentorReturns}
        </span>
      </div>

      {!sub ? (
        <p className="t-small muted mt-12">Submission belum tersedia.</p>
      ) : (
        <>
          <div className="mt-16">
            <div className="t-caption mb-8">CATATAN MAHASISWA</div>
            <p className="t-small" style={{ whiteSpace: "pre-wrap" }}>{sub.notes || "Tidak ada catatan."}</p>
          </div>

          <div className="mt-16">
            <div className="t-caption mb-8">BERKAS ({sub.files.length})</div>
            {sub.files.length === 0 ? (
              <p className="t-small muted">Tidak ada berkas.</p>
            ) : (
              <div className="row gap-8" style={{ flexWrap: "wrap" }}>
                {sub.files.map((f) => (
                  <button key={f.id} type="button" className="btn btn-secondary btn-sm" onClick={() => download(f)}>
                    <Icon name="fileText" /> {f.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {mode === "changes" && (
            <div className="field mt-16" style={{ marginBottom: 0 }}>
              <label htmlFor={`fb-${item.milestoneId}`}>Catatan perbaikan untuk mahasiswa</label>
              <textarea
                id={`fb-${item.milestoneId}`} className="input" rows={4} value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Jelaskan bagian yang perlu diperbaiki dan hasil yang diharapkan."
              />
              {remaining <= 1 && (
                <p className="t-caption mt-4">Ini kesempatan pengembalian terakhir. Jika dikembalikan, milestone akan dieskalasi ke admin.</p>
              )}
            </div>
          )}

          {error && <div className="pp-error mt-12" role="alert">{error}</div>}

          <div className="row gap-8 mt-16" style={{ justifyContent: "flex-end", flexWrap: "wrap" }}>
            {mode === "changes" ? (
              <>
                <button type="button" className="btn btn-secondary" onClick={() => { setMode(null); setError(null); }} disabled={sending}>Batal</button>
                <button type="button" className="btn btn-primary" onClick={() => decide("NEEDS_CHANGES")} disabled={sending}>
                  {sending ? "Mengirim..." : "Kembalikan ke Mahasiswa"}
                </button>
              </>
            ) : (
              <>
                <button type="button" className="btn btn-secondary" onClick={() => setMode("changes")} disabled={sending}>Minta Perbaikan</button>
                <button type="button" className="btn btn-primary" onClick={() => decide("APPROVED")} disabled={sending}>
                  {sending ? "Mengirim..." : "Setujui & Teruskan ke UMKM"}
                </button>
              </>
            )}
          </div>
        </>
      )}
    </article>
  );
}
