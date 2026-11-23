"use client";

<<<<<<< HEAD
import Link from "next/link";
import SettingsCard from "./SettingsCard";
import { LoadState } from "./ProfileForm";
import useMyProfile from "@/components/profile/useMyProfile";
import { VERIFICATION_STATUS } from "@/lib/profile/api";

// Tab "Verifikasi Identitas". Mahasiswa: status asli dari /me/profile; pengajuan
// (email kampus / unggah KTM) di halaman /verify. UMKM & staf: belum perlu verifikasi.
export default function VerificationPanel({ config }) {
  if (config.key !== "mahasiswa") {
    return (
      <SettingsCard title="Verifikasi Identitas">
        <p className="t-small muted mt-8">
          {config.key === "umkm"
            ? "Akun UMKM tidak memerlukan verifikasi dokumen saat ini."
            : "Akun staf Verify & Trust tidak memerlukan verifikasi identitas."}
        </p>
      </SettingsCard>
    );
  }
  return <StudentVerification />;
}

function StudentVerification() {
  const { loading, error, profile, reload } = useMyProfile();
  if (loading && !profile) return <LoadState loading />;
  if (!profile) return <LoadState error={error} onRetry={reload} />;

  const s = VERIFICATION_STATUS[profile.verification_status] || { label: profile.verification_status, cls: "badge-neutral" };
  const text = {
    VERIFIED: profile.campus_email_verified_at ? "Status mahasiswamu terverifikasi lewat email kampus." : "Status mahasiswamu terverifikasi lewat KTM.",
    PENDING: profile.has_ktm
      ? "KTM-mu sedang ditinjau tim Verify & Trust, biasanya dalam 1×24 jam."
      : "Verifikasi lewat tautan di email kampus atau unggah KTM.",
    REJECTED: "Pengajuan verifikasimu ditolak. Lihat alasannya dan ajukan ulang di halaman Verifikasi.",
  }[profile.verification_status];

  return (
    <SettingsCard title="Verifikasi Mahasiswa">
      <div className="row-between mt-12 gap-16">
        <span className="t-small">Status</span>
        <span className={`badge ${s.cls}`}>{s.label}</span>
      </div>
      {text && <p className="t-small muted mt-8">{text}</p>}
      {profile.verification_status !== "VERIFIED" && (
        <Link href="/verify" className="btn btn-primary btn-sm mt-12">Buka halaman Verifikasi</Link>
=======
import { useState } from "react";
import SettingsCard from "./SettingsCard";
import Icon from "@/components/Icon";
import { PLATFORM_USERS } from "@/lib/users.mock";

const STATUS = {
  belum: { label: "Belum Diverifikasi", cls: "badge-neutral" },
  pending: { label: "Menunggu Tinjauan", cls: "badge-warning" },
  terverifikasi: { label: "Terverifikasi", cls: "badge-success" },
};

// User yang "sedang login" per role -> id di PLATFORM_USERS, supaya status di
// sini sama dengan yang dilihat Verify & Trust di /verifications. Akun
// internal (trust) selalu terverifikasi.
const PLATFORM_ID = { mahasiswa: "u-s1", umkm: "u-c3" };

export default function VerificationPanel({ config, showToast }) {
  const initial = PLATFORM_USERS.find((u) => u.id === PLATFORM_ID[config.key])?.verification || "terverifikasi";
  const [status, setStatus] = useState(initial);
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState({});
  const docs = config.settings.verificationDocs;
  const s = STATUS[status];
  const ready = docs.length > 0 && docs.every((d) => files[d]);

  function submit() {
    setStatus("pending");
    setOpen(false);
    showToast("Dokumen terkirim. Tim Verify & Trust akan meninjau dalam 1×24 jam.");
  }

  return (
    <SettingsCard title="Verifikasi Identitas">
      <div className="row gap-8 mt-12">
        <span className={`badge ${s.cls}`}>{s.label}</span>
      </div>

      {status === "belum" && !open && (
        <>
          <p className="t-small muted mt-12">Verifikasi membantu membangun kepercayaan dan membuka fitur penuh di Digital.in.</p>
          <button type="button" className="btn btn-primary btn-sm mt-12" onClick={() => setOpen(true)}>Verifikasi Identitas Anda</button>
        </>
      )}
      {status === "pending" && <p className="t-small muted mt-12">Dokumenmu sedang ditinjau. Biasanya selesai dalam 1×24 jam.</p>}
      {status === "terverifikasi" && <p className="t-small muted mt-12">Identitasmu sudah terverifikasi. Tidak ada tindakan yang diperlukan.</p>}

      {open && (
        <div className="mt-16">
          {docs.map((d) => (
            <div key={d} className="field">
              <label>Unggah {d}</label>
              <label className="card settings-upload" style={{ borderStyle: "dashed", padding: 24, textAlign: "center", cursor: "pointer", display: "block" }}>
                <Icon name="paperclip" />
                <div className="t-small mt-8">{files[d] ? files[d] : <>Seret file ke sini atau <span className="link-btn">pilih file</span></>}</div>
                <div className="t-caption mt-4">JPG, PNG, atau PDF — maks 5MB</div>
                <input
                  type="file" accept="image/*,.pdf" style={{ display: "none" }}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) setFiles((p) => ({ ...p, [d]: f.name })); }}
                />
              </label>
            </div>
          ))}
          <div className="row gap-8">
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setOpen(false)}>Batal</button>
            <button type="button" className="btn btn-primary btn-sm" disabled={!ready} onClick={submit}>Kirim untuk Verifikasi</button>
          </div>
        </div>
>>>>>>> 3d15cf437f7342a62ab35a2a9a5a2e615e4b4f99
      )}
    </SettingsCard>
  );
}
