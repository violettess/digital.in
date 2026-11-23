"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useRole } from "@/context/RoleContext";
import SettingsNav from "@/components/settings/SettingsNav";
<<<<<<< HEAD
import AccountPanel from "@/components/settings/AccountPanel";
=======
import ContactPanel from "@/components/settings/ContactPanel";
import UmkmInfoPanel from "@/components/settings/UmkmInfoPanel";
import TrustInfoPanel from "@/components/settings/TrustInfoPanel";
>>>>>>> 3d15cf437f7342a62ab35a2a9a5a2e615e4b4f99
import ProfilePreviewPanel from "@/components/settings/ProfilePreviewPanel";
import ProfileSettingsPanel from "@/components/settings/ProfileSettingsPanel";
import PaymentsPanel from "@/components/settings/PaymentsPanel";
import SecurityPanel from "@/components/settings/SecurityPanel";
import VerificationPanel from "@/components/settings/VerificationPanel";
import NotificationsPanel from "@/components/settings/NotificationsPanel";

<<<<<<< HEAD
// Semua panel membaca data asli (sesi + GET /me/profile); fitur tanpa endpoint tampil "Segera hadir".
const PANELS = {
  kontak: AccountPanel,
=======
const PANELS = {
  kontak: ContactPanel,
>>>>>>> 3d15cf437f7342a62ab35a2a9a5a2e615e4b4f99
  pembayaran: PaymentsPanel,
  profil: ProfilePreviewPanel,
  "pengaturan-profil": ProfileSettingsPanel,
  keamanan: SecurityPanel,
  verifikasi: VerificationPanel,
  notifikasi: NotificationsPanel,
};

<<<<<<< HEAD
=======
const INFO_PANELS = { umkm: UmkmInfoPanel, trust: TrustInfoPanel };

>>>>>>> 3d15cf437f7342a62ab35a2a9a5a2e615e4b4f99
// Pengaturan bergaya Upwork: nav kiri berkelompok (config.settingsNav, beda
// per role) + card per topik di kanan. Tab dibaca dari ?tab=; kalau tab nggak
// ada untuk role ini (mis. ?tab=pembayaran di Verify & Trust) jatuh ke
// "kontak". `basePath`/`title` opsional: Profil UMKM (/profile) memakai
// layout yang SAMA (sub-navigasi + konten) lewat <SettingsView basePath=
// "/profile" title="Profil" />, jadi sub-navigasi tidak pernah hilang.
export default function SettingsView({ basePath = "/settings", title = "Pengaturan" }) {
  return (
    <Suspense fallback={null}>
      <SettingsContent basePath={basePath} title={title} />
    </Suspense>
  );
}

function SettingsContent({ basePath, title }) {
<<<<<<< HEAD
  const { config } = useRole();
=======
  const { user, config } = useRole();
>>>>>>> 3d15cf437f7342a62ab35a2a9a5a2e615e4b4f99
  const router = useRouter();
  const searchParams = useSearchParams();
  const [toast, setToast] = useState(null);

  const validIds = config.settingsNav.flatMap((g) => g.items.map((i) => i.id));
  const requested = searchParams.get("tab");
  const tab = validIds.includes(requested) ? requested : "kontak";
<<<<<<< HEAD
  // Tab "kontak" (label "Info Saya" untuk UMKM & Verify & Trust) memakai AccountPanel untuk semua role.
  const Panel = PANELS[tab];
=======
  // Tab "kontak" jadi "Info Saya" khusus role untuk role yang punya
  // settings.infoPanel ("umkm" | "trust"); role lain tetap ContactPanel biasa.
  const Panel = tab === "kontak" && INFO_PANELS[config.settings.infoPanel] ? INFO_PANELS[config.settings.infoPanel] : PANELS[tab];
>>>>>>> 3d15cf437f7342a62ab35a2a9a5a2e615e4b4f99

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 2400);
  }

  return (
    <>
      <div className="settings-layout">
        <h1 className="t-h1 settings-title">{title}</h1>
        <SettingsNav
          groups={config.settingsNav}
          active={tab}
          onSelect={(id) => router.replace(`${basePath}?tab=${id}`, { scroll: false })}
        />
        <div key={tab} className="settings-panel">
<<<<<<< HEAD
          <Panel config={config} showToast={showToast} />
=======
          <Panel user={user} config={config} showToast={showToast} />
>>>>>>> 3d15cf437f7342a62ab35a2a9a5a2e615e4b4f99
        </div>
      </div>
      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
