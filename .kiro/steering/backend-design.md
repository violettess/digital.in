---
inclusion: always
---

# Backend Platform UMKM × Mahasiswa

Proyek ini adalah backend untuk frontend React JS yang dibuat terpisah. Desain lengkap ada di `docs/backend-design/`, dan desain itu jadi acuan utama.

Aturan bisnis, aturan teknis, konvensi kode, dan batas keamanan mengikuti file instruksi berikut (dipakai bersama Copilot, jadi cukup dirawat di satu tempat):

#[[file:.github/copilot-instructions.md]]

Ringkasan aturan bisnis final dan nilai setting:

#[[file:docs/backend-design/README.md]]

## Cara kerja di Kiro
- Kerjakan per fase sesuai checklist di `docs/backend-design/PROGRESS.md`. Mulai dari fase pertama yang masih `[ ]`.
- Sebelum menulis kode untuk sebuah fase, baca dokumen desain yang relevan (ERD, state diagram, sequence diagram, keuangan, scheduler, endpoint).
- Kalau ada pilihan yang tidak dijawab dokumen dan pemilik proyek tidak menjawab, pakai rekomendasi dan catat di `docs/backend-design/DECISIONS.md`.
- Di akhir setiap fase: jalankan test, centang fase di `PROGRESS.md`, tulis laporan singkat, lalu commit.
- Bagian "Batas Keamanan" tetap berlaku: jangan push ke `main`, jangan force push, jangan commit `.env`, layanan eksternal pakai mock.
