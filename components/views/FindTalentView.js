"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Icon from "@/components/Icon";
import ProjectsEmptyState from "@/components/projects/ProjectsEmptyState";
import TalentFilters from "@/components/talent/TalentFilters";
import TalentResultCard from "@/components/talent/TalentResultCard";
import TalentDetailPanel from "@/components/talent/TalentDetailPanel";
import InviteModal from "@/components/talent/InviteModal";
import { useRole } from "@/context/RoleContext";
import { useClientProjects } from "@/context/ProjectsContext";
import { USE_MOCK } from "@/lib/auth/api";
import { PROJECTS } from "@/lib/mock-data";
import { PLATFORM_USERS } from "@/lib/users.mock";
import { TALENTS, SIMULATE_NO_OPEN_PROJECTS } from "@/lib/talents.mock";
import { talentsApi, fromRecommendation } from "@/lib/talents/api";

const uniq = (arr) => [...new Set(arr.filter((x) => x && x !== "-"))].sort((a, b) => a.localeCompare(b, "id"));

function rateBounds(list) {
  const rates = list.map((t) => t.rate).filter((r) => r > 0);
  if (!rates.length) return [0, 0];
  return [Math.floor(Math.min(...rates) / 5000) * 5000, Math.ceil(Math.max(...rates) / 5000) * 5000];
}

function optionsFor(list) {
  return {
    rates: list.map((t) => t.rate).filter((r) => r > 0),
    skills: uniq(list.flatMap((t) => t.skills.map((s) => s.name))),
    cities: uniq(list.map((t) => t.city)),
    timezones: ["WIB", "WITA", "WIT"],
    categories: uniq(list.map((t) => t.category)),
    unis: uniq(list.map((t) => t.uni)),
    educations: uniq(list.map((t) => t.education)),
  };
}

const defaultFilters = (bounds) => ({
  badges: [], rate: bounds, skills: [], city: "", timezone: "",
  availability: "semua", category: "", success: 0, uni: "", education: "",
});

// Halaman "Cari Freelancer" (UMKM). Mode backend (USE_MOCK=false):
// - daftar talent dari GET /students (mahasiswa terverifikasi & tersedia)
// - "Rekomendasi untuk proyek" memanggil GET /projects/{id}/recommendations dan
//   mengurutkan hasil berdasarkan skor kecocokan
// - "Ajak ke Proyek" mengirim POST /projects/{id}/invitations (student_profile_id).
// Mode demo memakai data lib/talents.mock.js seperti sebelumnya.
// `?talent=<id>` langsung membuka panel detail talent itu.
export default function FindTalentView() {
  return (
    <Suspense fallback={null}>
      <FindTalentContent />
    </Suspense>
  );
}

