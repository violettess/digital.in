"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Icon from "@/components/Icon";
import { projectsApi } from "@/lib/projects/api";
import { mentorApi } from "@/lib/mentor/api";
import { formatRupiah, formatTanggal } from "@/lib/format";

// Alur kontrak dari backend (GET /contracts/{id}) untuk UMKM & mahasiswa:
// - UMKM AWAITING_PAYMENT: buat tagihan escrow (POST /contracts/{id}/payments). Selama belum ada
//   payment gateway asli, tombol "Simulasikan pembayaran" memanggil /payments/{id}/mock-complete.
// - Mahasiswa: kirim hasil kerja per milestone (POST /milestones/{id}/submissions) -> antrian mentor.
// - UMKM: setujui / minta revisi submission yang sudah lolos mentor (POST /submissions/{id}/client-review).
// - Sengketa (POST /milestones/{id}/disputes) & pembatalan (POST /contracts/{id}/cancellations).
// Aturan bisnis (batas revisi, transisi status) tetap dijaga backend; pesan error-nya ditampilkan apa adanya.

const METHODS = [["VA", "Virtual Account"], ["QRIS", "QRIS"], ["EWALLET", "E-Wallet"]];

const MILESTONE_LABEL = {
  LOCKED: ["Terkunci", ""],
  IN_PROGRESS: ["Dikerjakan", "badge-info"],
  MENTOR_REVIEW: ["Review mentor", "badge-info"],
  NEEDS_CHANGES: ["Perlu perbaikan (mentor)", "badge-warning"],
  CLIENT_REVIEW: ["Menunggu review UMKM", "badge-primary"],
  REVISION_REQUESTED: ["Revisi diminta UMKM", "badge-warning"],
  ESCALATED: ["Dieskalasi ke admin", "badge-warning"],
  APPROVED: ["Disetujui", "badge-success"],
  RELEASED: ["Dana dicairkan", "badge-success"],
  CANCELLED: ["Dibatalkan", ""],
};

const CONTRACT_LABEL = {
  AWAITING_PAYMENT: "Menunggu pembayaran UMKM",
  FUNDED: "Dana escrow sudah masuk, menunggu mahasiswa mulai kerja",
  IN_PROGRESS: "Sedang dikerjakan",
  CANCELLATION_REQUESTED: "Pembatalan sedang diajukan",
  COMPLETED: "Selesai",
  CANCELLED: "Dibatalkan",
  TERMINATED: "Dihentikan admin",
};

const SUBMITTABLE = ["IN_PROGRESS", "NEEDS_CHANGES", "REVISION_REQUESTED"];
const ACTIVE = ["FUNDED", "IN_PROGRESS"];

export default function ContractPanel({ contractId, perspective, onChanged }) {
  const isClient = perspective === "client";
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  const load = useCallback(async () => {
    if (!contractId) return;
    setLoading(true);
    setError(null);
    const res = await projectsApi.contractDetail(contractId);
    setLoading(false);
    if (!res.ok) {
      setError(res.error.message);
      return;
    }
    setContract(res.raw);
  }, [contractId]);

  useEffect(() => { load(); }, [load]);

  async function changed(message) {
    if (message) setNotice(message);
    await load();
    onChanged?.();
  }

  if (loading && !contract) return <p className="t-small muted mt-16">Memuat kontrak...</p>;
  if (error && !contract) return <div className="pp-error mt-16" role="alert">{error}</div>;
  if (!contract) return null;

  const milestones = contract.milestones || [];

  return (
    <div className="mt-20">
      <div className="card card-pad">
        <div className="row-between" style={{ gap: 8, flexWrap: "wrap" }}>
          <div>
            <div className="t-caption">KONTRAK {contract.contract_no}</div>
            <div className="t-small mt-4" style={{ fontWeight: 700 }}>{CONTRACT_LABEL[contract.status] || contract.status}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="t-small" style={{ fontWeight: 700 }}>{formatRupiah(contract.total_amount)}</div>
            {contract.escrow && <div className="t-caption">Escrow: {formatRupiah(contract.escrow.held_amount ?? 0)} ditahan</div>}
          </div>
        </div>
        {notice && <p className="t-small mt-8" role="status">{notice}</p>}
      </div>

      {isClient && contract.status === "AWAITING_PAYMENT" && (
        <PaymentBox contract={contract} onPaid={() => changed("Pembayaran diterima. Dana ditahan di escrow sampai milestone disetujui.")} />
      )}

      <div className="t-caption mt-20 mb-8">MILESTONE ({milestones.length})</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {milestones.map((m, i) => (
          <MilestoneRow
            key={m.id} m={m} index={i} isClient={isClient}
            workAllowed={ACTIVE.includes(contract.status)}
            onChanged={changed}
          />
        ))}
      </div>

      {(() => {
        const pending = (contract.cancellation_requests || contract.cancellationRequests || [])
          .find((item) => item.status === "PENDING");
        return pending ? (
          <PendingCancellationBox
            cancellation={pending}
            contract={contract}
            isClient={isClient}
            onDone={(msg) => changed(msg)}
          />
        ) : null;
      })()}

      {["AWAITING_PAYMENT", "FUNDED", "IN_PROGRESS"].includes(contract.status) && (
        <CancellationBox contract={contract} isClient={isClient} onDone={() => changed("Pengajuan pembatalan terkirim.")} />
      )}
    </div>
  );
}

