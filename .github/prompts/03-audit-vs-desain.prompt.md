---
description: "Audit kode backend terhadap dokumen desain, tanpa mengubah kode"
agent: agent
---

Audit implementasi modul **${input:modul:contoh contract & milestone}** terhadap dokumen di `docs/backend-design/`. **Jangan mengubah kode**, hanya laporkan.

Periksa:
1. **State machine**: apakah semua transisi di [State diagram](../../docs/backend-design/04-state-diagram.md) ada, dan tidak ada transisi di luar diagram?
2. **Aturan bisnis** di [README](../../docs/backend-design/README.md) bagian "Aturan Bisnis yang Sudah Dikunci": mana yang sudah ditegakkan di kode dan mana yang belum.
3. **Skema**: kesesuaian tabel/kolom/enum dengan [ERD](../../docs/backend-design/03-erd.md).
4. **Keuangan** (jika relevan): uang dalam integer, jurnal ledger seimbang, row lock, idempotency webhook, rumus komisi sesuai [Keuangan](../../docs/backend-design/06-alur-keuangan-escrow.md).
5. **Otorisasi**: role & kepemilikan resource sesuai [API endpoints](../../docs/backend-design/08-api-endpoints.md).
6. **Test**: kasus penting yang belum dites.

Format laporan: tabel `Temuan | Lokasi file | Acuan dokumen | Tingkat (Kritis/Sedang/Rendah) | Saran perbaikan`, diurutkan dari yang paling kritis.
