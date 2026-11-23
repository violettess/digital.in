// Review mentor <-> backend: GET /mentor/review-queue, POST /submissions/{id}/mentor-review,
// GET /submissions/{id}/files/{file}. Mengembalikan { ok, data } / { ok:false, error:{ code, message, fields } }.
import { api, parseApiError } from "@/lib/api";

const MESSAGES = {
  NETWORK: "Tidak dapat terhubung ke server, coba lagi",
  ACCOUNT_PENDING_VERIFICATION: "Antrian review terbuka setelah akun mentormu diaktifkan",
  FORBIDDEN: "Kamu tidak ditugaskan untuk submission ini",
  INVALID_STATE_TRANSITION: "Submission ini sudah tidak menunggu review mentor",
};

async function call(fn) {
  try {
    const res = await fn();
    return { ok: true, data: res.data?.data, meta: res.data?.meta || {} };
  } catch (err) {
    const e = parseApiError(err);
    const fields = {};
    if (e.code === "VALIDATION_FAILED" && e.details && typeof e.details === "object") {
      for (const [k, v] of Object.entries(e.details)) fields[k] = Array.isArray(v) ? v[0] : String(v);
    }
    return {
      ok: false,
      error: { code: e.code, status: e.status, message: Object.values(fields)[0] || MESSAGES[e.code] || e.message || "Terjadi kesalahan, coba lagi", fields },
    };
  }
}

const day = (iso) => (iso ? String(iso).slice(0, 10) : "");

/** Milestone MENTOR_REVIEW dari antrian -> item tampilan. Submission = yang PENDING_MENTOR terbaru. */
export function toReviewItem(m) {
  const subs = Array.isArray(m.submissions) ? m.submissions : [];
  const sub = [...subs].sort((a, b) => Number(b.version_no || 0) - Number(a.version_no || 0))[0] || null;
  return {
    milestoneId: m.id,
    title: m.title,
    description: m.description || "",
    amount: Number(m.amount || 0),
    dueDate: day(m.due_date),
    projectTitle: m.contract?.project?.title || "Proyek",
    contractNo: m.contract?.contract_no || "",
    mentorReturns: Number(m.mentor_return_count || 0),
    maxMentorReturns: Number(m.max_mentor_returns || 3),
    submittedAt: sub?.submitted_at || sub?.created_at || m.updated_at || null,
    submission: sub && {
      id: sub.id,
      version: Number(sub.version_no || 1),
      notes: sub.notes || "",
      files: (sub.files || []).map((f) => ({ id: f.id, name: f.file_name || "berkas", size: f.size_bytes ?? null })),
    },
  };
}

export const mentorApi = {
  /** → { ok, data: [reviewItem], meta } */
  queue: async (page = 1) => {
    const res = await call(() => api.get("/mentor/review-queue", { params: { page, per_page: 50 } }));
    return res.ok ? { ...res, data: (res.data || []).map(toReviewItem) } : res;
  },
  /** decision: "APPROVED" | "NEEDS_CHANGES" (feedback wajib untuk NEEDS_CHANGES). */
  review: (submissionId, { decision, feedback }) => call(() => api.post(`/submissions/${submissionId}/mentor-review`, {
    decision,
    feedback: feedback?.trim() || null,
  })),
  /** Unduh berkas submission (private storage) lewat API ber-token, lalu simpan di browser. */
  async download(submissionId, file) {
    try {
      const res = await api.get(`/submissions/${submissionId}/files/${file.id}`, { responseType: "blob", timeout: 60000 });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      return { ok: true };
    } catch (err) {
      const e = parseApiError(err);
      return { ok: false, error: { code: e.code, message: MESSAGES[e.code] || "Berkas tidak bisa diunduh" } };
    }
  },
};
