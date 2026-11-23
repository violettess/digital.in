"use client";

import { useEffect, useState } from "react";
import Drawer from "@/components/ui/Drawer";
import Icon from "@/components/Icon";
import JobDetailSkeleton from "./JobDetailSkeleton";
import { projectsApi } from "@/lib/projects/api";
import { formatRupiah, getTodayIso } from "@/lib/format";
import { newMilestone } from "@/lib/projects-posting";

const FETCH_DELAY_MS = 600; // konsisten dengan delay simulasi di JobFeed

// Drawer generik dari komponen/ui/Drawer, dikombinasikan dengan konten
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
  const [proposalMilestones, setProposalMilestones] = useState([]);
  const proposalMilestoneTotal = proposalMilestones.reduce((sum, milestone) => sum + (Number(milestone.amount) || 0), 0);

  useEffect(() => {
    if (!open || !project) return;
    setLoading(true);
    const t = setTimeout(() => setLoading(false), FETCH_DELAY_MS);
    return () => clearTimeout(t);
  }, [open, project?.id]);

  // Form lamaran dikosongkan tiap ganti proyek.
  useEffect(() => {
    setFormOpen(false);
    setProposal("");
    const hasSuggestion = (project?.suggestedMilestones || []).length > 0;
    setUseSuggested(hasSuggestion);
    const initialPrice = hasSuggestion
      ? project.suggestedMilestones.reduce((s, m) => s + m.amount, 0)
      : project?.budgetValue || "";
    setPrice(String(initialPrice));
    setProposalMilestones([{
      ...newMilestone(),
      name: "Penyelesaian proyek",
      amount: String(initialPrice),
      deadline: project?.deadlineIso || getTodayIso(),
    }]);
    setDays("7");
    setError(null);
    setSent(false);
    setSending(false);
  }, [project?.id]);

  function updateProposalMilestone(id, patch) {
    setProposalMilestones((list) => list.map((milestone) => (
      milestone.id === id ? { ...milestone, ...patch } : milestone
    )));
  }

  function addProposalMilestone() {
    setProposalMilestones((list) => (list.length >= 10 ? list : [
      ...list,
      { ...newMilestone(), deadline: project?.deadlineIso || getTodayIso() },
    ]));
  }

  function removeProposalMilestone(id) {
    setProposalMilestones((list) => list.length <= 1 ? list : list.filter((milestone) => milestone.id !== id));
  }

  async function submitProposal() {
    setError(null);
    if (!proposal.trim()) return setError("Tulis proposal singkat dulu.");
    if (!Number.isSafeInteger(Number(price)) || !(Number(price) > 0)) {
      return setError("Harga penawaran harus berupa bilangan Rupiah bulat lebih dari 0.");
    }
    if (useSuggested && Number(price) !== suggestedTotal) {
      return setError("Saat memakai milestone saran UMKM, harga penawaran harus sama dengan total milestone.");
    }
    if (!Number.isSafeInteger(Number(days)) || !(Number(days) > 0)) {
      return setError("Estimasi hari harus berupa bilangan bulat lebih dari 0.");
    }
    if (!useSuggested) {
      if (proposalMilestones.length === 0 || proposalMilestones.length > 10) {
        return setError("Proposal harus memiliki 1–10 milestone.");
      }
      if (proposalMilestones.some((milestone) => !milestone.name.trim()
        || !Number.isSafeInteger(Number(milestone.amount))
        || !(Number(milestone.amount) > 0)
        || !milestone.deadline)) {
        return setError("Isi nama, nominal Rupiah bulat positif, dan tenggat setiap milestone.");
      }
      const today = getTodayIso();
      if (proposalMilestones.some((milestone) => milestone.deadline < today)) {
        return setError("Tenggat milestone tidak boleh di masa lalu.");
      }
      if (proposalMilestones.some((milestone, index) => index > 0
        && milestone.deadline < proposalMilestones[index - 1].deadline)) {
        return setError("Urutkan milestone berdasarkan tenggat yang tidak semakin awal.");
      }
      if (proposalMilestoneTotal !== Number(price)) {
        return setError("Total nominal milestone harus sama dengan harga penawaran.");
      }
    }
    setSending(true);
    const res = await projectsApi.apply({
      projectId: project.id,
      proposal: proposal.trim(),
      price: Number(price),
      days: Number(days),
      dueDate: project.deadlineIso,
      milestones: useSuggested ? suggested : proposalMilestones,
    });
    setSending(false);
    if (!res.ok) return setError(res.error.message);
    setSent(true);
  }

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
                    <input id="ap-price" className="input" type="number" min="1" step="1" value={price} onChange={(e) => setPrice(e.target.value)} />
                  </div>
                  <div className="field" style={{ flex: 1 }}>
                    <label htmlFor="ap-days">Estimasi (hari)</label>
                    <input id="ap-days" className="input" type="number" min="1" max="365" step="1" value={days} onChange={(e) => setDays(e.target.value)} />
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
                {!useSuggested && (
                  <div className="card card-pad mb-12">
                    <div className="row-between mb-8" style={{ gap: 8 }}>
                      <div>
                        <div className="t-small" style={{ fontWeight: 700 }}>Milestone proposalmu</div>
                        <div className="t-caption muted">Total milestone harus sama dengan harga penawaran.</div>
                      </div>
                      <div className="t-small" style={{ fontWeight: 700 }}>{formatRupiah(proposalMilestoneTotal)}</div>
                    </div>
                    <div className="pp-milestones">
                      {proposalMilestones.map((milestone, index) => (
                        <div key={milestone.id} className="pp-ms-card">
                          <div className="row-between mb-8">
                            <span className="settings-item-title">Milestone {index + 1}</span>
                            <button
                              type="button"
                              className="fp-icon-btn danger"
                              disabled={proposalMilestones.length <= 1}
                              onClick={() => removeProposalMilestone(milestone.id)}
                              aria-label={`Hapus milestone ${index + 1}`}
                            >
                              <Icon name="trash" />
                            </button>
                          </div>
                          <div className="field" style={{ marginBottom: 10 }}>
                            <label htmlFor={`ap-ms-title-${milestone.id}`}>Nama milestone</label>
                            <input
                              id={`ap-ms-title-${milestone.id}`}
                              className="input"
                              value={milestone.name}
                              onChange={(e) => updateProposalMilestone(milestone.id, { name: e.target.value })}
                              maxLength={255}
                            />
                          </div>
                          <div className="field" style={{ marginBottom: 10 }}>
                            <label htmlFor={`ap-ms-description-${milestone.id}`}>Deskripsi singkat (opsional)</label>
                            <input
                              id={`ap-ms-description-${milestone.id}`}
                              className="input"
                              value={milestone.description}
                              onChange={(e) => updateProposalMilestone(milestone.id, { description: e.target.value })}
                              maxLength={2000}
                            />
                          </div>
                          <div className="pp-ms-grid">
                            <div className="field" style={{ marginBottom: 0 }}>
                              <label htmlFor={`ap-ms-amount-${milestone.id}`}>Nominal (Rp)</label>
                              <input
                                id={`ap-ms-amount-${milestone.id}`}
                                className="input"
                                type="number"
                                min="1"
                                step="1"
                                value={milestone.amount}
                                onChange={(e) => updateProposalMilestone(milestone.id, { amount: e.target.value })}
                              />
                            </div>
                            <div className="field" style={{ marginBottom: 0 }}>
                              <label htmlFor={`ap-ms-date-${milestone.id}`}>Tenggat</label>
                              <input
                                id={`ap-ms-date-${milestone.id}`}
                                className="input"
                                type="date"
                                min={getTodayIso()}
                                value={milestone.deadline}
                                onChange={(e) => updateProposalMilestone(milestone.id, { deadline: e.target.value })}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm mt-12"
                      onClick={addProposalMilestone}
                      disabled={proposalMilestones.length >= 10}
                    >
                      <Icon name="plus" /> Tambah milestone
                    </button>
                  </div>
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
          </div>
        </div>
      )}
    </Drawer>
  );
}