function PaymentBox({ contract, onPaid }) {
  const [method, setMethod] = useState("VA");
  const [payment, setPayment] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [mockUnavailable, setMockUnavailable] = useState(false);

  async function createBill() {
    setBusy(true);
    setError(null);
    const res = await projectsApi.pay(contract.id, method);
    setBusy(false);
    if (!res.ok) return setError(res.error.message);
    setPayment(res.data);
  }

  async function simulate() {
    setBusy(true);
    setError(null);
    const res = await projectsApi.mockCompletePayment(payment.id);
    setBusy(false);
    if (!res.ok) {
      if (res.error.code === "HTTP_404" || res.error.status === 404) {
        setMockUnavailable(true);
        return setError("Simulasi tidak tersedia: server sudah memakai payment gateway asli.");
      }
      return setError(res.error.message);
    }
    onPaid();
  }

  return (
    <div className="card card-pad mt-12">
      <div className="t-small" style={{ fontWeight: 700 }}>Bayar ke Escrow</div>
      <p className="t-small muted mt-4">Dana ditahan platform dan baru dicairkan ke mahasiswa per milestone yang kamu setujui. Biaya layanan pembayaran ditanggung UMKM.</p>
      {!payment ? (
        <>
          <div className="row gap-8 mt-12" style={{ flexWrap: "wrap" }}>
            {METHODS.map(([key, label]) => (
              <button key={key} type="button" className={`chip-filter ${method === key ? "active" : ""}`} onClick={() => setMethod(key)}>{label}</button>
            ))}
          </div>
          <button type="button" className="btn btn-primary btn-sm mt-12" onClick={createBill} disabled={busy}>
            {busy ? "Memproses..." : "Buat Tagihan"}
          </button>
        </>
      ) : (
        <div className="mt-12">
          <div className="row-between t-small"><span>Nilai proyek</span><b>{formatRupiah(payment.amount)}</b></div>
          <div className="row-between t-small"><span>Biaya layanan pembayaran</span><b>{formatRupiah(payment.gateway_fee)}</b></div>
          <div className="row-between t-small mt-4"><span>Total dibayar</span><b>{formatRupiah(payment.total_charged)}</b></div>
          {payment.expires_at && <div className="t-caption mt-4">Bayar sebelum {formatTanggal(String(payment.expires_at).slice(0, 10))}</div>}
          {!mockUnavailable && (
            <>
              <p className="t-caption mt-12">Mode uji: payment gateway belum terpasang, jadi pembayaran disimulasikan.</p>
              <button type="button" className="btn btn-primary btn-sm mt-8" onClick={simulate} disabled={busy}>
                {busy ? "Memproses..." : "Simulasikan Pembayaran Berhasil"}
              </button>
            </>
          )}
        </div>
      )}
      {error && <div className="pp-error mt-8" role="alert">{error}</div>}
    </div>
  );
}

