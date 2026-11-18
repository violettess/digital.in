"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";
import OnboardingSteps from "@/components/dashboard/OnboardingSteps";
import UmkmProjectOverview from "@/components/dashboard/UmkmProjectOverview";
import RecommendedFreelancers from "@/components/dashboard/RecommendedFreelancers";
import HelpResources from "@/components/dashboard/HelpResources";
import ProjectDetailDrawer from "@/components/projects/ProjectDetailDrawer";
import { useRole } from "@/context/RoleContext";
import { useEscrow } from "@/context/EscrowContext";
import { useClientProjects } from "@/context/ProjectsContext";
import { dashboardData, recommendTalents } from "@/lib/umkm-dashboard";
import { UMKM_SCENARIO, SCENARIOS } from "@/lib/umkm-dashboard.mock";
import { USE_MOCK } from "@/lib/auth/api";
import { projectsApi } from "@/lib/projects/api";

function mapApiStudentToRec(s) {
  const uni = s.university?.name || s.university_name_custom || "Mahasiswa";
  const skills = Array.isArray(s.skills) ? s.skills.map((k) => ({ name: k.name, level: k.level })) : [];
  return {
    talent: {
      id: s.id,
      name: s.name || "Mahasiswa",
      avatarBg: "#DBEAFE",
      uni,
      city: s.city || "Indonesia",
      title: skills[0]?.name || "Freelancer Mahasiswa",
      rate: 50000,
      successRate: 100,
      rating: Number(s.rating_avg || 5.0),
      bio: `${s.completed_contracts_count || 0} proyek selesai di Digital.in`,
      skills,
    },
    score: Number(s.rating_avg || 5),
    reason: s.is_verified ? "Mahasiswa terverifikasi" : "Tersedia untuk proyek",
    worked: false,
  };
}

export default function UmkmDashboard() {
  const [scenarioKey, setScenarioKey] = useState(UMKM_SCENARIO);
  return <UmkmDashboardInner key={scenarioKey} scenarioKey={scenarioKey} onScenarioChange={setScenarioKey} />;
}

function UmkmDashboardInner({ scenarioKey, onScenarioChange }) {
  const { user, authUser } = useRole();
  const { actions } = useEscrow();
  const scenario = SCENARIOS[scenarioKey];

  const [view, setView] = useState("grid");
  const isVerifiedAccount = !USE_MOCK && authUser?.status === "ACTIVE";
  const [emailVerified, setEmailVerified] = useState(isVerifiedAccount || scenario.emailVerified);
  const [dismissed, setDismissed] = useState({});
  const [detailId, setDetailId] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [apiRecs, setApiRecs] = useState(null);

  useEffect(() => {
    if (USE_MOCK) return;
    projectsApi.students().then((res) => {
      if (res.ok && Array.isArray(res.data) && res.data.length > 0) {
        setApiRecs(res.data.slice(0, 8).map(mapApiStudentToRec));
      }
    });
  }, []);

  const displayName = authUser?.name || user.name;
  const projects = useClientProjects(displayName, { includeBase: USE_MOCK ? scenario.hasProjects : false });
  const data = useMemo(
    () => dashboardData(displayName, { projects, actions, hasProjects: USE_MOCK ? scenario.hasProjects : false }),
    [displayName, projects, actions, scenario.hasProjects]
  );
  const detailProject = projects.find((p) => p.id === detailId) || null;
  const recommendations = useMemo(
    () => (apiRecs && apiRecs.length > 0 ? apiRecs : recommendTalents(data.projects)),
    [apiRecs, data.projects]
  );

  const firstName = (authUser?.name || user.businessInfo?.owner || user.name).split(" ")[0];
  const stepsLeft = USE_MOCK ? (emailVerified ? 0 : 1) + (scenario.hasPaymentMethod ? 0 : 1) : 0;

  const subtitle = stepsLeft === 2
    ? "Dua langkah terakhir sebelum kamu bisa merekrut"
    : stepsLeft === 1
      ? "Tinggal satu langkah lagi sebelum kamu bisa merekrut"
      : `Ringkasan proyek dan aktivitas ${displayName} hari ini.`;

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 2400);
  }

  function verifyEmail() {
    setEmailVerified(true);
    showToast("Email terverifikasi. Terima kasih!");
  }

  function openProject(project) {
    setDetailId(project.id);
    setDrawerOpen(true);
  }

  const dismiss = (key) => setDismissed((d) => ({ ...d, [key]: true }));

  return (
    <div className="ud-page">
      {USE_MOCK && !emailVerified && !dismissed.email && (
        <div className="ud-notice warn">
          <Icon name="info" />
          <span>
            Verifikasi email kamu untuk membuka semua fitur.{" "}
            <button type="button" className="ud-notice-link" onClick={verifyEmail}>Verifikasi email</button>
          </span>
          <button type="button" className="ud-notice-close" onClick={() => dismiss("email")} aria-label="Tutup pengingat email"><Icon name="close" /></button>
        </div>
      )}

      {data.waitingApproval > 0 && !dismissed.approval && (
        <div className="ud-notice info">
          <Icon name="clock" />
          <span>
            {data.waitingApproval} milestone menunggu persetujuanmu.{" "}
            <Link href="/payments?tab=tertahan" className="ud-notice-link">Tinjau sekarang</Link>
          </span>
          <button type="button" className="ud-notice-close" onClick={() => dismiss("approval")} aria-label="Tutup pengingat milestone"><Icon name="close" /></button>
        </div>
      )}

      <div className="ud-greeting">
        <h1 className="ud-title">Selamat datang kembali, {firstName}</h1>
        <p className="ud-sub">{subtitle}</p>
      </div>

      {stepsLeft > 0 && (
        <OnboardingSteps emailVerified={emailVerified} hasPaymentMethod={scenario.hasPaymentMethod} onVerifyEmail={verifyEmail} />
      )}

      <UmkmProjectOverview data={data} view={view} onViewChange={setView} onOpenProject={openProject} />

      <RecommendedFreelancers items={recommendations} />

      <HelpResources />

      {USE_MOCK && (
        <div className="ud-test-toggle" role="group" aria-label="Mode uji skenario dashboard">
          <span>Mode uji:</span>
          {Object.entries(SCENARIOS).map(([key, s]) => (
            <button key={key} type="button" className={key === scenarioKey ? "active" : ""} onClick={() => onScenarioChange(key)}>
              {s.label}
            </button>
          ))}
        </div>
      )}

      <ProjectDetailDrawer project={detailProject} open={drawerOpen} onClose={() => setDrawerOpen(false)} perspective="client" />
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
