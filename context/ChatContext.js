"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { CONVERSATIONS } from "@/lib/messages.mock";
import { CURRENT_USERS } from "@/lib/users.mock";
import { MOCK_TODAY, getAllProjects } from "@/lib/projects.mock";
import { sortByLatest, unreadCount, buildUmkmConversations } from "@/lib/chat";
import { useRole } from "@/context/RoleContext";
import { useClientProjects } from "@/context/ProjectsContext";
import { USE_MOCK } from "@/lib/auth/api";
import { chatApi } from "@/lib/chat/api";

const ChatContext = createContext(null);

function cloneConversations() {
  return CONVERSATIONS.map((c) => ({ ...c, messages: c.messages.map((m) => ({ ...m })) }));
}

export function ChatProvider({ children }) {
  const { role, status, user, authUser } = useRole();
  const chatKey = role === "umkm" ? "umkm" : role === "mahasiswa" ? "mahasiswa" : null;

  const [store, setStore] = useState(() => ({
    mahasiswa: USE_MOCK ? cloneConversations() : [],
    umkm: USE_MOCK ? buildUmkmConversations(CURRENT_USERS.umkm.name) : [],
  }));
  const [activeByRole, setActiveByRole] = useState({});
  const [widgetOpen, setWidgetOpen] = useState(false);
  const [openIntent, setOpenIntent] = useState("list");
  const readTimers = useRef([]);
  const loadedMsgConvs = useRef(new Set());

  useEffect(() => () => readTimers.current.forEach(clearTimeout), []);

  const convs = chatKey ? store[chatKey] : [];
  const sorted = useMemo(() => sortByLatest(convs), [convs]);

  const activeId = (chatKey && activeByRole[chatKey]) || sorted[0]?.id || null;
  const activeIndex = sorted.findIndex((c) => c.id === activeId);

  function updateConvs(updater) {
    if (!chatKey) return;
    setStore((s) => ({ ...s, [chatKey]: updater(s[chatKey]) }));
  }

  // Muat daftar percakapan asli dari GET /conversations.
  const loadConversations = useCallback(async () => {
    if (USE_MOCK || status !== "authenticated" || !chatKey || !authUser?.id) return;
    const res = await chatApi.conversations(authUser.id, chatKey);
    if (!res.ok) return;
    setStore((s) => {
      const existingById = new Map((s[chatKey] || []).map((c) => [c.id, c]));
      const next = res.data.map((c) => {
        const prev = existingById.get(c.id);
        return prev?.messages?.length ? { ...c, messages: prev.messages } : c;
      });
      return { ...s, [chatKey]: next };
    });
  }, [status, chatKey, authUser?.id]);

  useEffect(() => {
    loadedMsgConvs.current.clear();
    loadConversations();
  }, [loadConversations]);

  // Muat pesan percakapan yang sedang aktif dari GET /conversations/{id}/messages.
  const loadMessages = useCallback(async (convId) => {
    if (USE_MOCK || !convId || !chatKey || !authUser?.id) return;
    const res = await chatApi.messages(convId, authUser.id);
    if (!res.ok) return;
    setStore((s) => ({
      ...s,
      [chatKey]: (s[chatKey] || []).map((c) => (
        c.id === convId ? { ...c, messages: res.data, unreadOverride: 0 } : c
      )),
    }));
  }, [chatKey, authUser?.id]);

  useEffect(() => {
    if (USE_MOCK || !activeId) return;
    if (!loadedMsgConvs.current.has(activeId)) {
      loadedMsgConvs.current.add(activeId);
      loadMessages(activeId);
    }
  }, [activeId, loadMessages]);

  function selectConversation(id) {
    if (!chatKey) return;
    setActiveByRole((a) => ({ ...a, [chatKey]: id }));
    if (!USE_MOCK) {
      loadMessages(id);
      return;
    }
    updateConvs((prev) => prev.map((c) => (
      c.id === id
        ? { ...c, messages: c.messages.map((m) => (m.from === "them" ? { ...m, read: true } : m)) }
        : c
    )));
  }

  function goRelative(delta) {
    if (sorted.length === 0) return;
    const idx = activeIndex < 0 ? 0 : activeIndex;
    const nextIdx = (idx + delta + sorted.length) % sorted.length;
    selectConversation(sorted[nextIdx].id);
  }

  async function sendMessage(text) {
    if (!activeId) return;
    const targetId = activeId;

    if (!USE_MOCK) {
      if (!authUser?.id) return;
      const res = await chatApi.send(targetId, text, authUser.id);
      if (!res.ok) return;
      updateConvs((prev) => prev.map((c) => (
        c.id === targetId
          ? { ...c, updatedAt: res.data.at, messages: [...c.messages, res.data] }
          : c
      )));
      return;
    }

    const now = new Date();
    const at = `${MOCK_TODAY}T${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const id = `${targetId}-new-${Date.now()}`;

    updateConvs((prev) => prev.map((c) => (
      c.id === targetId
        ? { ...c, messages: [...c.messages, { id, from: "me", text, at, status: "terkirim" }] }
        : c
    )));

    const t = setTimeout(() => {
      updateConvs((prev) => prev.map((c) => (
        c.id === targetId
          ? { ...c, messages: c.messages.map((m) => (m.id === id ? { ...m, status: "dibaca" } : m)) }
          : c
      )));
    }, 1500);
    readTimers.current.push(t);
  }

  function openWidget(projectId) {
    if (!USE_MOCK) loadConversations();
    if (projectId) {
      const match = convs.find((c) => c.projectId === projectId);
      if (match) selectConversation(match.id);
      setOpenIntent("chat");
    } else {
      setOpenIntent("list");
    }
    setWidgetOpen(true);
  }

  function closeWidget() {
    setWidgetOpen(false);
  }

  const unreadTotal = useMemo(() => convs.reduce((sum, c) => sum + unreadCount(c), 0), [convs]);

  const clientProjects = useClientProjects(user?.name ?? "");
  const projectById = useMemo(() => {
    const list = role === "umkm" ? clientProjects : (USE_MOCK ? getAllProjects() : []);
    const map = Object.fromEntries(list.map((p) => [p.id, p]));
    convs.forEach((c) => {
      if (c.projectId && !map[c.projectId]) {
        map[c.projectId] = { id: c.projectId, title: c.projectTitle || "Proyek", status: "berjalan", client: c.contact?.name || "" };
      }
    });
    return map;
  }, [role, clientProjects, convs]);
  const perspective = role === "umkm" ? "client" : "freelancer";

  const value = {
    convs, sorted, activeId, activeIndex,
    selectConversation, goRelative, sendMessage,
    unreadTotal, openWidget, closeWidget, widgetOpen, openIntent,
    projectById, perspective, reloadChat: loadConversations,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat harus dipakai di dalam <ChatProvider>");
  return ctx;
}
