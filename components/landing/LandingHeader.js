"use client";

import { useState } from "react";
import Link from "next/link";
import { LogoMark, Wordmark } from "@/components/brand/Logo";
import { IconMenu } from "./LandingIcons";

const LINKS = [
  { label: "Cara Kerja", href: "#cara-kerja" },
  { label: "Untuk UMKM", href: "#untuk-umkm" },
  { label: "Untuk Mahasiswa", href: "#untuk-mahasiswa" },
  { label: "Kategori", href: "#kategori" },
];

// Logo sama dengan Sidebar Dashboard (LogoMark + Wordmark). "Masuk" → /login
// (halaman login yang sudah ada), "Mulai gratis" → /choose-type.
export default function LandingHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="lp-header">
      <div className="lp-x lp-header-in">
        <Link href="/" className="lp-brand" aria-label="Digital.in">
          <LogoMark size={34} />
          <Wordmark />
        </Link>
        <nav className="lp-nav" aria-label="Navigasi utama">
          {LINKS.map((l) => <a key={l.href} href={l.href}>{l.label}</a>)}
        </nav>
        <div className="lp-actions">
          <Link href="/login" className="lp-login">Masuk</Link>
          <Link href="/choose-type" className="lp-btn lp-btn-md lp-btn-primary">Mulai gratis</Link>
        </div>
        <button type="button" className="lp-burger" onClick={() => setOpen((v) => !v)} aria-label="Buka menu" aria-expanded={open}>
          <IconMenu />
        </button>
      </div>
      <div className={`lp-mobile ${open ? "open" : ""}`}>
        <nav aria-label="Navigasi seluler">
          {LINKS.map((l) => <a key={l.href} href={l.href} onClick={() => setOpen(false)}>{l.label}</a>)}
          <Link href="/login" className="lp-btn lp-btn-md lp-btn-outline">Masuk</Link>
          <Link href="/choose-type" className="lp-btn lp-btn-md lp-btn-primary">Mulai gratis</Link>
        </nav>
      </div>
    </header>
  );
}
