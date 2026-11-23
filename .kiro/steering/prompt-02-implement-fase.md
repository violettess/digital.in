---
inclusion: manual
---

# Prompt: Implementasi Satu Fase Backend

Saat prompt ini di-include, sebutkan di pesan chat kamu fase mana yang dikerjakan, contoh: "kerjakan Fase 1 - Auth + profil + verifikasi". Kalau tidak disebutkan, ambil fase pertama yang masih `[ ]` di `docs/backend-design/PROGRESS.md`.

Urutan fase ada di bagian "Urutan Implementasi yang Disarankan" pada `docs/backend-design/README.md`. Kerjakan **hanya satu fase** itu.

## Langkah kerja

**Tahap A — Rencana**
1. Baca dokumen desain yang relevan untuk fase ini:
   - `docs/backend-design/03-erd.md` → tabel & kolom
   - `docs/backend-design/04-state-diagram.md` → status & transisi
   - `docs/backend-design/05-sequence-diagram.md` → urutan logic
   - `docs/backend-design/02-use-case.md` dan `docs/backend-design/08-api-endpoints.md` → endpoint & hak akses
   - `docs/backend-design/06-alur-keuangan-escrow.md` → jika menyentuh uang
   - `docs/backend-design/07-scheduler-dan-notifikasi.md` → jika ada job/notifikasi
2. Tampilkan rencana berisi: bagian dokumen acuan, tabel/migration yang akan dibuat, endpoint + role yang boleh mengakses, transisi status & aturan bisnis yang divalidasi, daftar test, dan hal yang ambigu.
3. Untuk setiap hal yang ambigu: pakai rekomendasimu (ikuti steering `backend-design` bagian "Mode Kerja Otonom"), catat di `docs/backend-design/DECISIONS.md`, lalu **langsung lanjut** ke Tahap B tanpa menunggu persetujuan.

**Tahap B — Implementasi**
1. Buat migration sesuai ERD (nama tabel/kolom/enum persis sama).
2. Implementasi service, controller/route, validasi input, dan otorisasi.
3. Semua perubahan status lewat state machine terpusat.
4. Untuk operasi uang: transaksi DB + row lock + jurnal ledger seimbang + idempotency key.
5. Tulis test: jalur sukses, transisi tidak valid (409), pelanggaran aturan bisnis (422), akses role yang salah (403), dan race condition jika relevan.
6. Jalankan seluruh test dan perbaiki sampai lulus.

**Tahap C — Laporan & Tutup Fase**
1. Ringkasan yang dikerjakan, file yang berubah, hasil test.
2. Bagian desain dari fase ini yang belum diimplementasi, dan alasannya (catat sebagai Blocker di `PROGRESS.md` jika memang butuh bantuan manusia).
3. Jika ada penyimpangan dari desain, perbarui dokumen di `docs/backend-design/` di langkah yang sama.
4. Tandai `- [x]` untuk fase ini di `docs/backend-design/PROGRESS.md` dan tambahkan laporan singkatnya di bagian "Laporan per Fase".
