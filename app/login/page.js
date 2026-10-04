"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRole } from "@/context/RoleContext";
import { ROLES } from "@/config/roles";
import { CURRENT_USERS } from "@/lib/users.mock";

// Sandi dummy yang sama untuk ketiga akun contoh (login belum divalidasi —
// prototipe; field boleh diisi apa saja).
const DEMO_PASSWORD = "digitalin123";
const ROLE_OPTIONS = ["umkm", "mahasiswa", "trust"];

export default function LoginPage() {
  const router = useRouter();
  const { setRole } = useRole();
  // Default UMKM = perilaku login sebelumnya.
  const [selected, setSelected] = useState("umkm");
  const [email, setEmail] = useState(CURRENT_USERS.umkm.contact.email);
  const [password, setPassword] = useState(DEMO_PASSWORD);

  // Pilih role → isi akun dummy role itu, supaya bisa langsung masuk.
  function pickRole(key) {
    setSelected(key);
    setEmail(CURRENT_USERS[key].contact.email);
    setPassword(DEMO_PASSWORD);
  }

  // Nanti kalau backend-nya sudah beneran, role ini diganti hasil login/session
  // asli. Tujuan setelah login (ROLES[role].home) dibaca dari config/roles.js.
  function handleLogin(e) {
    e.preventDefault();
    setRole(selected);
    router.push(ROLES[selected].home);
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card card card-pad" style={{ padding: 32 }}>
        <div className="auth-brand"><div className="mark">D</div><div className="name t-h3">Digital.in</div></div>
        <h2 className="t-h2" style={{ textAlign: "center" }}>Masuk ke akunmu</h2>
        <p className="t-small muted mt-8" style={{ textAlign: "center" }}>
          Belum punya akun? <Link className="link-btn" href="/choose-type">Daftar di sini</Link>
        </p>
        <form className="mt-24" onSubmit={handleLogin}>
          <div className="field">
            <label>Masuk sebagai</label>
            <div role="radiogroup" aria-label="Masuk sebagai" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
              {ROLE_OPTIONS.map((key) => (
                <button
                  key={key} type="button" role="radio" aria-checked={selected === key}
                  className={`radio-card ${selected === key ? "selected" : ""}`}
                  style={{ justifyContent: "center", textAlign: "center", padding: "10px 6px", fontSize: 13, fontWeight: 600, background: selected === key ? undefined : "transparent", color: "inherit", fontFamily: "inherit" }}
                  onClick={() => pickRole(key)}
                >
                  {key === "mahasiswa" ? "Mahasiswa" : ROLES[key].label}
                </button>
              ))}
            </div>
          </div>
          <div className="field"><label htmlFor="login-email">Email</label><input id="login-email" className="input" type="email" placeholder="nama@email.com" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div className="field"><label htmlFor="login-pass">Kata sandi</label><input id="login-pass" className="input" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
          <div className="row-between mb-16">
            <label className="t-small row gap-6"><input type="checkbox" /> Ingat saya</label>
            <Link className="link-btn" href="/forgot-password">Lupa kata sandi?</Link>
          </div>
          <button type="submit" className="btn btn-primary btn-block btn-lg">Masuk</button>
        </form>
      </div>
    </div>
  );
}
