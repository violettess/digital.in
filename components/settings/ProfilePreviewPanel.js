<<<<<<< HEAD
"use client";

import Link from "next/link";
import SettingsCard from "./SettingsCard";
import { InfoRow } from "./ProfileForm";
import { initials } from "@/lib/mock-data";
import { useRole } from "@/context/RoleContext";
import { ACCOUNT_STATUS, ROLE_LABEL, formatJoined } from "@/lib/profile/api";

// Ringkasan profil dari sesi asli (nama, peran, status, tanggal bergabung) + link ke
// halaman Profil (/profile) — bukan duplikat form edit.
export default function ProfilePreviewPanel() {
  const { authUser } = useRole();
  if (!authUser) return null;
  const status = ACCOUNT_STATUS[authUser.status] || { label: authUser.status, cls: "badge-neutral" };

  return (
    <SettingsCard title="Profil Saya">
      <div className="row gap-16 mt-12">
        <div className="avatar avatar-lg" style={{ background: "var(--primary-light)", width: 56, height: 56, fontSize: 18 }}>
          {initials(authUser.name || "?")}
        </div>
        <div style={{ minWidth: 0 }}>
          <div className="t-h3" style={{ fontSize: 16, overflowWrap: "anywhere" }}>{authUser.name}</div>
          <div className="t-small muted mt-4">{ROLE_LABEL[authUser.role] || authUser.role}</div>
=======
import Link from "next/link";
import SettingsCard from "./SettingsCard";
import { initials } from "@/lib/mock-data";

// Ringkasan profil + link ke halaman Profil sungguhan (/profile) — bukan
// duplikat form edit, sesuai plan ("preview ringkas ... link Edit di
// halaman Profil").
export default function ProfilePreviewPanel({ user, config }) {
  return (
    <SettingsCard title="Profil Saya">
      <div className="row gap-16 mt-12">
        <div className="avatar avatar-lg" style={{ background: user.avatarBg || "var(--primary-light)", width: 56, height: 56, fontSize: 18 }}>
          {initials(user.name)}
        </div>
        <div style={{ minWidth: 0 }}>
          <div className="t-h3" style={{ fontSize: 16 }}>{user.name}</div>
          <div className="t-small muted mt-4">{user.plan}</div>
>>>>>>> 3d15cf437f7342a62ab35a2a9a5a2e615e4b4f99
        </div>
      </div>

      <div className="divider" style={{ margin: "16px 0" }} />
<<<<<<< HEAD
      <InfoRow label="STATUS AKUN"><span className={`badge ${status.cls}`}>{status.label}</span></InfoRow>
      {authUser.joined_at && <InfoRow label="BERGABUNG">{formatJoined(authUser.joined_at)}</InfoRow>}

      <Link href="/profile" className="link-btn mt-16" style={{ display: "inline-block" }}>Buka halaman Profil</Link>
=======

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {config.profileFields.map((f) => (
          <div key={f.key} className="row-between">
            <span className="t-small muted">{f.label}</span>
            <span className="t-small" style={{ fontWeight: 700 }}>
              {f.key === "role" ? config.label : user[f.key] || "-"}
            </span>
          </div>
        ))}
      </div>

      <Link href="/profile" className="link-btn mt-16" style={{ display: "inline-block" }}>Edit di halaman Profil</Link>
>>>>>>> 3d15cf437f7342a62ab35a2a9a5a2e615e4b4f99
    </SettingsCard>
  );
}
