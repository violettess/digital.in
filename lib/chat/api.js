// Percakapan & pesan chat (UMKM <-> Mahasiswa) via backend Laravel.
import { api, parseApiError } from "@/lib/api";

function messageFrom(err) {
  const e = parseApiError(err);
  if (e.code === "NETWORK") return "Tidak dapat terhubung ke server, coba lagi";
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

export function toMessageItem(m, myUserId) {
  const isMe = m.sender_id === myUserId;
  return {
    id: m.id,
    from: isMe ? "me" : "them",
    text: m.body || "",
    at: m.created_at || new Date().toISOString(),
    status: m.read_at ? "dibaca" : "terkirim",
    read: !!m.read_at,
    attachment: m.attachment_url ? { name: m.attachment_url, url: m.attachment_url } : null,
  };
}

export function toConversationItem(c, myUserId, role) {
  const other = role === "umkm" ? c.student : c.umkm;
  const name = other?.name || (role === "umkm" ? "Mahasiswa" : "Klien UMKM");
  return {
    id: c.id,
    projectId: c.project_id || c.project?.id || "",
    projectTitle: c.project?.title || "",
    updatedAt: c.updated_at || c.created_at || "",
    unreadOverride: Number(c.unread_count || 0),
    contact: {
      name,
      avatarBg: role === "umkm" ? "#DBEAFE" : "#D1FAE5",
      online: true,
      lastSeen: c.updated_at || null,
    },
    messages: [],
    fromApi: true,
  };
}

export const chatApi = {
  conversations: (myUserId, role) => call(() => api.get("/conversations"))
    .then((res) => (res.ok ? { ok: true, data: (res.data || []).map((c) => toConversationItem(c, myUserId, role)) } : res)),
  messages: (conversationId, myUserId) => call(() => api.get(`/conversations/${conversationId}/messages`, { params: { per_page: 50 } }))
    .then((res) => (res.ok ? { ok: true, data: [...(res.data || [])].reverse().map((m) => toMessageItem(m, myUserId)) } : res)),
  send: (conversationId, body, myUserId) => call(() => api.post(`/conversations/${conversationId}/messages`, { body }))
    .then((res) => (res.ok ? { ok: true, data: toMessageItem(res.data, myUserId), warning: res.meta?.warning || null } : res)),
};
