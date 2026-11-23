// Cari Freelancer (UMKM) <-> backend: GET /students, GET /projects/{id}/recommendations,
// POST /projects/{id}/invitations. Mengembalikan { ok, data } / { ok:false, error:{ code, message } }.
import { api, parseApiError } from "@/lib/api";

const MESSAGES = {
  NETWORK: "Tidak dapat terhubung ke server, coba lagi",
  ACCOUNT_PENDING_VERIFICATION: "Tersedia setelah akunmu terverifikasi",
  FORBIDDEN: "Akun ini tidak bisa memakai fitur ini",
};

async function call(fn) {
  try {
    const res = await fn();
    return { ok: true, data: res.data?.data, meta: res.data?.meta || {} };
  } catch (err) {
    const e = parseApiError(err);
    let message = MESSAGES[e.code] || e.message || "Terjadi kesalahan, coba lagi";
    if (e.code === "VALIDATION_FAILED" && e.details && typeof e.details === "object") {
      const first = Object.values(e.details)[0];
      message = (Array.isArray(first) ? first[0] : String(first)) || message;
    }
    return { ok: false, error: { code: e.code, status: e.status, message } };
  }
}

const LEVELS = { BEGINNER: 1, INTERMEDIATE: 2, ADVANCED: 3 };
const AVATAR_COLORS = ["#EADFF0", "#DDEDE3", "#F5E5D9", "#F0E3E0", "#DEE7F2", "#E4EEDC", "#E6E1F5", "#F5EBD9", "#DCEFEF", "#F3E3EA"];

function colorFor(id = "") {
  let h = 0;
  for (const ch of String(id)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

/**
 * Profil publik mahasiswa (PublicStudentProfileResource) -> bentuk talent yang dipakai
 * FindTalentView / TalentResultCard / TalentDetailPanel. Field yang tidak ada di backend
 * (tarif, penghasilan, ulasan, riwayat) diisi kosong; kartu menyembunyikannya saat `fromApi`.
 * `id` = id profil mahasiswa (dipakai undangan sebagai student_profile_id).
 */
export function toTalent(s) {
  const skills = (s.skills || []).map((k) => ({ name: k.name, level: LEVELS[k.level] || 1 }));
  const uni = s.university?.name || s.university_name_custom || "-";
  return {
    id: s.id,
    name: s.name || "Mahasiswa",
    title: skills.length ? skills.map((k) => k.name).slice(0, 2).join(" & ") : "Mahasiswa Digital.in",
    uni,
    major: "",
    education: "-",
    city: s.city || "-",
    timezone: "WIB",
    avatarBg: colorFor(s.id),
    category: skills[0]?.name || "-",
    rate: 0,
    badge: s.is_verified ? "terverifikasi" : "baru",
    boosted: false,
    available: true,
    successRate: 0,
    earnings: 0,
    totalProjects: Number(s.completed_contracts_count || 0),
    totalHours: 0,
    rating: Number(s.rating_avg || 0),
    reviewCount: 0,
    responseTime: "-",
    association: null,
    bio: (s.portfolio || [])[0]?.summary || "",
    summary: (s.portfolio || []).map((p) => p.summary).filter(Boolean).join(" ") || "Belum ada ringkasan portofolio.",
    skills,
    portfolio: (s.portfolio || []).map((p) => ({ id: p.id, title: p.title, icon: "folder" })),
    reviews: [],
    workHistory: [],
    experience: [],
    matchScore: null,
    fromApi: true,
  };
}

/** Item rekomendasi (MatchingService::recommend) -> talent. `known` = talent dari GET /students bila ada. */
export function fromRecommendation(r, known) {
  const base = known || toTalent({
    id: r.student_profile_id,
    name: r.name,
    university: r.university,
    city: r.university?.city,
    rating_avg: r.rating_avg,
    is_verified: true,
    skills: [],
  });
  return { ...base, matchScore: Number(r.match_score ?? 0), boosted: true };
}

const MAX_PAGES = 5; // backend memaginasi 20 per halaman

export const talentsApi = {
  /** Semua mahasiswa terverifikasi & tersedia (maks 100). params: { city, category_id, rating_min }. */
  async list(params = {}) {
    const all = [];
    for (let page = 1; page <= MAX_PAGES; page++) {
      const res = await call(() => api.get("/students", { params: { ...params, page } }));
      if (!res.ok) return page === 1 ? res : { ok: true, data: all };
      all.push(...(res.data || []).map(toTalent));
      if (!res.meta.last_page || page >= res.meta.last_page) break;
    }
    return { ok: true, data: all };
  },
  /** Rekomendasi untuk proyek DRAFT/OPEN milik UMKM. → { ok, data: [{ student_profile_id, match_score, ... }] } */
  recommendations: (projectId) => call(() => api.get(`/projects/${projectId}/recommendations`)),
  /** Undang talent (id profil) ke proyek OPEN. */
  invite: ({ projectId, studentProfileId, message }) => call(() => api.post(`/projects/${projectId}/invitations`, {
    student_profile_id: studentProfileId,
    ...(message ? { message } : {}),
  })),
};
