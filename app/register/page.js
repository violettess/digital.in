"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Icon from "@/components/Icon";

// useSearchParams wajib dibungkus <Suspense> di App Router, kalau tidak
// `next build` gagal. Ini bukan gaya penulisan opsional — ini syarat Next.js.
export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterForm />
    </Suspense>
  );
}

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const type = searchParams.get("type") || "umkm";
  const isUmkm = type === "umkm";

  function handleSubmit(e) {
    e.preventDefault();
    router.push(`/verify?type=${type}`);
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card" style={{ maxWidth: 440 }}>
        <div className="auth-brand"><div className="mark">D</div><div className="name t-h3">Digital.in</div></div>
        <div className="progress-steps"><span className="done" /><span /><span /></div>
        <h2 className="t-h2">{isUmkm ? "Daftarkan usahamu" : "Buat profil mahasiswa"}</h2>
        <p className="t-small muted mt-8">
          {isUmkm ? "Cuma butuh beberapa menit — kamu bisa lengkapi detail lainnya nanti." : "Isi data dasar untuk mulai menjelajahi proyek."}
        </p>
        <form className="mt-20" onSubmit={handleSubmit}>
          <div className="field">
            <label>{isUmkm ? "Nama Usaha" : "Nama Lengkap"}</label>
            <input className="input" placeholder={isUmkm ? "contoh: Kopi Anteng" : "contoh: Nadia Putri"} />
          </div>
          {isUmkm ? (
            <div className="field">
              <label>Kategori Usaha</label>
              <select className="input">
                <option>Kuliner</option><option>Fashion</option><option>Kerajinan</option><option>Jasa</option><option>Lainnya</option>
              </select>
            </div>
          ) : (
            <div className="field"><label>Universitas</label><input className="input" placeholder="contoh: Universitas Indonesia" /></div>
          )}
          <div className="field"><label>Email</label><input className="input" type="email" placeholder={isUmkm ? "nama@usaha.com" : "nama@student.ac.id"} /></div>
          <div className="field"><label>Nomor WhatsApp</label><input className="input" placeholder="08xxxxxxxxxx" /></div>
          <div className="field"><label>Buat Kata Sandi</label><input className="input" type="password" placeholder="Minimal 8 karakter" /></div>
          <div className="checkbox-row mb-20">
            <input type="checkbox" defaultChecked style={{ marginTop: 3 }} />
            <span className="t-small muted">
              Saya setuju dengan <a className="link-btn" href="#">Syarat & Ketentuan</a> dan <a className="link-btn" href="#">Kebijakan Privasi</a> Kerjasama.
            </span>
          </div>
          <button type="submit" className="btn btn-primary btn-block btn-lg">Buat Akun</button>
          <button type="button" className="btn btn-secondary btn-block mt-12" onClick={() => router.push("/choose-type")}>
            <Icon name="chevLeft" /> Kembali
          </button>
        </form>
      </div>
    </div>
  );
}
