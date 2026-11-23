"use client";

import { useState } from "react";
import SettingsCard from "./SettingsCard";
<<<<<<< HEAD
import { ComingSoon, LoadState } from "./ProfileForm";
import useMyProfile from "@/components/profile/useMyProfile";

// Tab "Pengaturan Profil". Ketersediaan mahasiswa tersimpan lewat PUT /me/profile
// (is_available); visibilitas & bahasa profil belum punya endpoint → "Segera hadir".
export default function ProfileSettingsPanel({ config, showToast }) {
  return (
    <>
      {config.key === "mahasiswa" && <AvailabilityCard showToast={showToast} />}
      <ComingSoon title="Visibilitas & Bahasa Profil">
        Pengaturan siapa yang bisa melihat profilmu dan bahasa profil belum tersedia.
      </ComingSoon>
    </>
  );
}

function AvailabilityCard({ showToast }) {
  const { loading, error, profile, reload, save } = useMyProfile();
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState(null);

  if (loading && !profile) return <LoadState loading />;
  if (!profile) return <LoadState error={error} onRetry={reload} />;

  async function toggle() {
    if (saving) return;
    setSaving(true);
    setFailure(null);
    const res = await save({ is_available: !profile.is_available });
    setSaving(false);
    if (res.ok) showToast(res.data.profile.is_available ? "Kamu ditandai tersedia untuk proyek baru." : "Kamu ditandai tidak menerima proyek baru.");
    else setFailure(res.error.message);
  }

  return (
    <SettingsCard title="Ketersediaan">
      <div className="row-between mt-12 gap-16">
        <div>
          <div className="settings-item-title">Tersedia untuk proyek baru</div>
          <div className="t-caption settings-item-sub">Saat dimatikan, UMKM tahu kamu sedang tidak menerima proyek baru.</div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={!!profile.is_available}
          aria-label="Tersedia untuk proyek baru"
          className={`toggle-switch ${profile.is_available ? "on" : ""}`}
          onClick={toggle}
          disabled={saving}
        >
          <span className="toggle-knob" />
        </button>
      </div>
      {failure && <p className="t-small mt-8" style={{ color: "var(--error)" }} role="alert">{failure}</p>}
=======

const VISIBILITY = [
  { id: "publik", label: "Publik", desc: "Profilmu bisa ditemukan di hasil pencarian dan dilihat siapa saja." },
  { id: "privat", label: "Privat", desc: "Cuma kamu dan pihak yang sedang bertransaksi denganmu yang bisa melihat profil." },
];

// Visibilitas profil (radio card, gaya .radio-card yang sudah ada di
// app/choose-type) + bahasa profil. Nggak ada di role Verify & Trust
// (profil internal nggak publik) — lihat config.settingsNav.
export default function ProfileSettingsPanel({ showToast }) {
  const [visibility, setVisibility] = useState("publik");
  const [language, setLanguage] = useState("id");

  return (
    <SettingsCard title="Pengaturan Profil">
      <div className="t-caption mt-12 mb-8">VISIBILITAS PROFIL</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {VISIBILITY.map((v) => (
          <label key={v.id} className={`radio-card ${visibility === v.id ? "selected" : ""}`}>
            <input
              type="radio" name="visibility" value={v.id} checked={visibility === v.id}
              onChange={() => { setVisibility(v.id); showToast("Perubahan disimpan."); }}
              style={{ marginTop: 3 }}
            />
            <div>
              <div className="settings-item-title">{v.label}</div>
              <div className="t-caption settings-item-sub">{v.desc}</div>
            </div>
          </label>
        ))}
      </div>

      <div className="field mt-16" style={{ marginBottom: 0 }}>
        <label>Bahasa Profil</label>
        <select className="input" value={language} onChange={(e) => { setLanguage(e.target.value); showToast("Perubahan disimpan."); }}>
          <option value="id">Bahasa Indonesia</option>
          <option value="en">English</option>
        </select>
      </div>
>>>>>>> 3d15cf437f7342a62ab35a2a9a5a2e615e4b4f99
    </SettingsCard>
  );
}
