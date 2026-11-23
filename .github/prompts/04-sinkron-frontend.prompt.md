---
description: "Cocokkan panggilan API di frontend React dengan desain endpoint backend"
agent: agent
---

Frontend React ada di: **${input:frontend:path folder atau nama repo frontend}**

Tugas (jangan mengubah kode dulu):
1. Cari semua panggilan API di frontend (fetch, axios, React Query, service/api file, dll). Catat method, URL, body, query param, dan bentuk respons yang diharapkan.
2. Bandingkan dengan [API endpoints](../../docs/backend-design/08-api-endpoints.md) dan, jika sudah ada, implementasi backend saat ini.
3. Laporkan dalam tabel: `Endpoint frontend | Endpoint desain/backend | Status (Cocok / Beda nama / Beda bentuk data / Tidak ada di backend / Tidak dipakai frontend) | Saran`.
4. Periksa juga: format token auth yang dipakai frontend, base URL & prefix `/api/v1`, kebutuhan CORS, format error yang dibaca frontend, dan format uang (frontend harus menerima integer Rupiah).
5. Berikan rekomendasi: bagian mana yang sebaiknya disesuaikan di backend dan mana di frontend. Jika ada endpoint yang dibutuhkan frontend tapi tidak ada di desain, usulkan penambahannya ke `08-api-endpoints.md`.

Tunggu persetujuan saya sebelum mengubah kode atau dokumen.
