"use client";

import { useState } from "react";
import Sidebar from "@/components/dashboard/SideBar";
import RoleGuard from "./RoleGuard";
import { navFor } from "@/config/roles";
import { useRole } from "@/context/RoleContext";

// Shell tunggal buat semua role: sidebar (menu dari navFor(role), user dari
// context) + canvas konten, dibungkus RoleGuard supaya halaman yang nggak
// boleh diakses role aktif otomatis ketutup pesan "Tidak memiliki akses"
// tanpa tiap halaman ngecek sendiri-sendiri. State `sidebarOpen` sekarang
// hidup DI SINI — dulu diulang di tiap page.js.
//
// Drawer/toast milik satu halaman TETAP dirender di page.js masing-masing,
// sebagai sibling <AppShell> (sama seperti pola dash-shell lama), bukan
// lewat AppShell — soalnya isinya beda-beda tiap halaman dan posisinya fixed,
// jadi nggak perlu "masuk" ke dalam .dash-shell.
//
// `bare` — dipakai /messages: halaman itu sudah dari dulu TANPA padding 24
// di sekitar kontennya (chat-layout ngatur tinggi & isinya sendiri,
// termasuk scroll internal), jadi <main> di sini dibikin flex polos tanpa
// padding, bukan dipaksa ikut pola padded seperti halaman lain.
export default function AppShell({ children, aside, bare = false }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { role, user } = useRole();

  // Sekejap di render pertama sebelum RoleProvider sempat baca localStorage
  // (lihat context/RoleContext.js) — dibiarkan kosong daripada nge-crash
  // karena `user`/`navFor(null)` belum ada isinya.
  if (!role || !user) return null;

  return (
    <div className="dash-shell">
      <Sidebar
        open={sidebarOpen}
        onToggle={() => setSidebarOpen((v) => !v)}
        navItems={navFor(role)}
        user={user}
      />
      <div className="dash-canvas">
        <main style={bare ? { flex: 1, minWidth: 0, display: "flex" } : { flex: 1, padding: 24, minWidth: 0 }}>
          <RoleGuard>{children}</RoleGuard>
        </main>
        {aside && <div style={{ padding: 24 }}>{aside}</div>}
      </div>
    </div>
  );
}
