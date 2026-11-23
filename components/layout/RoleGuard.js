"use client";

<<<<<<< HEAD
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
=======
import { usePathname } from "next/navigation";
import ProjectsEmptyState from "@/components/projects/ProjectsEmptyState";
>>>>>>> 3d15cf437f7342a62ab35a2a9a5a2e615e4b4f99
import { canAccess } from "@/config/roles";
import { useRole } from "@/context/RoleContext";

// Ganjal konten halaman kalau role yang sedang login nggak boleh buka
// pathname ini (lihat ROUTE_PERMISSIONS di config/roles.js). Dipakai di
<<<<<<< HEAD
// dalam AppShell. Role yang tidak berhak diarahkan ke dashboard miliknya
// (ROLES[role].home); kontennya tidak dirender sama sekali.
export default function RoleGuard({ children }) {
  const { role, config } = useRole();
  const pathname = usePathname();
  const router = useRouter();
  const allowed = !role || canAccess(role, pathname);

  useEffect(() => {
    if (!allowed) router.replace(config?.home || "/dashboard");
  }, [allowed, config, router]);

  return allowed ? children : null;
=======
// dalam AppShell, jadi sidebar & popup profil tetap kelihatan normal —
// cuma area kontennya yang diganti pesan ini.
export default function RoleGuard({ children }) {
  const { role } = useRole();
  const pathname = usePathname();

  if (!role || canAccess(role, pathname)) return children;

  return (
    <ProjectsEmptyState
      variant="no-results"
      title="Tidak memiliki akses"
      subtitle="Akun kamu login sebagai role yang berbeda, jadi halaman ini tidak tersedia untuk kamu."
      actionLabel="Kembali ke Dashboard"
      actionHref="/dashboard"
    />
  );
>>>>>>> 3d15cf437f7342a62ab35a2a9a5a2e615e4b4f99
}
