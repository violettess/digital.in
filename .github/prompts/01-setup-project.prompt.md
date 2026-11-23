---
description: "Langkah 1 - Setup kerangka project backend dengan stack yang sudah disetujui"
agent: agent
---

Stack yang sudah disetujui: **${input:stack:contoh NestJS + Prisma + PostgreSQL + BullMQ + Jest}**

Acuan: [Arsitektur](../../docs/backend-design/01-arsitektur-sistem.md), [README](../../docs/backend-design/README.md), [ERD](../../docs/backend-design/03-erd.md).

Buat kerangka project backend:
1. Inisialisasi project dengan stack di atas, TypeScript/linting/formatting aktif.
2. Struktur **modular monolith**: satu folder per modul sesuai tabel "Tanggung Jawab Tiap Modul" di `01-arsitektur-sistem.md`. Untuk sekarang cukup folder + file kosong/placeholder.
3. `docker-compose.yml` untuk PostgreSQL dan Redis untuk development.
4. Konfigurasi environment variable + `.env.example` (DB, Redis, JWT secret, payment gateway, WhatsApp API, storage, CORS origin untuk frontend React).
5. Komponen bersama:
   - Format respons sukses & error standar (lihat `.github/copilot-instructions.md`).
   - Error handler global yang memetakan transisi status tidak valid → 409, pelanggaran aturan bisnis → 422.
   - Helper transaksi DB.
   - Middleware auth + guard role (UMKM, STUDENT, MENTOR, ADMIN).
6. Migration pertama: tabel `platform_settings` + seeder berisi **semua** nilai di bagian "Nilai di `platform_settings`" pada README. Buat service untuk membacanya (dengan cache).
7. Endpoint `GET /api/v1/health`.
8. Setup test runner + satu contoh test.
9. `README.md` di root berisi cara menjalankan project secara lokal.

Jangan mengimplementasi modul bisnis dulu. Di akhir, laporkan file yang dibuat dan perintah untuk menjalankan project & test.