function MilestoneRow({ m, index, isClient, workAllowed, onChanged }) {
  const [label, badge] = MILESTONE_LABEL[m.status] || [m.status, ""];
  const submissions = m.submissions || [];
  const latest = submissions[submissions.length - 1] || null;
  const lastFeedback = [...submissions].reverse()
    .flatMap((s) => [...(s.reviews || [])].reverse())
    .find((r) => r.feedback && r.decision !== "APPROVED");

  const canSubmit = !isClient && workAllowed && SUBMITTABLE.includes(m.status);
  const canClientReview = isClient && workAllowed && m.status === "CLIENT_REVIEW" && latest?.status === "PENDING_CLIENT";
  const revisionsLeft = Math.max(Number(m.max_revisions ?? 2) - Number(m.revision_count ?? 0), 0);
  const canDispute = workAllowed && m.status === "CLIENT_REVIEW" && revisionsLeft === 0;

  return (
    <div className="card card-pad">
      <div className="row-between" style={{ gap: 8, alignItems: "flex-start" }}>
        <div style={{ minWidth: 0 }}>
          <div className="t-small" style={{ fontWeight: 700 }}>{index + 1}. {m.title}</div>
          <div className="t-caption">
            {formatRupiah(m.amount)}{m.due_date && ` · tenggat ${formatTanggal(String(m.due_date).slice(0, 10))}`}
            {` · revisi ${m.revision_count ?? 0}/${m.max_revisions ?? 2}`}
          </div>
        </div>
        <span className={`badge ${badge}`}>{label}</span>
      </div>

      {lastFeedback && SUBMITTABLE.includes(m.status) && (
        <div className="t-small mt-8" style={{ whiteSpace: "pre-wrap" }}>
          <b>Catatan {lastFeedback.reviewer_role === "MENTOR" ? "mentor" : "UMKM"}:</b> {lastFeedback.feedback}
        </div>
      )}

      {latest && (isClient ? latest.status !== "PENDING_MENTOR" : true) && (
        <SubmissionFiles submission={latest} />
      )}

      {canSubmit && <SubmitWorkForm milestoneId={m.id} onDone={() => onChanged("Hasil kerja terkirim ke mentor untuk direview.")} />}
      {canClientReview && (
        <ClientReviewForm submission={latest} revisionsLeft={revisionsLeft} onDone={(msg) => onChanged(msg)} />
      )}
      {canDispute && <DisputeForm milestoneId={m.id} onDone={() => onChanged("Sengketa diajukan. Tim Verify & Trust akan menindaklanjuti.")} />}
    </div>
  );
}

function SubmissionFiles({ submission }) {
  const [error, setError] = useState(null);
  if (!submission.files?.length && !submission.notes) return null;
  async function download(f) {
    setError(null);
    const res = await mentorApi.download(submission.id, { id: f.id, name: f.file_name });
    if (!res.ok) setError(res.error.message);
  }
  return (
    <div className="mt-8">
      <div className="t-caption">Submission versi {submission.version_no}</div>
      {submission.notes && <p className="t-small muted mt-4" style={{ whiteSpace: "pre-wrap" }}>{submission.notes}</p>}
      <div className="row gap-6 mt-4" style={{ flexWrap: "wrap" }}>
        {(submission.files || []).map((f) => (
          <button key={f.id} type="button" className="btn btn-secondary btn-sm" onClick={() => download(f)}>
            <Icon name="fileText" /> {f.file_name}
          </button>
        ))}
      </div>
      {error && <div className="pp-error mt-4" role="alert">{error}</div>}
    </div>
  );
}

function SubmitWorkForm({ milestoneId, onDone }) {
  const [notes, setNotes] = useState("");
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  async function submit() {
    setError(null);
    if (!files.length) return setError("Lampirkan minimal 1 berkas hasil kerja.");
    if (files.length > 10) return setError("Maksimal 10 berkas.");
    if (files.some((f) => f.size > 20 * 1024 * 1024)) return setError("Ukuran tiap berkas maksimal 20 MB.");
    setBusy(true);
    const res = await projectsApi.submitWork(milestoneId, { notes, files });
    setBusy(false);
    if (!res.ok) return setError(res.error.message);
    setNotes("");
    setFiles([]);
    if (inputRef.current) inputRef.current.value = "";
    onDone();
  }

  return (
    <div className="mt-12">
      <div className="field" style={{ marginBottom: 8 }}>
        <label htmlFor={`sub-notes-${milestoneId}`}>Catatan untuk mentor & UMKM</label>
        <textarea id={`sub-notes-${milestoneId}`} className="input" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      <input ref={inputRef} type="file" multiple onChange={(e) => setFiles([...e.target.files])} aria-label="Berkas hasil kerja" />
      {error && <div className="pp-error mt-8" role="alert">{error}</div>}
      <button type="button" className="btn btn-primary btn-sm mt-8" onClick={submit} disabled={busy}>
        {busy ? "Mengunggah..." : "Kirim Hasil Kerja"}
      </button>
    </div>
  );
}

