---
description: "Langkah 2 - Implementasi satu fase/modul backend sesuai dokumen desain"
agent: agent
---

Implementasikan: **${input:fase:contoh Fase 1 - Auth + profil + verifikasi}**

Urutan fase ada di bagian "Urutan Implementasi yang Disarankan" pada [README](../../docs/backend-design/README.md). Kerjakan **hanya** fase ini.

## Langkah kerja

**Tahap A — Rencana (jangan menulis kode dulu)**
1. Baca dokumen desain yang relevan untuk fase ini:
   - [ERD](../../docs/backend-design/03-erd.md) → tabel & kolom
   - [State diagram](../../docs/backend-design/04-state-diagram.md) → status & transisi
   - [Sequence diagram](../../docs/backend-design/05-sequence-diagram.md) → urutan logic
   - [Use case](../../docs/backend-design/02-use-case.md) dan [API endpoints](../../docs/backend-design/08-api-endpoints.md) → endpoint & hak akses
   - [Keuangan](../../docs/backend-design/06-alur-keuangan-escrow.md) → jika menyentuh uang
   - [Scheduler](../../docs/backend-design/07-scheduler-dan-notifikasi.md) → jika ada job/notifikasi
2. Tampilkan rencana berisi:
   - Bagian dokumen yang dijadikan acuan.
   - Tabel/migration yang akan dibuat.
   - Endpoint yang akan dibuat beserta role yang boleh mengakses.
   - Transisi status dan aturan bisnis yang akan divalidasi.
   - Daftar test yang akan ditulis.
   - Hal yang ambigu atau tidak ada di dokumen.
3. **Tunggu persetujuan saya** sebelum lanjut ke Tahap B.

**Tahap B — Implementasi**
1. Buat migration sesuai ERD (nama tabel/kolom/enum persis sama).
2. Implementasi service, controller/route, validasi input, dan otorisasi.
3. Semua perubahan status lewat state machine terpusat.
4. Untuk operasi uang: transaksi DB + row lock + jurnal ledger seimbang + idempotency key.
5. Tulis test: jalur sukses, transisi tidak valid (409), pelanggaran aturan bisnis (422), akses role yang salah (403), dan race condition jika relevan.
6. Jalankan seluruh test dan perbaiki sampai lulus.

**Tahap C — Laporan**
- Ringkasan yang dikerjakan dan file yang berubah.
- Hasil test.
- Bagian desain dari fase ini yang belum diimplementasi, dan alasannya.
- Jika ada penyimpangan dari desain yang saya setujui, perbarui dokumen di `docs/backend-design/`.
