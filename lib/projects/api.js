// Proyek UMKM <-> backend Laravel (tabel `projects`, `applications`, `contracts` di Neon).
import { api, parseApiError } from "@/lib/api";

function messageFrom(err) {
  const e = parseApiError(err);
  if (e.code === "NETWORK") return "Tidak dapat terhubung ke server, coba lagi";
  if (e.code === "VALIDATION_FAILED" && e.details && typeof e.details === "object") {
    const first = Object.values(e.details)[0];
    return (Array.isArray(first) ? first[0] : String(first)) || "Periksa kembali isian";
  }
  if (e.code === "ACCOUNT_PENDING_VERIFICATION") return "Akunmu belum terverifikasi";
  return e.message || "Terjadi kesalahan, coba lagi";
}

async function call(fn) {
  try {
    const res = await fn();
    return { ok: true, data: res.data?.data, meta: res.data?.meta || {} };
  } catch (err) {
    return { ok: false, error: { message: messageFrom(err), code: parseApiError(err).code } };
  }
}

// --- pemetaan data backend -> bentuk yang dipakai komponen frontend ----------------
const day = (iso) => (iso ? String(iso).slice(0, 10) : "");
const STATUS_MAP = { DRAFT: "terbuka", OPEN: "terbuka", ASSIGNED: "berjalan", COMPLETED: "selesai", CANCELLED: "dibatalkan", CLOSED: "dibatalkan" };
const CONTRACT_STATUS_MAP = {
  AWAITING_PAYMENT: "berjalan",
  FUNDED: "berjalan",
  IN_PROGRESS: "berjalan",
  CANCELLATION_REQUESTED: "menunggu_review",
  COMPLETED: "selesai",
  CANCELLED: "dibatalkan",
  TERMINATED: "dibatalkan",
};
const MILESTONE_STATUS_MAP = {
  LOCKED: "belum",
  IN_PROGRESS: "berjalan",
  MENTOR_REVIEW: "selesai",
  CLIENT_REVIEW: "selesai",
  NEEDS_CHANGES: "revisi",
  REVISION_REQUESTED: "revisi",
  ESCALATED: "revisi",
  APPROVED: "disetujui",
  RELEASED: "disetujui",
};
const rupiah = (n) => `Rp${Number(n || 0).toLocaleString("id-ID")}`;

function postedAgo(iso) {
  if (!iso) return "baru saja";
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  return d <= 0 ? "hari ini" : `${d} hari lalu`;
}

/** Milestone draft form -> payload backend `suggested_milestones`. */
export function toSuggestedMilestones(milestones) {
  return milestones.map((m) => ({
    title: String(m.name || "").trim(),
    ...(m.description?.trim() ? { description: m.description.trim() } : {}),
    amount: Math.round(Number(m.amount) || 0),
    ...(m.deadline ? { due_date: m.deadline } : {}),
  }));
}

/** suggested_milestones backend -> bentuk milestone UI. */
export function fromSuggestedMilestones(list, projectId) {
  return (Array.isArray(list) ? list : []).map((m, i) => ({
    id: `${projectId}-sm${i}`,
    name: m.title,
    description: m.description || "",
    amount: Number(m.amount || 0),
    deadline: day(m.due_date),
    status: "belum",
  }));
}

/** Proyek milik UMKM (daftar "Proyek" sisi UMKM). */
export function toClientProject(p, umkmName) {
  const budget = Number(p.budget_max ?? p.budget_min ?? 0);
  return {
    id: p.id,
    title: p.title,
    client: umkmName,
    category: p.category?.name || "-",
    status: STATUS_MAP[p.status] || "terbuka",
    priceType: "Harga Tetap",
    skills: [],
    description: p.description || "Belum ada deskripsi.",
    budget,
    startDate: day(p.created_at) || day(p.published_at),
    deadline: day(p.deadline),
    location: p.city || "Remote",
    freelancerId: null,
    freelancerName: null,
    events: [],
    deliverablesRequired: 0,
    milestones: fromSuggestedMilestones(p.suggested_milestones, p.id),
    milestoneBudget: true,
    posted: true,
    fromApi: true,
  };
}

