---
inclusion: manual
---

# Prompt: Audit Kode vs Dokumen Desain

Saat prompt ini di-include, sebutkan modul yang mau diaudit di pesan chat, contoh: "audit modul contract & milestone". Kalau tidak disebutkan, audit semua modul yang sudah diimplementasikan sejauh ini (lihat `docs/backend-design/PROGRESS.md`).

Audit modul tersebut terhadap dokumen di `docs/backend-design/`. **Jangan mengubah kode**, hanya laporkan.

Periksa:
1. **State machine**: apakah semua transisi di `04-state-diagram.md` ada, dan tidak ada transisi di luar diagram?
2. **Aturan bisnis** di `README.md` bagian "Aturan Bisnis yang Sudah Dikunci": mana yang sudah ditegakkan di kode dan mana yang belum.
3. **Skema**: kesesuaian tabel/kolom/enum dengan `03-erd.md`.
4. **Keuangan** (jika relevan): uang dalam integer, jurnal ledger seimbang, row lock, idempotency webhook, rumus komisi sesuai `06-alur-keuangan-escrow.md`.
5. **Otorisasi**: role & kepemilikan resource sesuai `08-api-endpoints.md`.
6. **Test**: kasus penting yang belum dites.

Format laporan: tabel `Temuan | Lokasi file | Acuan dokumen | Tingkat (Kritis/Sedang/Rendah) | Saran perbaikan`, diurutkan dari yang paling kritis.

Setelah laporan: jika kamu bekerja secara otonom (lihat steering `backend-design`), langsung perbaiki temuan **Kritis** dan **Sedang**, lalu catat ringkasan perbaikan di `docs/backend-design/PROGRESS.md`.
