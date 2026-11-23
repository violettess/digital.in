# Keputusan Desain

## 2026-11-24 — Nominal minimum milestone

Atas persetujuan pemilik proyek, nominal setiap milestone tidak lagi memiliki batas minimum Rp150.000. Nominal harus berupa integer Rupiah positif (minimal Rp1), baik untuk saran milestone saat UMKM mem-post proyek maupun milestone yang diajukan mahasiswa.

Nilai `min_milestone_amount` dihapus dari `platform_settings`; migrasi menghapus nilai lama dari database produksi.

## 2026-11-24 — Edit dan hapus proyek UMKM

UMKM dapat mengedit proyek berstatus `DRAFT` atau `OPEN` melalui `PUT /projects/{id}`. Aksi "Hapus" di UI berarti membatalkan proyek melalui `POST /projects/{id}/cancel`, bukan menghapus permanen. Pembatalan hanya berlaku untuk proyek `DRAFT` atau `OPEN`, mempertahankan riwayat dengan status `CANCELLED`, dan menutup lamaran terbuka serta undangan pending terkait.