/** Kontrak dari GET /contracts -> bentuk proyek untuk tampilan Proyek Saya / UMKM. */
export function toContractProject(c) {
  const status = CONTRACT_STATUS_MAP[c.status] || "berjalan";
  const milestones = Array.isArray(c.milestones)
    ? c.milestones.map((m) => ({
        id: m.id,
        name: m.title,
        description: m.description || "",
        amount: Number(m.amount || 0),
        deadline: day(m.due_date),
        status: MILESTONE_STATUS_MAP[m.status] || "belum",
        rawStatus: m.status,
      }))
    : [];
  const startDate = day(c.started_at || c.created_at) || new Date().toISOString().slice(0, 10);
  const deadline = day(c.project?.deadline) || milestones[milestones.length - 1]?.deadline || startDate;
  return {
    id: c.project?.id || c.project_id || c.id,
    contractId: c.id,
    contractNo: c.contract_no,
    contractStatus: c.status,
    title: c.project?.title || `Kontrak ${c.contract_no || ""}`.trim(),
    client: c.umkm?.name || "UMKM",
    category: c.project?.category?.name || "Kontrak",
    status,
    priceType: "Harga Tetap",
    skills: [],
    description: `Kontrak ${c.contract_no || ""} (${c.status})`,
    budget: Number(c.total_amount || 0),
    startDate,
    deadline,
    updatedAt: day(c.updated_at || c.created_at) || startDate,
    location: c.project?.city || "Remote",
    freelancerId: c.student?.id || c.student_id || null,
    freelancerName: c.student?.name || null,
    events: [],
    deliverables: [],
    deliverablesRequired: 0,
    milestones,
    progress: c.status === "COMPLETED" ? 100 : c.status === "IN_PROGRESS" ? 50 : 0,
    breakdown: { milestone: 0, file: 0, review: 0, waktu: 0 },
    history: [],
    fromApi: true,
  };
}

/** Lowongan (kartu "Cari Proyek" sisi mahasiswa). */
export function toJobCard(p) {
  const min = Number(p.budget_min || 0);
  const max = Number(p.budget_max || 0);
  return {
    id: p.id,
    title: p.title,
    umkm: p.umkm?.name || "UMKM",
    category: p.category?.name || "-",
    budget: min && max && min !== max ? `${rupiah(min)} - ${rupiah(max)}` : rupiah(max || min),
    budgetValue: max || min,
    deadline: day(p.deadline),
    deadlineIso: day(p.deadline),
    applicants: p.applications_count ?? 0,
    location: p.city || "Remote",
    desc: p.description || "",
    requirements: [],
    postedAgo: postedAgo(p.published_at || p.created_at),
    type: "Harga Tetap",
    level: "Semua level",
    skills: [],
    clientVerified: false,
    suggestedMilestones: fromSuggestedMilestones(p.suggested_milestones, p.id),
    fromApi: true,
  };
}

