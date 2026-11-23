"use client";

import { useEffect, useState } from "react";
import Drawer from "@/components/ui/Drawer";
import Icon from "@/components/Icon";
import JobDetailSkeleton from "./JobDetailSkeleton";
<<<<<<< HEAD
import { projectsApi } from "@/lib/projects/api";
=======
>>>>>>> 3d15cf437f7342a62ab35a2a9a5a2e615e4b4f99

const FETCH_DELAY_MS = 600; // konsisten dengan delay simulasi di JobFeed

// Drawer generik dari komponen/ui/Drawer, dikombinasikan dengan konten
<<<<<<< HEAD
// spesifik "detail proyek".
export default function JobDetailDrawer({ project, open, onClose }) {
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [proposal, setProposal] = useState("");
  const [price, setPrice] = useState("");
  const [days, setDays] = useState("7");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [sent, setSent] = useState(false);
  const suggested = project?.suggestedMilestones || [];
  const suggestedTotal = suggested.reduce((s, m) => s + m.amount, 0);
  const [useSuggested, setUseSuggested] = useState(false);
=======
// spesifik "detail proyek". Setiap kali `project` berganti, kita simulasikan
// fetch ulang (skeleton dulu, baru konten) — nanti ini yang diganti query
// Supabase per-id begitu backend-nya ada.
export default function JobDetailDrawer({ project, open, onClose }) {
  const [loading, setLoading] = useState(true);
>>>>>>> 3d15cf437f7342a62ab35a2a9a5a2e615e4b4f99

  useEffect(() => {
    if (!open || !project) return;
    setLoading(true);
    const t = setTimeout(() => setLoading(false), FETCH_DELAY_MS);
    return () => clearTimeout(t);
  }, [open, project?.id]);

<<<<<<< HEAD
  // Form lamaran dikosongkan tiap ganti proyek.
  useEffect(() => {
    setFormOpen(false);
    setProposal("");
    const hasSuggestion = (project?.suggestedMilestones || []).length > 0;
    setUseSuggested(hasSuggestion);
    setPrice(String(hasSuggestion
      ? project.suggestedMilestones.reduce((s, m) => s + m.amount, 0)
      : project?.budgetValue || ""));
    setDays("7");
    setError(null);
    setSent(false);
    setSending(false);
  }, [project?.id]);

  async function submitProposal() {
    setError(null);
    if (!proposal.trim()) return setError("Tulis proposal singkat dulu.");
    if (!(Number(price) > 0)) return setError("Harga penawaran harus lebih dari 0.");
    if (useSuggested && Number(price) !== suggestedTotal) {
      return setError("Saat memakai milestone saran UMKM, harga penawaran harus sama dengan total milestone.");
    }
    if (!(Number(days) > 0)) return setError("Estimasi hari harus lebih dari 0.");
    setSending(true);
    const res = await projectsApi.apply({
      projectId: project.id,
      proposal: proposal.trim(),
      price: Number(price),
      days: Number(days),
      dueDate: project.deadlineIso,
      milestones: useSuggested ? suggested : undefined,
    });
    setSending(false);
    if (!res.ok) return setError(res.error.message);
    setSent(true);
  }

=======
>>>>>>> 3d15cf437f7342a62ab35a2a9a5a2e615e4b4f99
  return (
    <Drawer open={open} onClose={onClose} title={loading ? "Memuat proyek..." : project?.title}>
      {!project ? null : loading ? (
        <JobDetailSkeleton />
      ) : (
        <div className="job-detail">
          <div className="row-between">
            <span className="badge badge-primary">{project.category}</span>
            <span className="t-caption">{project.applicants} pelamar</span>
          </div>

          <h3 className="t-h2 mt-16">{project.title}</h3>
          <div className="t-small muted mt-6">{project.umkm} · {project.location}</div>

          <div className="job-detail-stats mt-20">
            <div>
              <div className="t-caption">BUDGET</div>
              <div className="t-h3 mt-4" style={{ fontSize: 17 }}>{project.budget}</div>
            </div>
            <div>
              <div className="t-caption">TENGGAT</div>
              <div className="t-h3 mt-4" style={{ fontSize: 17 }}>{project.deadline}</div>
            </div>
          </div>

          <div className="divider" />

          <div>
            <div className="t-caption mb-8">DESKRIPSI PROYEK</div>
            <p className="t-body">{project.desc}</p>
          </div>

          {project.requirements?.length > 0 && (
            <div className="mt-20">
              <div className="t-caption mb-8">YANG DICARI UMKM INI</div>
              <ul className="job-detail-reqs">
                {project.requirements.map((r) => (
                  <li key={r}><Icon name="check" /> {r}</li>
                ))}
              </ul>
            </div>
          )}

<<<<<<< HEAD
          {suggested.length > 0 && (
            <div className="mt-20">
              <div className="t-caption mb-8">MILESTONE SARAN UMKM</div>
              <div className="pp-review-list">
                {suggested.map((m, i) => (
                  <div key={m.id} className="row-between">
                    <span className="t-small">{i + 1}. {m.name}{m.deadline && <span className="muted"> · {m.deadline}</span>}</span>
                    <span className="t-small" style={{ fontWeight: 700 }}>Rp{m.amount.toLocaleString("id-ID")}</span>
                  </div>
                ))}
              </div>
              <div className="row-between mt-8">
                <span className="t-small muted">Total</span>
                <b className="t-small">Rp{suggestedTotal.toLocaleString("id-ID")}</b>
              </div>
            </div>
          )}

          <div className="drawer-footer">
            {!project.fromApi ? (
              <button className="btn btn-primary btn-block btn-lg" onClick={() => alert("Fitur ajukan proposal tersedia di mode terhubung backend")}>
                Ajukan Proposal
              </button>
            ) : sent ? (
              <p className="t-body" style={{ textAlign: "center" }} role="status">Proposal terkirim. UMKM akan menghubungimu bila tertarik.</p>
            ) : formOpen ? (
              <div>
                <div className="field">
                  <label htmlFor="ap-proposal">Proposal</label>
                  <textarea id="ap-proposal" className="input" rows={4} value={proposal} onChange={(e) => setProposal(e.target.value)} placeholder="Ceritakan pengalaman dan rencana pengerjaanmu." />
                </div>
                <div className="row gap-8">
                  <div className="field" style={{ flex: 1 }}>
                    <label htmlFor="ap-price">Harga penawaran (Rp)</label>
                    <input id="ap-price" className="input" type="number" min="1" value={price} onChange={(e) => setPrice(e.target.value)} />
                  </div>
                  <div className="field" style={{ flex: 1 }}>
                    <label htmlFor="ap-days">Estimasi (hari)</label>
                    <input id="ap-days" className="input" type="number" min="1" value={days} onChange={(e) => setDays(e.target.value)} />
                  </div>
                </div>
                {suggested.length > 0 && (
                  <label className="row gap-8 t-small" style={{ marginBottom: 10, cursor: "pointer" }}>
                    <input
                      type="checkbox" checked={useSuggested}
                      onChange={(e) => {
                        setUseSuggested(e.target.checked);
                        if (e.target.checked) setPrice(String(suggestedTotal));
                      }}
                    />
                    Pakai milestone saran UMKM ({suggested.length} milestone)
                  </label>
                )}
                {error && <div className="pp-error" role="alert" style={{ marginBottom: 8 }}>{error}</div>}
                <div className="row gap-8">
                  <button type="button" className="btn btn-secondary" onClick={() => setFormOpen(false)} disabled={sending}>Batal</button>
                  <button type="button" className="btn btn-primary" style={{ flex: 1 }} onClick={submitProposal} disabled={sending}>{sending ? "Mengirim..." : "Kirim Proposal"}</button>
                </div>
              </div>
            ) : (
              <button className="btn btn-primary btn-block btn-lg" onClick={() => setFormOpen(true)}>
                Ajukan Proposal
              </button>
            )}
=======
          <div className="drawer-footer">
            {/* Belum ada backend lamaran/proposal — tombol ini dummy dulu,
                sama seperti pola di ApplicantRow. */}
            <button className="btn btn-primary btn-block btn-lg" onClick={() => alert("Fitur ajukan proposal belum tersedia di prototipe ini")}>
              Ajukan Proposal
            </button>
>>>>>>> 3d15cf437f7342a62ab35a2a9a5a2e615e4b4f99
          </div>
        </div>
      )}
    </Drawer>
  );
}
