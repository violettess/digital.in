"use client";

<<<<<<< HEAD
import { useEffect, useMemo, useState } from "react";
=======
import { useMemo, useState } from "react";
>>>>>>> 3d15cf437f7342a62ab35a2a9a5a2e615e4b4f99
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
<<<<<<< HEAD
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
=======

// Dashboard UMKM bergaya Upwork: banner pengingat, sapaan + langkah awal,
// ringkasan proyek, rekomendasi freelancer, dan bantuan. Semua angka/daftar
// berasal dari data proyek & escrow yang sama dengan halaman Proyek dan
// Pembayaran (lib/umkm-dashboard.js). Skenario "UMKM baru" vs "UMKM aktif"
// bisa dipindah lewat tombol Mode uji di bawah (lib/umkm-dashboard.mock.js).
export default function UmkmDashboard() {
  const [scenarioKey, setScenarioKey] = useState(UMKM_SCENARIO);

  // key = skenario -> state lokal (banner ditutup, email diverifikasi)
  // ikut di-reset tiap skenario berganti.
>>>>>>> 3d15cf437f7342a62ab35a2a9a5a2e615e4b4f99
  return <UmkmDashboardInner key={scenarioKey} scenarioKey={scenarioKey} onScenarioChange={setScenarioKey} />;
}

function UmkmDashboardInner({ scenarioKey, onScenarioChange }) {
<<<<<<< HEAD
  const { user, authUser } = useRole();
=======
  const { user } = useRole();
>>>>>>> 3d15cf437f7342a62ab35a2a9a5a2e615e4b4f99
  const { actions } = useEscrow();
  const scenario = SCENARIOS[scenarioKey];

  const [view, setView] = useState("grid");
<<<<<<< HEAD
  const isVerifiedAccount = !USE_MOCK && authUser?.status === "ACTIVE";
  const [emailVerified, setEmailVerified] = useState(isVerifiedAccount || scenario.emailVerified);
=======
  const [emailVerified, setEmailVerified] = useState(scenario.emailVerified);
>>>>>>> 3d15cf437f7342a62ab35a2a9a5a2e615e4b4f99
  const [dismissed, setDismissed] = useState({});
  const [detailId, setDetailId] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [toast, setToast] = useState(null);
<<<<<<< HEAD
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
=======

  // Proyek diturunkan dari ProjectsContext (sama dengan halaman Proyek):
  // proyek yang baru diposting dan hasil edit milestone langsung ikut
  // terhitung di ringkasan.
  const projects = useClientProjects(user.name, { includeBase: scenario.hasProjects });
  const data = useMemo(
    () => dashboardData(user.name, { projects, actions, hasProjects: scenario.hasProjects }),
    [user.name, projects, actions, scenario.hasProjects]
  );
  const detailProject = projects.find((p) => p.id === detailId) || null;
  const recommendations = useMemo(() => recommendTalents(data.projects), [data.projects]);

  const firstName = (user.businessInfo?.owner || user.name).split(" ")[0];
  const stepsLeft = (emailVerified ? 0 : 1) + (scenario.hasPaymentMethod ? 0 : 1);
>>>>>>> 3d15cf437f7342a62ab35a2a9a5a2e615e4b4f99

  const subtitle = stepsLeft === 2
    ? "Dua langkah terakhir sebelum kamu bisa merekrut"
    : stepsLeft === 1
      ? "Tinggal satu langkah lagi sebelum kamu bisa merekrut"
<<<<<<< HEAD
      : `Ringkasan proyek dan aktivitas ${displayName} hari ini.`;
=======
      : `Ringkasan proyek dan pembayaran ${user.name} hari ini.`;
>>>>>>> 3d15cf437f7342a62ab35a2a9a5a2e615e4b4f99

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
<<<<<<< HEAD
      {USE_MOCK && !emailVerified && !dismissed.email && (
=======
      {!emailVerified && !dismissed.email && (
>>>>>>> 3d15cf437f7342a62ab35a2a9a5a2e615e4b4f99
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

<<<<<<< HEAD
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
=======
      <div className="ud-test-toggle" role="group" aria-label="Mode uji skenario dashboard">
        <span>Mode uji:</span>
        {Object.entries(SCENARIOS).map(([key, s]) => (
          <button key={key} type="button" className={key === scenarioKey ? "active" : ""} onClick={() => onScenarioChange(key)}>
            {s.label}
          </button>
        ))}
      </div>
>>>>>>> 3d15cf437f7342a62ab35a2a9a5a2e615e4b4f99

      <ProjectDetailDrawer project={detailProject} open={drawerOpen} onClose={() => setDrawerOpen(false)} perspective="client" />
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
