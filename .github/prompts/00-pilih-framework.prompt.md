---
description: "Langkah 0 - Minta rekomendasi framework backend berdasarkan dokumen desain"
agent: agent
---

Kamu adalah senior backend engineer. Tugasmu sekarang **hanya memberi rekomendasi**, belum menulis kode.

Baca seluruh dokumen desain berikut:
- [README](../../docs/backend-design/README.md)
- [Arsitektur](../../docs/backend-design/01-arsitektur-sistem.md)
- [ERD](../../docs/backend-design/03-erd.md)
- [State diagram](../../docs/backend-design/04-state-diagram.md)
- [Sequence diagram](../../docs/backend-design/05-sequence-diagram.md)
- [Keuangan & escrow](../../docs/backend-design/06-alur-keuangan-escrow.md)
- [Scheduler](../../docs/backend-design/07-scheduler-dan-notifikasi.md)
- [API endpoints](../../docs/backend-design/08-api-endpoints.md)

Konteks tim:
- Frontend sudah dibuat dengan **React JS** oleh teman saya.
- Tim kecil (mahasiswa), ingin cepat jadi MVP tapi aman untuk urusan uang.
- Database: PostgreSQL. Butuh queue/delayed job (Redis), WebSocket untuk chat, integrasi payment gateway Indonesia (Midtrans/Xendit) dan WhatsApp API.

Berikan:
1. **2–3 opsi stack backend** (framework + bahasa + ORM/query builder + library queue + library test). Untuk tiap opsi nilai: kecocokan dengan modular monolith, dukungan transaksi DB & row lock, kemudahan state machine, ekosistem queue/scheduler, kemudahan berbagi tipe/kontrak dengan frontend React, kurva belajar, dan kemudahan deploy.
2. **Satu rekomendasi final** beserta alasannya.
3. **Struktur folder** untuk rekomendasi tersebut, dengan satu folder per modul sesuai `01-arsitektur-sistem.md`.
4. Daftar keputusan teknis lain yang perlu saya setujui (misal: auth JWT vs session, format respons API, tool migration).

Jangan membuat file apa pun. Tunggu persetujuan saya.
