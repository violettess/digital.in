"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import ProjectCardMaha from "./ProjectCardMaha";
import JobCardSkeleton from "./JobCardSkeleton";
import JobDetailDrawer from "./JobDetailDrawer";
import { PROJECTS } from "@/lib/mock-data";
import { USE_MOCK } from "@/lib/auth/api";
import { projectsApi } from "@/lib/projects/api";

const PAGE_SIZE = 3;

export default function JobFeed({ activeTab, query = "" }) {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [savedIds, setSavedIds] = useState(() => new Set());
  const [dismissedIds, setDismissedIds] = useState(() => new Set());
  const sentinelRef = useRef(null);
  const loadTimeoutRef = useRef(null);
  const loadingMoreRef = useRef(false);
  const pageRef = useRef(0);
  const generationRef = useRef(0);

  // Lowongan asli dari backend (GET /projects, status OPEN). Mode demo tetap memakai data contoh.
  const [source, setSource] = useState(USE_MOCK ? PROJECTS : null);
  const [loadError, setLoadError] = useState(null);
  useEffect(() => {
    if (USE_MOCK) return;
    projectsApi.open().then((res) => {
      if (res.ok) setSource(res.data); else { setLoadError(res.error.message); setSource([]); }
    });
  }, []);

  const hasData = activeTab === "best" && source !== null;

  // Hasil pencarian dari SearchPanel (lihat components/search/SearchPanel.js)
  // — difilter dulu di sini, baru dipaginasi, supaya "Semua rekomendasi
  // ditampilkan" tetap akurat terhadap jumlah yang benar-benar cocok.
  const pool = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = USE_MOCK ? PROJECTS : (source || []);
    if (!q) return base;
    return base.filter((p) => {
      const haystack = [p.title, p.umkm, p.category, ...(p.skills || [])].join(" ").toLowerCase();
      return haystack.includes(q);
    });
  }, [query, source]);

  const loadMore = useCallback((requestedPage = pageRef.current, generation = generationRef.current) => {
    if (!hasData || loadingMoreRef.current) return;
    const start = requestedPage * PAGE_SIZE;
    if (start >= pool.length) return;
    loadingMoreRef.current = true;
    setLoading(true);
    loadTimeoutRef.current = setTimeout(() => {
      if (generation !== generationRef.current) return;
      const nextItems = pool.slice(start, start + PAGE_SIZE);
      setItems((prev) => {
        const existingIds = new Set(prev.map((item) => item.id));
        const uniqueItems = nextItems.filter((item) => {
          if (existingIds.has(item.id)) return false;
          existingIds.add(item.id);
          return true;
        });
        return [...prev, ...uniqueItems];
      });
      pageRef.current = requestedPage + 1;
      setPage(pageRef.current);
      setLoading(false);
      setInitialLoadDone(true);
      loadingMoreRef.current = false;
      loadTimeoutRef.current = null;
    }, 600);
  }, [hasData, pool]);

  useEffect(() => {
    if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
    const generation = ++generationRef.current;
    loadingMoreRef.current = false;
    pageRef.current = 0;
    setItems([]);
    setPage(0);
    setInitialLoadDone(false);
    setLoading(true);

    if (hasData && pool.length > 0) {
      loadMore(0, generation);
    } else if (hasData) {
      setLoading(false);
      setInitialLoadDone(true);
    } else {
      loadTimeoutRef.current = setTimeout(() => {
        setLoading(false);
        setInitialLoadDone(true);
      }, 600);
    }
    return () => {
      if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
      if (generationRef.current === generation) generationRef.current += 1;
      loadingMoreRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, pool]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => entries[0].isIntersecting && loadMore(),
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore, page]);

  const hasMore = hasData && page * PAGE_SIZE < pool.length;

  function openDetail(project) {
    setSelectedProject(project);
    setDrawerOpen(true);
  }

  function toggleSave(id) {
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleDismiss(id) {
    setDismissedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  return (
    <div className="mt-20">
      <div className="job-feed-list">
        {items.map((p, i) => (
          <ProjectCardMaha
            key={`${p.id}-${i}`}
            project={p}
            onClick={openDetail}
            saved={savedIds.has(p.id)}
            onToggleSave={toggleSave}
            dismissed={dismissedIds.has(p.id)}
            onToggleDismiss={toggleDismiss}
          />
        ))}
        {loading && <><JobCardSkeleton /><JobCardSkeleton /></>}
      </div>

      {initialLoadDone && !hasData && (
        <div className="empty-state">
          Belum ada data untuk tab ini — nanti diisi begitu query per-tab ke Supabase sudah ada.
        </div>
      )}

      {initialLoadDone && hasData && pool.length === 0 && (
        <div className="empty-state">
          {loadError || (query ? <>Tidak ada proyek yang cocok dengan &ldquo;{query}&rdquo;.</> : "Belum ada proyek terbuka saat ini.")}
        </div>
      )}

      {hasMore && <div ref={sentinelRef} style={{ height: 1 }} />}
      {initialLoadDone && hasData && pool.length > 0 && !hasMore && (
        <p className="t-small muted mt-16" style={{ textAlign: "center" }}>Semua rekomendasi sudah ditampilkan.</p>
      )}

      <JobDetailDrawer
        project={selectedProject}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </div>
  );
}
