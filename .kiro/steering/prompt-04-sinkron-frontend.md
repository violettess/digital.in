---
inclusion: manual
---

# Prompt: Sinkronkan API Backend dengan Frontend React

Saat prompt ini di-include, sebutkan lokasi kode frontend di pesan chat (path folder, atau nama repo kalau perlu di-clone). Kalau tidak disebutkan dan tidak ada folder frontend di workspace ini, catat di `docs/backend-design/PROGRESS.md` bahwa langkah ini dilewati karena kode frontend tidak tersedia, lalu lanjut ke fase berikutnya.

Tugas:
1. Cari semua panggilan API di frontend (fetch, axios, React Query, service/api file, dll). Catat method, URL, body, query param, dan bentuk respons yang diharapkan.
2. Bandingkan dengan `docs/backend-design/08-api-endpoints.md` dan, jika sudah ada, implementasi backend saat ini.
3. Laporkan dalam tabel: `Endpoint frontend | Endpoint desain/backend | Status (Cocok / Beda nama / Beda bentuk data / Tidak ada di backend / Tidak dipakai frontend) | Saran`.
4. Periksa juga: format token auth yang dipakai frontend, base URL & prefix `/api/v1`, kebutuhan CORS, format error yang dibaca frontend, dan format uang (frontend harus menerima integer Rupiah).
5. Berikan rekomendasi: bagian mana yang sebaiknya disesuaikan di backend dan mana di frontend. Jika ada endpoint yang dibutuhkan frontend tapi tidak ada di desain, usulkan penambahannya ke `08-api-endpoints.md`.

Setelah laporan: terapkan rekomendasimu — sesuaikan backend dan `08-api-endpoints.md` bila perlu, dan catat setiap keputusan di `docs/backend-design/DECISIONS.md`. **Jangan mengubah kode frontend** — tulis perubahan yang dibutuhkan frontend sebagai daftar di bagian "Catatan untuk Frontend" pada `docs/backend-design/PROGRESS.md`.
