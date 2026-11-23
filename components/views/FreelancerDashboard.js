"use client";

<<<<<<< HEAD
import { Suspense, useEffect, useState } from "react";
=======
import { Suspense, useState } from "react";
>>>>>>> 3d15cf437f7342a62ab35a2a9a5a2e615e4b4f99
import { useRouter, useSearchParams } from "next/navigation";
import JobTabs from "@/components/dashboard/JobTabs";
import JobFeed from "@/components/dashboard/JobFeed";
import ProfileSidePanel from "@/components/dashboard/ProfileSidePanel";
import Icon from "@/components/Icon";
import { useSearchPanel } from "@/context/SearchPanelContext";
<<<<<<< HEAD
import { projectsApi } from "@/lib/projects/api";
import { USE_MOCK } from "@/lib/auth/api";
import { formatRupiah, formatTanggal } from "@/lib/format";
=======
>>>>>>> 3d15cf437f7342a62ab35a2a9a5a2e615e4b4f99

// Isi persis "Cari Proyek" yang sebelumnya ada di app/mahasiswa/dashboard —
// cuma dipindah dari page.js ke sini (dipanggil lewat app/dashboard/page.js)
// supaya URL-nya bisa dipakai bareng role lain. Panel kanan (aside) tetap
// ditaruh AppShell, bukan di sini, biar sama caranya dengan role lain.
export default function FreelancerDashboard() {
  return (
    <Suspense fallback={null}>
      <FreelancerDashboardView />
    </Suspense>
  );
}

function FreelancerDashboardView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";
  const [activeTab, setActiveTab] = useState("best");
  const { openSearch } = useSearchPanel();
<<<<<<< HEAD
  const [invitations, setInvitations] = useState([]);
  const [invitationBusy, setInvitationBusy] = useState(null);
  const [invitationError, setInvitationError] = useState(null);

  useEffect(() => {
    if (USE_MOCK) return;
    projectsApi.invitations().then((res) => {
      if (res.ok) setInvitations(res.data || []);
      else setInvitationError(res.error.message);
    });
  }, []);

  async function respondInvitation(invitationId, accept) {
    setInvitationBusy(invitationId);
    setInvitationError(null);
    const res = accept
      ? await projectsApi.acceptInvitation(invitationId)
      : await projectsApi.declineInvitation(invitationId);
    setInvitationBusy(null);
    if (!res.ok) return setInvitationError(res.error.message);
    setInvitations((list) => list.filter((item) => item.id !== invitationId));
  }
=======
>>>>>>> 3d15cf437f7342a62ab35a2a9a5a2e615e4b4f99

  return (
    <>
      <h1 className="t-h1 mb-16">Cari Proyek</h1>

<<<<<<< HEAD
      {!USE_MOCK && invitations.length > 0 && (
        <div className="card card-pad mb-16">
          <div className="t-caption mb-8">UNDANGAN PROYEK</div>
          {invitationError && <div className="pp-error mb-8" role="alert">{invitationError}</div>}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {invitations.map((invitation) => {
              const project = invitation.project;
              return (
                <div key={invitation.id} className="row-between" style={{ gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <div className="t-small" style={{ fontWeight: 700 }}>{project?.title || "Undangan proyek"}</div>
                    <div className="t-caption muted mt-4">
                      {project?.umkm?.name || "UMKM"}
                      {project?.budget_max ? ` · ${formatRupiah(project.budget_max)}` : ""}
                      {project?.deadline ? ` · Tenggat ${formatTanggal(project.deadline)}` : ""}
                    </div>
                    {invitation.message && <p className="t-small mt-6">{invitation.message}</p>}
                  </div>
                  <div className="row gap-8">
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      disabled={invitationBusy === invitation.id}
                      onClick={() => respondInvitation(invitation.id, false)}
                    >
                      Tolak
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      disabled={invitationBusy === invitation.id}
                      onClick={() => respondInvitation(invitation.id, true)}
                    >
                      {invitationBusy === invitation.id ? "Memproses..." : "Terima"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

=======
>>>>>>> 3d15cf437f7342a62ab35a2a9a5a2e615e4b4f99
      <button
        type="button"
        className="search-trigger-input mb-16"
        onClick={() => openSearch(query)}
      >
        <Icon name="search" />
        <span>{query ? query : "Cari proyek..."}</span>
      </button>

      {query && (
        <div className="search-active-chip mb-16">
          Hasil untuk &ldquo;{query}&rdquo;
          <button type="button" onClick={() => router.push("/dashboard")} aria-label="Hapus pencarian">
            <Icon name="close" />
          </button>
        </div>
      )}

      <JobTabs active={activeTab} onChange={setActiveTab} />
      <JobFeed activeTab={activeTab} query={query} />
    </>
  );
}

// Dipakai app/dashboard/page.js lewat prop `aside` AppShell. ProfileSidePanel
// membaca data profil sendiri lewat useRole()/FREELANCER_PROFILE, bukan
// props — lihat components/dashboard/ProfileSidePanel.js.
export function FreelancerDashboardAside() {
  return <ProfileSidePanel />;
}
