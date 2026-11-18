"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRole } from "@/context/RoleContext";
import { projectsApi } from "@/lib/projects/api";
import { USE_MOCK } from "@/lib/auth/api";
import { enrichProject } from "@/lib/progress";
import { MOCK_TODAY } from "@/lib/projects.mock";
import { umkmProjects } from "@/lib/payments";
import { applyPostedMilestones } from "@/lib/projects-posting";

const ProjectsContext = createContext(null);

export function ProjectsProvider({ children }) {
  const { role, status, authUser } = useRole();
  const [posted, setPosted] = useState([]);
  const [overrides, setOverrides] = useState({});
  const [loading, setLoading] = useState(false);

  // UMKM yang login: proyek diambil dari backend (GET /projects?mine=1) +
  // kontrak (GET /contracts) supaya info freelancer & status kontrak ikut masuk.
  const loadMine = useCallback(async () => {
    if (status !== "authenticated" || role !== "umkm" || !authUser?.name) return;
    setLoading(true);
    const [projRes, contractRes] = await Promise.all([
      projectsApi.mine(authUser.name),
      projectsApi.contracts(),
    ]);
    setLoading(false);
    if (projRes.ok) {
      const byProjectId = new Map();
      if (contractRes.ok) {
        (contractRes.data || []).forEach((cp) => byProjectId.set(cp.id, cp));
      }
      const merged = projRes.data.map((p) => {
        const c = byProjectId.get(p.id);
        if (!c) return p;
        return {
          ...p,
          contractId: c.contractId,
          contractNo: c.contractNo,
          contractStatus: c.contractStatus,
          freelancerId: c.freelancerId,
          freelancerName: c.freelancerName,
          status: c.status,
          budget: c.budget || p.budget,
        };
      });
      setPosted(merged);
    }
  }, [status, role, authUser?.name]);

  useEffect(() => { loadMine(); }, [loadMine]);

  function addProject(raw) {
    setPosted((list) => [raw, ...list.filter((p) => p.id !== raw.id)]);
  }

  function saveMilestones(projectId, milestones) {
    if (posted.some((p) => p.id === projectId)) {
      setPosted((list) => list.map((p) => (p.id === projectId ? applyPostedMilestones(p, milestones) : p)));
    } else {
      setOverrides((o) => ({ ...o, [projectId]: milestones }));
    }
  }

  const value = useMemo(() => ({ posted, overrides, loading, reload: loadMine, addProject, saveMilestones }), [posted, overrides, loading, loadMine]);
  return <ProjectsContext.Provider value={value}>{children}</ProjectsContext.Provider>;
}

export function useProjects() {
  const ctx = useContext(ProjectsContext);
  if (!ctx) throw new Error("useProjects harus dipakai di dalam <ProjectsProvider>");
  return ctx;
}

export function useClientProjects(umkmName, { includeBase = true } = {}) {
  const { posted, overrides } = useProjects();
  return useMemo(() => {
    const base = includeBase && USE_MOCK
      ? umkmProjects(umkmName).map((p) => (overrides[p.id] ? enrichProject({ ...p, milestones: overrides[p.id] }, MOCK_TODAY) : p))
      : [];
    const mine = posted.filter((p) => p.fromApi || p.client === umkmName).map((p) => enrichProject(p, MOCK_TODAY));
    return [...mine, ...base];
  }, [umkmName, includeBase, posted, overrides]);
}
