# Deploy Digital.in ke Render + Vercel (langkah demi langkah)

Ringkasan praktis dari `DEPLOY.md` di branch **`integrasi-auth`** (branch yang punya `backend/Dockerfile`). Detail teknis lengkap ada di file itu.

```
Neon (database) ─┐
Supabase (file) ─┼─► Render (backend Laravel, Docker) ◄── Vercel (frontend Next.js)
Gmail SMTP ──────┘
```

File pendukung di folder ini:

| File | Isi |
|---|---|
| `render.env.template` | Semua env backend untuk Render (placeholder) |
| `vercel.env.template` | Env frontend untuk Vercel |

> **Aturan rahasia:** isi template di Notepad atau di file **di luar folder repo** (mis. `C:\Users\<kamu>\digitalin-server.env`). Jangan di-commit, jangan ditempel ke chat/screenshot. Jika rahasia sempat bocor, buat ulang (rotate) di layanannya.

Perkiraan waktu: 45–60 menit.

---

## 0. Siapkan rahasia (laptop, 5 menit)

Buka PowerShell, jalankan satu per satu, salin hasilnya ke Notepad:

```powershell
php -r "echo 'base64:'.base64_encode(random_bytes(32)), PHP_EOL;"   # -> APP_KEY
php -r "echo bin2hex(random_bytes(32)), PHP_EOL;"                   # -> PAYMENT_WEBHOOK_SECRET
php -r "echo bin2hex(random_bytes(32)), PHP_EOL;"                   # -> DISBURSEMENT_WEBHOOK_SECRET (harus beda)
```

Simpan juga salinan `APP_KEY`: kunci ini dipakai mengenkripsi data (mis. nomor rekening). Jika hilang, data terenkripsi tidak bisa dibaca lagi.

## 1. Neon — database (10 menit)

