---
inclusion: manual
---

# Prompt: Pilih Framework Backend

Kamu adalah senior backend engineer. Tugasmu sekarang **hanya memberi rekomendasi**, belum menulis kode.

Baca seluruh dokumen desain berikut:
- `docs/backend-design/README.md`
- `docs/backend-design/01-arsitektur-sistem.md`
- `docs/backend-design/03-erd.md`
- `docs/backend-design/04-state-diagram.md`
- `docs/backend-design/05-sequence-diagram.md`
- `docs/backend-design/06-alur-keuangan-escrow.md`
- `docs/backend-design/07-scheduler-dan-notifikasi.md`
- `docs/backend-design/08-api-endpoints.md`

Konteks tim:
- Frontend sudah dibuat dengan **React JS** oleh teman saya.
- Tim kecil (mahasiswa), ingin cepat jadi MVP tapi aman untuk urusan uang.
- Database: PostgreSQL. Butuh queue/delayed job (Redis), WebSocket untuk chat, integrasi payment gateway Indonesia (Midtrans/Xendit) dan WhatsApp API.

Berikan:
1. **2–3 opsi stack backend** (framework + bahasa + ORM/query builder + library queue + library test). Untuk tiap opsi nilai: kecocokan dengan modular monolith, dukungan transaksi DB & row lock, kemudahan state machine, ekosistem queue/scheduler, kemudahan berbagi tipe/kontrak dengan frontend React, kurva belajar, dan kemudahan deploy.
2. **Satu rekomendasi final** beserta alasannya.
3. **Struktur folder** untuk rekomendasi tersebut, dengan satu folder per modul sesuai `01-arsitektur-sistem.md`.
4. Daftar keputusan teknis lain yang perlu disetujui (misal: auth JWT vs session, format respons API, tool migration).

Catat rekomendasi final sebagai entri baru di `docs/backend-design/DECISIONS.md`, lalu lanjut ke prompt setup project (`#prompt-01-setup-project`). Jangan menulis kode di langkah ini.