export const projectsApi = {
  /** → { ok, data: [{ id, name, slug }] } */
  async categories() {
    const res = await call(() => api.get("/categories"));
    return res.ok ? { ok: true, data: res.data || [] } : res;
  },

  /** Buat + publikasikan proyek. → { ok, data: project } */
  async createAndPublish({ categoryId, title, description, budget, deadline, milestones = [] }) {
    const created = await call(() => api.post("/projects", {
      category_id: categoryId,
      title,
      description,
      budget_min: Math.round(budget),
      budget_max: Math.round(budget),
      deadline,
      // Milestone saran UMKM (hanya usulan untuk mahasiswa, lihat DECISIONS.md).
      ...(milestones.length ? { suggested_milestones: toSuggestedMilestones(milestones) } : {}),
    }));
    if (!created.ok) return created;
    const published = await call(() => api.post(`/projects/${created.data.id}/publish`));
    if (!published.ok) return published;
    return { ok: true, data: created.data };
  },

  /** Semua proyek milik UMKM yang login (semua status). */
  mine: (umkmName) => call(() => api.get("/projects", { params: { mine: 1, per_page: 50 } }))
    .then((res) => (res.ok ? { ok: true, data: (res.data || []).map((p) => toClientProject(p, umkmName)) } : res)),

  /** Lowongan OPEN untuk mahasiswa. */
  open: (q) => call(() => api.get("/projects", { params: { per_page: 50, ...(q ? { q } : {}) } }))
    .then((res) => (res.ok ? { ok: true, data: (res.data || []).map(toJobCard) } : res)),

  /**
   * Mahasiswa melamar. `milestones` (opsional, bentuk UI) = usulan milestone sendiri, mis. saran
   * UMKM yang disetujui. Tanpa itu: satu milestone = seluruh harga (tenggat = tenggat proyek).
   */
  apply: ({ projectId, proposal, price, days, dueDate, milestones }) => call(() => api.post(`/projects/${projectId}/applications`, {
    proposal,
    offered_price: Math.round(price),
    estimated_days: Math.round(days),
    proposed_milestones: milestones?.length
      ? toSuggestedMilestones(milestones).map((m) => ({ ...m, due_date: m.due_date || dueDate }))
      : [{ title: "Penyelesaian proyek", amount: Math.round(price), due_date: dueDate }],
  })),

  /** UMKM: daftar pelamar sebuah proyek. */
  applications: (projectId) => call(() => api.get(`/projects/${projectId}/applications`)),
  accept: (applicationId) => call(() => api.post(`/applications/${applicationId}/accept`)),
  reject: (applicationId) => call(() => api.post(`/applications/${applicationId}/reject`)),

  /** Kontrak milik UMKM atau Mahasiswa yang login. */
  contracts: () => call(() => api.get("/contracts", { params: { per_page: 50 } }))
    .then((res) => (res.ok ? { ok: true, data: (res.data || []).map(toContractProject), raw: res.data || [] } : res)),
  contractDetail: (contractId) => call(() => api.get(`/contracts/${contractId}`))
    .then((res) => (res.ok ? { ok: true, data: toContractProject(res.data), raw: res.data } : res)),
  startContract: (contractId) => call(() => api.post(`/contracts/${contractId}/start`)),
  /** UMKM: buat (atau ambil tagihan PENDING yang sama) pembayaran escrow. method: VA | QRIS | EWALLET. */
  pay: (contractId, method) => call(() => api.post(`/contracts/${contractId}/payments`, { method })),
  /** Simulasi gateway (mode uji, tanpa payment gateway asli). 404 jika server memakai gateway asli. */
  mockCompletePayment: (paymentId, status = "PAID") => call(() => api.post(`/payments/${paymentId}/mock-complete`, { status })),
  /** Mahasiswa: kirim hasil kerja milestone (multipart, min 1 berkas). */
  submitWork: (milestoneId, { notes, files }) => {
    const form = new FormData();
    if (notes?.trim()) form.append("notes", notes.trim());
    (files || []).forEach((f) => form.append("files[]", f));
    return call(() => api.post(`/milestones/${milestoneId}/submissions`, form, { timeout: 120000 }));
  },
  /** UMKM: decision APPROVED | REVISION_REQUESTED (feedback wajib untuk revisi). */
  clientReview: (submissionId, { decision, feedback }) => call(() => api.post(`/submissions/${submissionId}/client-review`, {
    decision,
    feedback: feedback?.trim() || null,
  })),
  /** UMKM/Mahasiswa: sengketa milestone (hanya CLIENT_REVIEW setelah jatah revisi habis). */
  dispute: (milestoneId, reason) => call(() => api.post(`/milestones/${milestoneId}/disputes`, { reason: reason.trim() })),
  /** UMKM/Mahasiswa: ajukan pembatalan kontrak. */
  requestCancellation: (contractId, { reason, reopenProject }) => call(() => api.post(`/contracts/${contractId}/cancellations`, {
    reason: reason.trim(),
    ...(reopenProject ? { reopen_project: true } : {}),
  })),
  respondCancellation: (cancellationId, response) => call(() => api.post(`/cancellations/${cancellationId}/responses`, {
    response: response.trim(),
  })),
  withdrawCancellation: (cancellationId) => call(() => api.post(`/cancellations/${cancellationId}/withdraw`)),
  /** Mahasiswa: undangan PENDING. */
  invitations: () => call(() => api.get("/invitations")),
  acceptInvitation: (invitationId) => call(() => api.post(`/invitations/${invitationId}/accept`)),
  declineInvitation: (invitationId) => call(() => api.post(`/invitations/${invitationId}/decline`)),

  /** Rating kontrak setelah COMPLETED. target: "STUDENT" | "UMKM" | "MENTOR". */
  rateContract: (contractId, { target, score, comment, mentorId }) => call(() => api.post(`/contracts/${contractId}/ratings`, {
    target,
    score: Number(score),
    comment: comment || null,
    ...(mentorId ? { mentor_id: mentorId } : {}),
  })),

  /** Daftar mahasiswa terverifikasi (GET /students) untuk rekomendasi dashboard UMKM. */
  students: (params) => call(() => api.get("/students", { params })),
};