1. [console.neon.tech](https://console.neon.tech) → project Digital.in (region **AWS Asia Pacific (Singapore)**, PostgreSQL 17).
2. Jika password role pernah bocor: **Roles → Reset password**.
3. **Connection Details** → pilih branch **`production`** → matikan **Connection pooling** (host tanpa `-pooler`).
4. Salin connection string, pastikan berakhir `?sslmode=require` → isi `DB_URL`.

Migrasi tabel berjalan otomatis saat container Render start.

## 2. Supabase — penyimpanan file KTM & hasil kerja (10 menit)

1. [supabase.com](https://supabase.com) → project (region **Southeast Asia (Singapore)**).
2. **Storage** → bucket `digitalin-private`, **Public bucket: OFF**. Buat jika belum ada.
3. **Project Settings → Storage → S3 Connection**:
   - hapus access key lama yang pernah bocor;
   - **New access key** → isi `AWS_ACCESS_KEY_ID` dan `AWS_SECRET_ACCESS_KEY` (secret hanya tampil sekali);
   - salin **Endpoint** → `AWS_ENDPOINT`, **Region** → `AWS_DEFAULT_REGION`.

Project gratis dijeda setelah ±1 minggu tanpa aktivitas. Sebelum demo: dashboard → **Restore project** jika dijeda.

## 3. Email — OTP & verifikasi (10 menit)

> **Render Free memblokir koneksi keluar ke port SMTP 25, 465, dan 587** ([changelog Render](https://render.com/changelog/free-web-services-will-no-longer-allow-outbound-traffic-to-smtp-ports)). Gmail SMTP hanya memakai port itu, jadi dari Render Free email OTP akan gagal (timeout → "server error"). Pakai penyedia SMTP yang mendukung port **2525**.

Pilihan tanpa ubah kode — **Brevo** (gratis 300 email/hari):

1. Daftar di [brevo.com](https://www.brevo.com).
2. **Senders, Domains & Dedicated IPs → Senders → Add a sender**: pakai alamat email aplikasi, klik tautan verifikasi yang dikirim ke alamat itu.
3. **SMTP & API → SMTP → Generate a new SMTP key**. Catat **Login** (→ `MAIL_USERNAME`) dan **SMTP key** (→ `MAIL_PASSWORD`).
4. Env: `MAIL_HOST=smtp-relay.brevo.com`, `MAIL_PORT=2525`, **tanpa** `MAIL_SCHEME`, `MAIL_FROM_ADDRESS` = sender yang sudah diverifikasi.

Gmail (`smtp.gmail.com`, 465, `MAIL_SCHEME=smtps`, App Password) hanya berfungsi di instance Render berbayar atau di laptop.

## 4. Render — backend (15 menit + 5–10 menit build)

1. [render.com](https://render.com) → daftar dengan GitHub → **Only select repositories** → pilih repo yang berisi branch `integrasi-auth` (`violettess/digital.in`). Selesaikan verifikasi kartu (kartu sendiri, atau kartu orang lain **dengan izinnya**).
2. **New → Web Service** → repo tersebut:

   | Field | Nilai |
   |---|---|
   | Name | mis. `digitalin-api` → URL jadi `https://digitalin-api.onrender.com` |
   | Language | **Docker** |
   | Branch | **`integrasi-auth`** |
   | Region | **Singapore** |
   | Root Directory | **`backend`** |
   | Instance Type | **Free** |
   | Health Check Path (Advanced) | **`/api/v1/health`** |

3. **Environment Variables → Add from .env** → tempel isi `render.env.template` yang **sudah diisi**.
   - `APP_URL` bisa langsung diisi dengan URL dari nama service.
   - `FRONTEND_URL` dan `CORS_ALLOWED_ORIGINS` isi tebakan dulu (`https://<nama-project>.vercel.app`), diperbaiki di langkah 6.
   - Jangan tambahkan `PORT`.
   - Jika Render menolak format: hapus baris komentar (`#`) lalu tempel ulang.
4. **Deploy Web Service**. Pantau tab **Logs**. Yang diharapkan berurutan: `config:cache`, `migrate --force`, seeder kategori layanan, `universities:import`, Apache start.
5. Buka `https://<nama-service>.onrender.com/api/v1/health` → harus `{"data":{"status":"ok"},"meta":[]}`.

Batasan Free: tidur setelah 15 menit tanpa trafik (request pertama ±1 menit); **tanpa Cron Job**, jadi tagihan kedaluwarsa, reminder, dan eskalasi tidak berjalan otomatis. Buka URL health beberapa menit sebelum presentasi agar server sudah bangun.

## 5. Vercel — frontend (10 menit)

1. [vercel.com](https://vercel.com) → **Add New → Project** → repo yang sama.
2. Framework: **Next.js** (otomatis). Root Directory: **root repo** (biarkan kosong / `./`).
3. Environment Variables: isi dari `vercel.env.template` (`NEXT_PUBLIC_API_URL=https://<nama-service>.onrender.com/api/v1`).
4. Deploy. Lalu **Settings → Git → Production Branch = `integrasi-auth`** dan **Redeploy** jika deploy pertama memakai `main`.
5. Catat domain produksi, mis. `https://digitalin.vercel.app`.

## 6. Hubungkan Render ↔ Vercel (2 menit)

Render → service → **Environment** → ubah:

```
FRONTEND_URL=https://<domain-vercel>
CORS_ALLOWED_ORIGINS=https://<domain-vercel>
```

Persis tanpa `/` di akhir. Simpan → Render restart otomatis.

## 7. Buat akun admin dari laptop (10 menit)

Render Free tidak punya Shell, jadi artisan dijalankan dari laptop ke Neon.

1. Di `php.ini` laptop aktifkan `extension=pdo_pgsql` dan `extension=pgsql`.
2. Buat file **di luar repo**, mis. `C:\Users\<kamu>\digitalin-server.env`, isi **sama** dengan env Render (minimal `APP_ENV`, `APP_KEY`, `DB_CONNECTION`, `DB_URL`, `KTM_FILES_DISK`, `SUBMISSION_FILES_DISK`, `AWS_*`, `PAYMENT_*`, `DISBURSEMENT_*`).
   - PHP XAMPP (libpq lama): pakai `DB_HOST/DB_PORT/DB_DATABASE/DB_USERNAME` dan `DB_PASSWORD=endpoint=<endpoint-id>;<password>` dengan `DB_URL=` kosong. Lihat `DEPLOY.md` bagian 5.
3. Checkout branch `integrasi-auth` di laptop (`git switch integrasi-auth`, lalu `composer install` di `backend`).
   - Bungkus nilai yang berisi `;`, `$`, `&`, spasi, atau `#` dengan **kutip tunggal**, mis. `DB_PASSWORD='endpoint=ep-xxx;password'`. Tanpa kutip, Git Bash membaca `;` sebagai pemisah perintah.
4. **Git Bash**, dari folder `backend`. `tr -d '\r'` membuang akhir baris Windows (CRLF) dari file buatan Notepad:

   ```bash
   php artisan config:clear   # cache config lokal membuat env server diabaikan

   # 1) Pastikan tujuannya branch production Neon (cocokkan endpoint ep-... dengan dashboard)
   ( set -a; . <(tr -d '\r' < /c/Users/<kamu>/digitalin-server.env); set +a; php artisan db:show )

   # 2) Buat admin; password diketik tanpa tampil di layar
   read -rs ADMIN_PASSWORD && export ADMIN_PASSWORD
   ( set -a; . <(tr -d '\r' < /c/Users/<kamu>/digitalin-server.env); set +a; \
     php artisan auth:create-admin --name="Admin Digital.in" --email=<email-admin> --password-env=ADMIN_PASSWORD )
   unset ADMIN_PASSWORD
   ```

5. Opsional, data demo untuk presentasi (password akun demo dicetak **sekali**, catat):

   ```bash
   ( set -a; . <(tr -d '\r' < /c/Users/<kamu>/digitalin-server.env); set +a; php artisan demo:seed )
   ```

   Tidak perlu `--allow-production` karena `APP_ENV=staging`. Hapus sebelum pengguna sungguhan: `php artisan demo:clear --force`.

## 8. Uji alur (10 menit)

- [ ] `.../api/v1/health` → `ok`
- [ ] Buka domain Vercel → daftar mahasiswa → OTP email masuk inbox
- [ ] Login → unggah KTM (file masuk bucket Supabase)
- [ ] Login admin → menyetujui KTM → mahasiswa jadi aktif
- [ ] Browser console tanpa error CORS

## Troubleshooting

| Gejala | Penyebab umum | Perbaikan |
|---|---|---|
| Build Render gagal di `composer install` | Branch salah (bukan `integrasi-auth`) atau Root Directory bukan `backend` | Cek setting service |
| Log `APP_KEY kosong` | `APP_KEY` belum diisi / tanpa awalan `base64:` | Isi ulang, simpan |
| Error koneksi DB / SSL | Host `-pooler`, kurang `?sslmode=require`, password lama | Pakai koneksi langsung, reset password |
| Error CORS di browser | `CORS_ALLOWED_ORIGINS` beda satu karakter (ada `/`, http vs https) | Samakan persis dengan domain Vercel |
| OTP tidak masuk | `MAIL_PASSWORD` salah / 2FA mati / `MAIL_MAILER=log` | Buat App Password baru |
| Unggah KTM gagal | Supabase dijeda, key lama, `AWS_USE_PATH_STYLE_ENDPOINT` bukan `true` | Restore project, cek key & endpoint |
| Membuat pembayaran error 500 | `APP_ENV=production` dengan driver mock | Pakai `staging` |
| Build Vercel gagal | `NEXT_PUBLIC_API_URL` kosong / localhost / ada `DEMO_LOCAL_PROXY` | Perbaiki env, redeploy |

## Checklist keamanan sebelum dibagikan

- [ ] `APP_DEBUG=false`, `LOG_LEVEL` bukan `debug`, `BROADCAST_CONNECTION=null`
- [ ] `APP_KEY`, password Neon, key Supabase, App Password Gmail semuanya **baru**
- [ ] Bucket Supabase privat; `CORS_ALLOWED_ORIGINS` hanya domain Vercel
- [ ] `TRUSTED_PROXIES=*`; dua webhook secret acak dan berbeda
- [ ] `NEXT_PUBLIC_AUTH_MOCK` tidak di-set di Vercel
- [ ] Pengguna diberi tahu pembayaran masih **tiruan** (`APP_ENV=staging`)
