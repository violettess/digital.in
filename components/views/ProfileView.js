"use client";

<<<<<<< HEAD
import StudentProfile from "@/components/profile/StudentProfile";
import SettingsView from "@/components/views/SettingsView";
import { useRole } from "@/context/RoleContext";

// Role dengan `profileLayout: "freelancer"` (mahasiswa) mendapat profil mahasiswa
// dari data asli (StudentProfile); role lain (UMKM, Verify & Trust) memakai layout
// Pengaturan (sub-navigasi + Info Saya) di URL /profile, dengan isi panel sesuai role.
export default function ProfileView() {
  const { config } = useRole();

  if (config?.profileLayout === "freelancer") return <StudentProfile />;
=======
import { Suspense } from "react";
import FreelancerProfile from "@/components/profile/FreelancerProfile";
import SettingsView from "@/components/views/SettingsView";
import { useRole } from "@/context/RoleContext";

// Role dengan `profileLayout: "freelancer"` (config/roles.js) dapat profil
// lengkap bergaya Upwork; role dengan `settings.infoPanel` (UMKM, Verify &
// Trust) dapat layout Pengaturan lengkap (sub-navigasi + Info Saya) di URL
// /profile, dengan isi panel sesuai role.
export default function ProfileView() {
  const { config } = useRole();

  if (config?.profileLayout === "freelancer") {
    return (
      <Suspense fallback={null}>
        <FreelancerProfile />
      </Suspense>
    );
  }
>>>>>>> 3d15cf437f7342a62ab35a2a9a5a2e615e4b4f99
  return <SettingsView basePath="/profile" title="Profil" />;
}