function FindTalentContent() {
  const { user, authUser } = useRole();
  const searchParams = useSearchParams();
  const umkmName = authUser?.name || user?.name || "";

  const [talents, setTalents] = useState(USE_MOCK ? TALENTS : []);
  const [loading, setLoading] = useState(!USE_MOCK);
  const [loadError, setLoadError] = useState(null);
  const bounds = useMemo(() => rateBounds(talents), [talents]);
  const options = useMemo(() => optionsFor(talents), [talents]);

  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState(() => defaultFilters(rateBounds(USE_MOCK ? TALENTS : [])));
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(searchParams.get("talent") || null);
  const [inviteId, setInviteId] = useState(null);
  const [saved, setSaved] = useState(() => new Set());
  const [invited, setInvited] = useState(() => new Set());
  const [toast, setToast] = useState(null);

  // Rekomendasi per proyek (mode backend).
  const [recProjectId, setRecProjectId] = useState("");
  const [recs, setRecs] = useState(null); // null = tidak aktif
  const [recLoading, setRecLoading] = useState(false);

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  }, []);

  const loadTalents = useCallback(async () => {
    if (USE_MOCK) return;
    setLoading(true);
    setLoadError(null);
    const res = await talentsApi.list();
    setLoading(false);
    if (!res.ok) {
      setLoadError(res.error.message);
      return;
    }
    setTalents(res.data);
    setFilters(defaultFilters(rateBounds(res.data)));
  }, []);

  useEffect(() => { loadTalents(); }, [loadTalents]);

  // Banner pengingat cuma muncul kalau usaha ini belum terverifikasi.
  const umkmVerified = USE_MOCK
    ? PLATFORM_USERS.find((u) => u.name === user?.name)?.verification === "terverifikasi"
    : authUser?.status === "ACTIVE";
  const [noticeOpen, setNoticeOpen] = useState(!umkmVerified);
  useEffect(() => { setNoticeOpen(!umkmVerified); }, [umkmVerified]);

  // Proyek terbuka milik UMKM ini = target undangan & sumber rekomendasi.
  const myProjects = useClientProjects(umkmName);
  const openProjects = useMemo(() => {
    if (USE_MOCK) {
      return SIMULATE_NO_OPEN_PROJECTS
        ? []
        : [...myProjects.filter((p) => p.status === "terbuka"), ...PROJECTS.filter((p) => p.umkm === umkmName)];
    }
    return myProjects.filter((p) => p.fromApi && p.status === "terbuka" && !p.contractId);
  }, [umkmName, myProjects]);

  async function pickRecommendationProject(projectId) {
    setRecProjectId(projectId);
    if (!projectId) {
      setRecs(null);
      return;
    }
    setRecLoading(true);
    const res = await talentsApi.recommendations(projectId);
    setRecLoading(false);
    if (!res.ok) {
      setRecs(null);
      showToast(res.error.message);
      return;
    }
    const byId = new Map(talents.map((t) => [t.id, t]));
    setRecs((res.data || []).map((r) => fromRecommendation(r, byId.get(r.student_profile_id))));
  }

  const set = (patch) => setFilters((f) => ({ ...f, ...patch }));
  const resetAll = () => { setFilters(defaultFilters(bounds)); setQuery(""); };

  const source = recs || talents;
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const f = filters;
    const list = source.filter((t) => {
      if (q) {
        const hay = [t.name, t.title, t.major, t.uni, ...t.skills.map((s) => s.name)].join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (f.badges.length && !f.badges.includes(t.badge)) return false;
      // Tarif tidak tersedia di backend (rate 0) -> filter tarif diabaikan.
      if (t.rate > 0 && (t.rate < f.rate[0] || t.rate > f.rate[1])) return false;
      if (f.skills.length && !f.skills.every((s) => t.skills.some((x) => x.name === s))) return false;
      if (f.city && t.city !== f.city) return false;
      if (f.timezone && !t.fromApi && t.timezone !== f.timezone) return false;
      if (f.availability === "terbuka" && !t.available) return false;
      if (f.category && t.category !== f.category) return false;
      if (f.success && !t.fromApi && t.successRate < f.success) return false;
      if (f.uni && t.uni !== f.uni) return false;
      if (f.education && t.education !== f.education) return false;
      return true;
    });
    return recs
      ? list.sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0))
      : list.sort((a, b) => Number(b.boosted) - Number(a.boosted));
  }, [query, filters, source, recs]);

  function toggleSave(id) {
    setSaved((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function sendInvite(talent, project, message) {
    if (!project) return;
    if (!USE_MOCK) {
      const res = await talentsApi.invite({ projectId: project.id, studentProfileId: talent.id, message });
      if (!res.ok) {
        showToast(res.error.message);
        return;
      }
    }
    setInvited((prev) => new Set(prev).add(talent.id));
    setInviteId(null);
    showToast(`Undangan untuk "${project.title}" terkirim ke ${talent.name}.`);
  }

  const findTalent = (id) => source.find((t) => t.id === id) || talents.find((t) => t.id === id) || null;
  const selected = findTalent(selectedId);
  const inviteTarget = findTalent(inviteId);

  return (
    <>
      <h1 className="t-h1 ft-page-title">Cari Freelancer</h1>

      {noticeOpen && (
        <div className="ft-notice">
          <Icon name="info" />
          <span>Lengkapi <Link href="/settings?tab=verifikasi" className="link-btn">verifikasi usaha</Link> untuk membuka semua fitur pencarian freelancer.</span>
          <button type="button" className="icon-btn ft-notice-close" onClick={() => setNoticeOpen(false)} aria-label="Tutup pengingat">
            <Icon name="close" />
          </button>
        </div>
      )}

      <div className="ft-search-row">
        <div className="ft-search">
          <Icon name="search" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari berdasarkan nama, skill, atau kampus..."
            aria-label="Cari freelancer"
          />
          {query && (
            <button type="button" onClick={() => setQuery("")} aria-label="Hapus pencarian"><Icon name="xCircle" /></button>
          )}
        </div>
        <button type="button" className="link-btn" onClick={() => setFiltersOpen((v) => !v)} aria-expanded={filtersOpen}>
          Pencarian Lanjutan
        </button>
      </div>

      <div className="ft-layout">
        <div className={`ft-filters-wrap ${filtersOpen ? "open" : ""}`}>
          <TalentFilters filters={filters} set={set} options={options} rateBounds={bounds} onReset={resetAll} />
        </div>

        <div className="ft-results">
          <div className="ft-quick-filters">
            {!USE_MOCK && (
              <select
                className="input" aria-label="Rekomendasi untuk proyek"
                value={recProjectId} onChange={(e) => pickRecommendationProject(e.target.value)}
                disabled={!openProjects.length}
              >
                <option value="">{openProjects.length ? "Semua freelancer" : "Belum ada proyek terbuka"}</option>
                {openProjects.map((p) => <option key={p.id} value={p.id}>Rekomendasi: {p.title}</option>)}
              </select>
            )}
            <select className="input" value={filters.city} onChange={(e) => set({ city: e.target.value })} aria-label="Lokasi">
              <option value="">Lokasi</option>
              {options.cities.map((c) => <option key={c}>{c}</option>)}
            </select>
            <select
              className="input" aria-label="Skill"
              value={filters.skills.length === 1 ? filters.skills[0] : ""}
              onChange={(e) => set({ skills: e.target.value ? [e.target.value] : [] })}
            >
              <option value="">Skill</option>
              {options.skills.map((s) => <option key={s}>{s}</option>)}
            </select>
            {USE_MOCK && (
              <select className="input" value={filters.education} onChange={(e) => set({ education: e.target.value })} aria-label="Tingkat Pendidikan">
                <option value="">Tingkat Pendidikan</option>
                {options.educations.map((e) => <option key={e}>{e}</option>)}
              </select>
            )}
          </div>

          <div className="t-small muted">
            {loading || recLoading
              ? "Memuat freelancer..."
              : recs
                ? `${results.length} freelancer direkomendasikan, diurutkan dari skor kecocokan tertinggi`
                : `${results.length} freelancer ditemukan`}
          </div>

          {loadError ? (
            <ProjectsEmptyState
              variant="no-results"
              title="Gagal memuat freelancer"
              subtitle={loadError}
              actionLabel="Coba lagi"
              onAction={loadTalents}
            />
          ) : loading || recLoading ? null : results.length === 0 ? (
            <ProjectsEmptyState
              variant="no-results"
              title={recs ? "Belum ada freelancer yang cocok untuk proyek ini" : "Tidak ada freelancer yang cocok"}
              subtitle={recs ? "Rekomendasi memakai skill kategori proyek dan kapasitas kontrak mahasiswa." : "Coba ubah kata kunci atau longgarkan filter pencarianmu."}
              actionLabel="Reset pencarian"
              onAction={() => { resetAll(); pickRecommendationProject(""); }}
            />
          ) : (
            <div className="ft-list">
              {results.map((t) => (
                <TalentResultCard
                  key={t.id}
                  talent={t}
                  saved={saved.has(t.id)}
                  invited={invited.has(t.id)}
                  onToggleSave={toggleSave}
                  onInvite={setInviteId}
                  onOpen={setSelectedId}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <TalentDetailPanel
        talent={selected}
        query={query}
        saved={selected ? saved.has(selected.id) : false}
        invited={selected ? invited.has(selected.id) : false}
        onClose={() => setSelectedId(null)}
        onToggleSave={toggleSave}
        onInvite={setInviteId}
        showToast={showToast}
      />

      <InviteModal
        talent={inviteTarget}
        umkmName={umkmName}
        projects={openProjects}
        onClose={() => setInviteId(null)}
        onSend={sendInvite}
      />

      {toast && <div className="toast" style={{ zIndex: 400 }}>{toast}</div>}
    </>
  );
}
