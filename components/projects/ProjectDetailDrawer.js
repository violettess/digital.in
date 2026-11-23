"use client";

import { useCallback, useEffect, useState } from "react";
import Icon from "@/components/Icon";
import Drawer from "@/components/ui/Drawer";
import ProjectFundList from "@/components/escrow/ProjectFundList";
import MilestoneManager from "@/components/projects/MilestoneManager";
import { STATUS_META } from "@/lib/projects.mock";
import { formatRupiah, formatTanggal } from "@/lib/format";
import { useChat } from "@/context/ChatContext";
import { useProjects } from "@/context/ProjectsContext";
import { projectsApi } from "@/lib/projects/api";
import ContractPanel from "@/components/projects/ContractPanel";

export default function ProjectDetailDrawer({ project, open, onClose, perspective = "freelancer", onUpdated }) {
  const { openWidget } = useChat();
  const projectsCtx = useProjects();
  const meta = project ? STATUS_META[project.status] : null;
  const isClientView = perspective === "client";

  // --- Pelamar proyek (UMKM, untuk proyek terbuka dari API) ---
  const [applications, setApplications] = useState([]);
  const [appsLoading, setAppsLoading] = useState(false);
  const [appsError, setAppsError] = useState(null);
  const [busyAppId, setBusyAppId] = useState(null);

  const loadApplications = useCallback(async () => {
    if (!open || !project?.fromApi || !isClientView) return;
    setAppsLoading(true);
    setAppsError(null);
    const res = await projectsApi.applications(project.id);
    setAppsLoading(false);
    if (res.ok) setApplications(res.data || []);
    else setAppsError(res.error.message);
  }, [open, project?.id, project?.fromApi, isClientView]);

  useEffect(() => {
    setApplications([]);
    setAppsError(null);
    loadApplications();
  }, [loadApplications]);

  async function handleAccept(app) {
    setBusyAppId(app.id);
    setAppsError(null);
    const res = await projectsApi.accept(app.id);
    setBusyAppId(null);
    if (!res.ok) {
      setAppsError(res.error.message);
      return;
    }
    await loadApplications();
    projectsCtx?.reload?.();
    onUpdated?.();
  }

  async function handleReject(app) {
    setBusyAppId(app.id);
    setAppsError(null);
    const res = await projectsApi.reject(app.id);
    setBusyAppId(null);
    if (!res.ok) {
      setAppsError(res.error.message);
      return;
    }
    await loadApplications();
  }

  // --- Kontrak: Mulai Kerja (Mahasiswa saat FUNDED) ---
  const [starting, setStarting] = useState(false);
  const [contractError, setContractError] = useState(null);
  const [contractStarted, setContractStarted] = useState(false);

  // --- Rating setelah COMPLETED (UMKM -> STUDENT, Mahasiswa -> UMKM) ---
  const [ratingScore, setRatingScore] = useState(5);
  const [ratingComment, setRatingComment] = useState("");
  const [ratingSaving, setRatingSaving] = useState(false);
  const [ratingError, setRatingError] = useState(null);
  const [ratingSent, setRatingSent] = useState(false);

  useEffect(() => {
    setStarting(false);
    setContractError(null);
    setContractStarted(false);
    setRatingScore(5);
    setRatingComment("");
    setRatingSaving(false);
    setRatingError(null);
    setRatingSent(false);
  }, [project?.id, project?.contractId]);

  async function handleStartWork() {
    if (!project?.contractId || starting) return;
    setStarting(true);
    setContractError(null);
    const res = await projectsApi.startContract(project.contractId);
    setStarting(false);
    if (!res.ok) {
      setContractError(res.error.message);
      return;
    }
    setContractStarted(true);
    onUpdated?.();
  }

  async function handleSubmitRating(e) {
    e.preventDefault();
    if (!project?.contractId || ratingSaving) return;
    setRatingSaving(true);
    setRatingError(null);
    const target = isClientView ? "STUDENT" : "UMKM";
    const res = await projectsApi.rateContract(project.contractId, {
      target,
      score: ratingScore,
      comment: ratingComment.trim() || null,
    });
    setRatingSaving(false);
    if (!res.ok) {
      setRatingError(res.error.message);
      return;
    }
    setRatingSent(true);
    onUpdated?.();
  }

  const canRate = project?.fromApi && project?.contractId && (project?.status === "selesai" || project?.contractStatus === "COMPLETED");
  const canStartWork = !isClientView && project?.fromApi && project?.contractId && project?.contractStatus === "FUNDED" && !contractStarted;

  return (
    <Drawer open={open} onClose={onClose} title={project?.title || "Detail Proyek"}>
      {project && (
        <div className="job-detail">
          <div className="row-between">
            <span className={`badge ${meta.badgeClass}`}>
              <Icon name={meta.icon} /> {meta.label}
            </span>
            <span className="t-caption">
              {isClientView && project.freelancerName
                ? `Freelancer: ${project.freelancerName}`
                : `Klien: ${project.client}`}
            </span>
          </div>

          <div className="job-detail-stats mt-20">
            <div>
              <div className="t-caption">ANGGARAN</div>
              <div className="t-h3 mt-4" style={{ fontSize: 17 }}>{formatRupiah(project.budget)}</div>
            </div>
            <div>
              <div className="t-caption">TENGGAT</div>
              <div className="t-h3 mt-4" style={{ fontSize: 17 }}>{formatTanggal(project.deadline)}</div>
            </div>
          </div>

          {project.status !== "terbuka" && (
            <div className="mt-20">
              <div className="row-between t-caption mb-4"><span>Progress</span><span>{project.progress}%</span></div>
              <div className="progress-track"><div className="progress-fill" style={{ width: `${project.progress}%` }} /></div>
            </div>
          )}

          <div className="divider" />

          <div>
            <div className="t-caption mb-8">DESKRIPSI</div>
            <p className="t-body">{project.description}</p>
          </div>

          {canStartWork && (
            <div className="card card-pad mt-16">
              <div className="t-small" style={{ fontWeight: 700 }}>Kontrak Sudah Didanai</div>
              <p className="t-small muted mt-4">Klik tombol di bawah untuk mulai mengerjakan milestone pertama.</p>
              {contractError && <div className="pp-error mt-8" role="alert">{contractError}</div>}
              <button type="button" className="btn btn-primary btn-sm mt-12" onClick={handleStartWork} disabled={starting}>
                {starting ? "Memproses..." : "Mulai Kerja"}
              </button>
            </div>
          )}

          {project.fromApi && project.contractId && (
            <ContractPanel
              contractId={project.contractId}
              perspective={isClientView ? "client" : "student"}
              onChanged={onUpdated}
            />
          )}

          {isClientView && project.fromApi && (
            <div className="mt-20">
              <div className="t-caption mb-8">PELAMAR PROYEK ({applications.length})</div>
              {appsLoading ? (
                <p className="t-small muted">Memuat daftar pelamar...</p>
              ) : appsError ? (
                <div className="pp-error" role="alert">{appsError}</div>
              ) : applications.length === 0 ? (
                <p className="t-small muted">Belum ada mahasiswa yang melamar proyek ini.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {applications.map((app) => {
                    const uni = app.student?.student_profile?.university?.name;
                    const major = app.student?.student_profile?.major;
                    const isPending = app.status === "PENDING" || app.status === "SHORTLISTED";
                    return (
                      <div key={app.id} className="card card-pad">
                        <div className="row-between" style={{ gap: 8 }}>
                          <div>
                            <div className="t-small" style={{ fontWeight: 700 }}>{app.student?.name || "Mahasiswa"}</div>
                            {(uni || major) && <div className="t-caption muted">{[major, uni].filter(Boolean).join(" · ")}</div>}
                          </div>
                          <span className="badge badge-neutral">{app.status}</span>
                        </div>
                        <div className="t-small mt-8">
                          Penawaran: <b>{formatRupiah(app.offered_price)}</b> · Estimasi {app.estimated_days} hari
                        </div>
                        {app.proposal && <p className="t-small muted mt-6">{app.proposal}</p>}
                        {isPending && project.status === "terbuka" && (
                          <div className="row gap-8 mt-12">
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              disabled={busyAppId === app.id}
                              onClick={() => handleAccept(app)}
                            >
                              {busyAppId === app.id ? "Memproses..." : "Terima & Buat Kontrak"}
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              disabled={busyAppId === app.id}
                              onClick={() => handleReject(app)}
                            >
                              Tolak
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {canRate && (
            <div className="card card-pad mt-20">
              <div className="t-caption mb-8">BERI RATING {isClientView ? "FREELANCER" : "KLIEN UMKM"}</div>
              {ratingSent ? (
                <p className="t-small" role="status">Terima kasih! Rating berhasil disimpan.</p>
              ) : (
                <form onSubmit={handleSubmitRating}>
                  <div className="row gap-6 mb-10">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        className={`chip-filter ${ratingScore === n ? "active" : ""}`}
                        onClick={() => setRatingScore(n)}
                      >
                        ★ {n}
                      </button>
                    ))}
                  </div>
                  <textarea
                    className="input"
                    rows={2}
                    placeholder="Tulis ulasan singkat (opsional)..."
                    value={ratingComment}
                    onChange={(e) => setRatingComment(e.target.value)}
                  />
                  {ratingError && <div className="pp-error mt-8" role="alert">{ratingError}</div>}
                  <button type="submit" className="btn btn-primary btn-sm mt-10" disabled={ratingSaving}>
                    {ratingSaving ? "Menyimpan..." : "Kirim Rating"}
                  </button>
                </form>
              )}
            </div>
          )}

          {isClientView && !project.fromApi && <MilestoneManager project={project} />}

          {isClientView && !project.fromApi && <ProjectFundList project={project} />}

          <div className="drawer-footer">
            {isClientView && !project.freelancerName && applications.length === 0 ? (
              <p className="t-small muted" style={{ textAlign: "center" }}>
                Belum ada freelancer di proyek ini. Pesan tersedia setelah ada pelamar atau freelancer yang mengerjakannya.
              </p>
            ) : (
              <button
                type="button"
                className="btn btn-primary btn-block btn-lg"
                onClick={() => { onClose(); openWidget(project.id); }}
              >
                <Icon name="chat" /> {isClientView ? "Kirim Pesan ke Freelancer" : "Kirim Pesan ke Klien"}
              </button>
            )}
          </div>
        </div>
      )}
    </Drawer>
  );
}
