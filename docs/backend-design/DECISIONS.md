# Keputusan Desain

## 2026-11-24 — Nominal minimum milestone

Atas persetujuan pemilik proyek, nominal setiap milestone tidak lagi memiliki batas minimum Rp150.000. Nominal harus berupa integer Rupiah positif (minimal Rp1), baik untuk saran milestone saat UMKM mem-post proyek maupun milestone yang diajukan mahasiswa.

Nilai `min_milestone_amount` dihapus dari `platform_settings`; migrasi menghapus nilai lama dari database produksi.
