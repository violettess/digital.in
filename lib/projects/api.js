// Simpan proyek UMKM ke backend Laravel (-> tabel `projects` di Neon).
// POST /projects (DRAFT) lalu POST /projects/{id}/publish (OPEN).
import { api, parseApiError } from "@/lib/api";

function messageFrom(err) {
  const e = parseApiError(err);
  if (e.code === "NETWORK") return "Tidak dapat terhubung ke server, coba lagi";
  if (e.code === "VALIDATION_FAILED" && e.details && typeof e.details === "object") {
    const first = Object.values(e.details)[0];
    return (Array.isArray(first) ? first[0] : String(first)) || "Periksa kembali isian proyek";
  }
  if (e.code === "ACCOUNT_PENDING_VERIFICATION") return "Akunmu belum terverifikasi";
  return e.message || "Gagal menyimpan proyek, coba lagi";
}

export const projectsApi = {
  /** → { ok, data: [{ id, name, slug }] } */
  async categories() {
    try {
      const res = await api.get("/categories");
      return { ok: true, data: res.data?.data || [] };
    } catch (err) {
      return { ok: false, error: { message: messageFrom(err) } };
    }
  },

  /** Buat + publikasikan proyek. → { ok, data: project } */
  async createAndPublish({ categoryId, title, description, budget, deadline }) {
    try {
      const created = await api.post("/projects", {
        category_id: categoryId,
        title,
        description,
        budget_min: Math.round(budget),
        budget_max: Math.round(budget),
        deadline,
      });
      const project = created.data?.data;
      await api.post(`/projects/${project.id}/publish`);
      return { ok: true, data: project };
    } catch (err) {
      return { ok: false, error: { message: messageFrom(err) } };
    }
  },
};
