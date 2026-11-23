// Notifikasi pengguna (GET /notifications, POST /notifications/{id}/read).
import { api, parseApiError } from "@/lib/api";

async function call(fn) {
  try {
    const res = await fn();
    return { ok: true, data: res.data?.data, meta: res.data?.meta || {} };
  } catch (err) {
    const e = parseApiError(err);
    return { ok: false, error: { message: e.message || "Gagal memuat notifikasi", code: e.code } };
  }
}

export const notificationsApi = {
  list: (params) => call(() => api.get("/notifications", { params: { per_page: 20, ...params } }))
    .then((res) => (res.ok ? { ok: true, data: res.data || [], unreadCount: Number(res.meta?.unread_count ?? 0) } : res)),
  markRead: (id) => call(() => api.post(`/notifications/${id}/read`)),
};