function ClientReviewForm({ submission, revisionsLeft, onDone }) {
  const [mode, setMode] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function decide(decision) {
    setError(null);
    if (decision === "REVISION_REQUESTED" && !feedback.trim()) return setError("Tulis apa yang perlu direvisi.");
    setBusy(true);
    const res = await projectsApi.clientReview(submission.id, { decision, feedback });
    setBusy(false);
    if (!res.ok) return setError(res.error.message);
    onDone(decision === "APPROVED" ? "Milestone disetujui. Dana milestone dicairkan ke mahasiswa." : "Permintaan revisi terkirim ke mahasiswa.");
  }

  return (
    <div className="mt-12">
      {mode === "revision" && (
        <div className="field" style={{ marginBottom: 8 }}>
          <label htmlFor={`rev-${submission.id}`}>Catatan revisi</label>
          <textarea id={`rev-${submission.id}`} className="input" rows={3} value={feedback} onChange={(e) => setFeedback(e.target.value)} />
        </div>
      )}
      {error && <div className="pp-error mb-8" role="alert">{error}</div>}
      <div className="row gap-8" style={{ flexWrap: "wrap" }}>
        {mode === "revision" ? (
          <>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setMode(null)} disabled={busy}>Batal</button>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => decide("REVISION_REQUESTED")} disabled={busy}>
              {busy ? "Mengirim..." : "Kirim Permintaan Revisi"}
            </button>
          </>
        ) : (
          <>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => decide("APPROVED")} disabled={busy}>
              {busy ? "Memproses..." : "Setujui & Cairkan Dana"}
            </button>
            {revisionsLeft > 0 ? (
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setMode("revision")} disabled={busy}>
                Minta Revisi ({revisionsLeft} tersisa)
              </button>
            ) : (
              <span className="t-caption">Jatah revisi habis: setujui atau ajukan sengketa.</span>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function DisputeForm({ milestoneId, onDone }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function submit() {
    setError(null);
    if (!reason.trim()) return setError("Jelaskan alasan sengketa.");
    setBusy(true);
    const res = await projectsApi.dispute(milestoneId, reason);
    setBusy(false);
    if (!res.ok) return setError(res.error.message);
    onDone();
  }

  if (!open) {
    return <button type="button" className="link-btn mt-8" onClick={() => setOpen(true)}><Icon name="flag" /> Ajukan Sengketa</button>;
  }
  return (
    <div className="mt-12">
      <div className="field" style={{ marginBottom: 8 }}>
        <label htmlFor={`dsp-${milestoneId}`}>Alasan sengketa</label>
        <textarea id={`dsp-${milestoneId}`} className="input" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
      </div>
      {error && <div className="pp-error mb-8" role="alert">{error}</div>}
      <div className="row gap-8">
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setOpen(false)} disabled={busy}>Batal</button>
        <button type="button" className="btn btn-primary btn-sm" onClick={submit} disabled={busy}>{busy ? "Mengirim..." : "Kirim Sengketa"}</button>
      </div>
    </div>
  );
}

function PendingCancellationBox({ cancellation, contract, isClient, onDone }) {
  const [mode, setMode] = useState(null);
  const [response, setResponse] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const isRequester = isClient
    ? cancellation.requested_by === contract.umkm?.id
    : cancellation.requested_by === contract.student?.id;

  // Actual requester is unavailable in the public contract payload unless the
  // backend includes user IDs. The API user itself decides authorization.
  async function withdraw() {
    setBusy(true);
    setError(null);
    const res = await projectsApi.withdrawCancellation(cancellation.id);
    setBusy(false);
    if (!res.ok) return setError(res.error.message);
    onDone("Pengajuan pembatalan ditarik. Kontrak kembali berjalan.");
  }

  async function respond() {
    setError(null);
    if (!response.trim()) return setError("Tuliskan tanggapan terlebih dahulu.");
    setBusy(true);
    const res = await projectsApi.respondCancellation(cancellation.id, response);
    setBusy(false);
    if (!res.ok) return setError(res.error.message);
    setMode(null);
    onDone("Tanggapan pembatalan terkirim.");
  }

  return (
    <div className="card card-pad mt-20">
      <div className="t-small" style={{ fontWeight: 700 }}>Pengajuan Pembatalan Menunggu Tanggapan</div>
      <p className="t-small muted mt-4" style={{ whiteSpace: "pre-wrap" }}>{cancellation.reason}</p>
      {cancellation.counterparty_response && (
        <p className="t-small mt-8"><b>Tanggapan pihak lain:</b> {cancellation.counterparty_response}</p>
      )}
      {error && <div className="pp-error mt-8" role="alert">{error}</div>}
      {mode === "respond" ? (
        <div className="mt-8">
          <div className="field">
            <label htmlFor={`cancel-response-${cancellation.id}`}>Tanggapan</label>
            <textarea
              id={`cancel-response-${cancellation.id}`}
              className="input"
              rows={3}
              value={response}
              onChange={(e) => setResponse(e.target.value)}
            />
          </div>
          <div className="row gap-8">
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setMode(null)} disabled={busy}>Batal</button>
            <button type="button" className="btn btn-primary btn-sm" onClick={respond} disabled={busy || !!cancellation.counterparty_response}>
              {busy ? "Mengirim..." : "Kirim Tanggapan"}
            </button>
          </div>
        </div>
      ) : (
        <div className="row gap-8 mt-8" style={{ flexWrap: "wrap" }}>
          {!cancellation.counterparty_response && (
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setMode("respond")} disabled={busy}>
              Beri Tanggapan
            </button>
          )}
          {isRequester && (
            <button type="button" className="btn btn-primary btn-sm" onClick={withdraw} disabled={busy}>
              {busy ? "Memproses..." : "Tarik Pengajuan"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function CancellationBox({ contract, isClient, onDone }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [reopen, setReopen] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const beforeWork = contract.status === "AWAITING_PAYMENT" || contract.status === "FUNDED";

  async function submit() {
    setError(null);
    if (!reason.trim()) return setError("Tulis alasan pembatalan.");
    setBusy(true);
    const res = await projectsApi.requestCancellation(contract.id, { reason, reopenProject: isClient && beforeWork && reopen });
    setBusy(false);
    if (!res.ok) return setError(res.error.message);
    setOpen(false);
    onDone();
  }

  return (
    <div className="mt-20">
      {!open ? (
        <button type="button" className="link-btn" onClick={() => setOpen(true)}>Ajukan pembatalan kontrak</button>
      ) : (
        <div className="card card-pad">
          <div className="t-small" style={{ fontWeight: 700 }}>Pembatalan Kontrak</div>
          <p className="t-small muted mt-4">
            {beforeWork
              ? "Pengerjaan belum dimulai: kontrak langsung dibatalkan dan nilai proyek dikembalikan penuh (biaya layanan pembayaran tidak dikembalikan)."
              : "Pengerjaan sudah berjalan: pengajuan ditinjau admin yang memutuskan alokasi dana per milestone."}
          </p>
          <div className="field mt-8" style={{ marginBottom: 8 }}>
            <label htmlFor={`cnl-${contract.id}`}>Alasan</label>
            <textarea id={`cnl-${contract.id}`} className="input" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
          {isClient && beforeWork && (
            <label className="row gap-8 t-small mb-8">
              <input type="checkbox" checked={reopen} onChange={(e) => setReopen(e.target.checked)} />
              Buka kembali proyek untuk pelamar lain
            </label>
          )}
          {error && <div className="pp-error mb-8" role="alert">{error}</div>}
          <div className="row gap-8">
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setOpen(false)} disabled={busy}>Batal</button>
            <button type="button" className="btn btn-primary btn-sm" onClick={submit} disabled={busy}>{busy ? "Mengirim..." : "Kirim Pengajuan"}</button>
          </div>
        </div>
      )}
    </div>
  );
}
