# 08 — Daftar API Endpoint (Draft)

Prefix: `/api/v1`. Role yang boleh mengakses ditulis di kolom **Akses**.

## Auth & Verifikasi
| Method | Endpoint | Akses | Keterangan |
|---|---|---|---|
| POST | `/auth/otp/send` | Publik | Kirim OTP melalui Meta WhatsApp Cloud API; berlaku 5 menit, cooldown 60 detik |
| POST | `/auth/otp/verify` | Publik | OTP REGISTER, maksimal 5 percobaan; mengembalikan verification token sekali pakai, TTL 5 menit |
| POST | `/auth/login` | Publik | `identifier` (email/HP) + password; access bearer berlaku 15 menit, refresh token 30 hari |
| POST | `/auth/refresh` | Publik | Refresh token sekali pakai; rotasi atomik, token lama dicabut. Token yang sudah dirotasi dipakai lagi → semua sesi user dicabut (deteksi pencurian) |
| POST | `/auth/logout` | Login | Cabut access token saat ini dan refresh token |
| POST | `/auth/register/umkm` | Publik | Nama usaha, HP, password, verification token OTP. Semua endpoint register dibatasi 5/menit & 30/jam per IP |
| POST | `/auth/register/student` | Publik | Email login, password, university_id, campus_email opsional |
| POST | `/auth/register/mentor` | Publik | Nama, email, password, title, institution; akun menunggu admin |
| POST | `/students/me/campus-email/verification` | Mahasiswa | Kirim tautan signed verifikasi `campus_email`, berlaku 60 menit. Maks 1/menit & 5/jam, dikirim lewat queue |
| GET | `/auth/email/verify/{profile}/{hash}` | Publik, signed URL | Konsumsi tautan verifikasi email kampus sekali pakai; user menjadi ACTIVE |
| GET | `/universities` | Publik | Daftar pilihan universitas untuk registrasi mahasiswa |
| POST | `/students/me/verification` | Mahasiswa | Upload KTM PDF/JPG/PNG maks 5 MB ke private storage jika tanpa email kampus |

## Profil & Portofolio
| Method | Endpoint | Akses | Keterangan |
|---|---|---|---|
| GET/PUT | `/me/profile` | Login | Profil sesuai role. Mentor: `expertise_category_ids[]` (kategori aktif) untuk penugasan review. Path KTM & verifikator tidak dikirim (`has_ktm` boolean) |
| PUT | `/students/me/skills` | Mahasiswa | Atur skill per kategori |
| GET | `/students/{id}` | Login | Profil publik + portofolio + rating |
| GET | `/students` | UMKM | Cari talent (filter kategori, kota, rating) |
| POST | `/students/me/portfolio` | Mahasiswa | Tambah portofolio manual |
| PUT | `/mentors/me/availability` | Mentor | Atur ketersediaan |

## Project
| Method | Endpoint | Akses | Keterangan |
|---|---|---|---|
| GET | `/categories`, `/templates` | Publik | Kategori & template kebutuhan. `/templates?category_id=` |
| POST | `/projects` | UMKM | Buat draft. `template_id` opsional, harus satu kategori |
| PUT | `/projects/{id}` | UMKM pemilik | Edit sebagian field, hanya saat DRAFT/OPEN |
| POST | `/projects/{id}/publish` | UMKM pemilik | DRAFT ke OPEN, deadline harus di masa depan. `meta.recommendations` berisi 10 talent teratas |
| POST | `/projects/{id}/cancel` | UMKM pemilik | Hanya saat DRAFT/OPEN. Lamaran terbuka → REJECTED, undangan PENDING → EXPIRED |
| GET | `/projects` | Login | Browse + filter `category_id`, `city`, `q`. Selain admin hanya OPEN; UMKM `?mine=1` untuk project sendiri. Premium tampil lebih dulu (fase premium) |
| GET | `/projects/{id}` | Login | Detail. DRAFT hanya untuk pemilik/admin. Mahasiswa mendapat `my_application` |
| GET | `/projects/{id}/recommendations` | UMKM pemilik | Hasil smart matching + `breakdown` skor |
| POST | `/projects/{id}/premium` | UMKM pemilik | Beli premium listing (`method`). Harga & durasi dari setting (snapshot). Hanya project OPEN. Respons `premium_listing` + `payment` (bayar lewat webhook seperti escrow). Beli saat masih aktif = perpanjangan setelah periode berjalan |

## Lamaran & Undangan
| Method | Endpoint | Akses | Keterangan |
|---|---|---|---|
| POST | `/projects/{id}/invitations` | UMKM pemilik | Undang mahasiswa terverifikasi (`student_id` = user id). Project harus OPEN. Berlaku `invitation_expiry_days` |
| POST | `/invitations/{id}/accept`, `/decline` | Mahasiswa yang diundang | Respons undangan. Accept dicek batas 2 kontrak aktif (422). Setelah accept, mahasiswa mengirim lamaran biasa dan lamaran otomatis tertaut ke undangan |
| POST | `/projects/{id}/applications` | Mahasiswa | Proposal + harga + usulan milestone (opsional jika project memakai template). Total = harga, tiap milestone ≥ `min_milestone_amount`. Ditolak (422) jika sudah 2 kontrak aktif atau sudah melamar |
| GET | `/projects/{id}/applications` | UMKM pemilik | Daftar pelamar, urut `match_score` |
| POST | `/applications/{id}/accept` | UMKM pemilik | Membuat kontrak + milestone + escrow. 409 jika mahasiswa sudah penuh |
| POST | `/applications/{id}/reject` | UMKM pemilik | Tolak |
| POST | `/applications/{id}/withdraw` | Mahasiswa pelamar | Tarik lamaran |

## Kontrak & Milestone
| Method | Endpoint | Akses | Keterangan |
|---|---|---|---|
| GET | `/contracts`, `/contracts/{id}` | UMKM, Mahasiswa, Mentor, Admin | Detail + progress milestone + ringkasan escrow. Hanya pihak kontrak, mentor milestone kontrak itu, atau admin |
| POST | `/contracts/{id}/payments` | UMKM pemilik | Buat tagihan escrow (`method`: VA, QRIS, EWALLET). Respons: `amount` (nilai project), `gateway_fee` (ditanggung UMKM), `total_charged`, `checkout_url`, `expires_at`. 201 jika baru, 200 jika tagihan PENDING sudah ada. 409 jika kontrak bukan AWAITING_PAYMENT |
| POST | `/contracts/{id}/start` | Mahasiswa | Mulai pengerjaan |
| POST | `/milestones/{id}/submissions` | Mahasiswa | Upload hasil kerja (multipart: `files[]` wajib 1–10 file, maks 20 MB/file, `notes` opsional). Milestone harus `IN_PROGRESS` |
| GET | `/mentor/review-queue` | Mentor | Antrean review: milestone `MENTOR_REVIEW` milik assignment ACTIVE mentor ini. `?per_page=` (maks 50) |
| POST | `/submissions/{id}/mentor-review` | Mentor yang ditugaskan | APPROVED / NEEDS_CHANGES. `feedback` wajib untuk NEEDS_CHANGES |
| POST | `/submissions/{id}/client-review` | UMKM pemilik | APPROVED / REVISION_REQUESTED. `feedback` wajib untuk revisi. Revisi ke-3 → 422 |
| POST | `/milestones/{id}/disputes` | UMKM, Mahasiswa pihak kontrak | Ajukan sengketa ke admin (`reason` wajib). Hanya saat `CLIENT_REVIEW` dan revisi sudah habis, selain itu 422 |
| GET | `/submissions/{id}/files/{file}` | Mahasiswa pemilik, mentor milestone, UMKM pemilik (hanya setelah lolos mentor), Admin | Unduh file hasil kerja dari private storage |

## Pembatalan
| Method | Endpoint | Akses | Keterangan |
|---|---|---|---|
| POST | `/contracts/{id}/cancellations` | UMKM, Mahasiswa pihak kontrak | `reason` wajib, `evidence_urls[]` (https, maks 10), `reopen_project` (UMKM, sebelum mulai). AWAITING_PAYMENT/FUNDED → DIRECT (langsung CANCELLED, FUNDED di-refund penuh tanpa biaya gateway). IN_PROGRESS → NEEDS_REVIEW (kontrak CANCELLATION_REQUESTED). Status lain → 409 |
| POST | `/cancellations/{id}/responses` | Pihak lain | `response`, sekali selama PENDING (409 jika sudah) |
| POST | `/cancellations/{id}/withdraw` | Pengaju | PENDING → WITHDRAWN, kontrak kembali IN_PROGRESS, timer review UMKM digeser sebesar durasi jeda |

## Keuangan
| Method | Endpoint | Akses | Keterangan |
|---|---|---|---|
| POST | `/webhooks/payment-gateway` | Gateway | Verifikasi signature atas raw body (driver mock: HMAC-SHA256 di header `X-Signature`), 401 jika tidak valid. Idempotent per `gateway_ref`. Event PAID (nominal harus = `total_charged`, selain itu 422), FAILED, EXPIRED. Dev: `php artisan payments:mock-pay {payment_id}` |
| POST | `/webhooks/disbursement` | Gateway | Status payout SUCCESS/FAILED. Signature atas raw body (mock: HMAC-SHA256 `X-Signature` dengan `DISBURSEMENT_WEBHOOK_SECRET`), idempotent per `gateway_ref`. Dev: `php artisan payouts:mock-complete {payout_id}` |
| GET | `/wallet` | Mahasiswa, Mentor | Saldo + riwayat ledger wallet sendiri (`?per_page=`) |
| POST/GET | `/bank-accounts` | Mahasiswa, Mentor | `channel` BANK/EWALLET, `provider_code`, `account_number` (6–20 digit, disimpan terenkripsi, hanya `account_number_last4` dikirim), `account_holder_name`, `is_primary`. Maks 5 |
| GET | `/wallet/withdrawals/preview?amount=&bank_account_id=` | Mahasiswa, Mentor | `fee`, `net_amount`, `allowed`, `reason` |
| GET | `/wallet/withdrawals` | Mahasiswa, Mentor | Riwayat penarikan sendiri (50 terbaru) |
| POST | `/wallet/withdrawals` | Mahasiswa, Mentor | `amount`, `bank_account_id`. Minimal Rp 20.000, biaya transfer ditanggung penarik (`withdrawal_fee` jika diisi, selain itu tarif gateway). Saldo dikunci; status REQUESTED → PROCESSING → SUCCESS/FAILED (gagal = saldo kembali) |

## Rating, Sertifikat, Chat, Notifikasi
| Method | Endpoint | Akses | Keterangan |
|---|---|---|---|
| POST | `/contracts/{id}/ratings` | UMKM, Mahasiswa | Setelah COMPLETED (409 selain itu). Body `target` (UMKM: STUDENT; mahasiswa: UMKM / MENTOR + `mentor_id` jika mentor lebih dari satu), `score` 1–5, `comment`. Sekali per pihak yang dinilai |
| GET | `/certificates/{code}/verify` | Publik | Verifikasi sertifikat oleh HRD: nomor, nama, kampus, project, kategori, tanggal selesai (tanpa kontak). Rate limit 60/menit |
| GET | `/students/me/certificates` | Mahasiswa | Daftar sertifikat. PDF menyusul (`pdf_url` masih null) |
| GET | `/conversations` | UMKM, Mahasiswa | Percakapan milik sendiri + `unread_count`. Percakapan dibuat otomatis saat lamaran/undangan, ditautkan ke kontrak saat diterima |
| GET/POST | `/conversations/{id}/messages` | Peserta chat | GET menandai pesan pihak lain dibaca. POST `body` (maks 2000), `attachment_url` (https). Nomor HP/email/ajakan transaksi di luar platform → `is_flagged` + `meta.warning`. Realtime: event `message.sent` di private channel `conversation.{id}`, otorisasi `POST /api/broadcasting/auth` dengan bearer token |
| GET | `/notifications` | Login | Notifikasi milik sendiri, terbaru dulu. `?unread=1`, `?per_page=`. `meta.unread_count` |
| POST | `/notifications/{id}/read` | Login (pemilik) | Tandai dibaca. Notifikasi milik user lain → 404 |

## Admin
| Method | Endpoint | Keterangan |
|---|---|---|
| GET | `/admin/verifications` | Admin | Antrean verifikasi KTM mahasiswa dan mentor |
| POST | `/admin/verifications/{id}/approve`, `/reject` | Admin | Sertakan `type=STUDENT_KTM` atau `MENTOR`; `reason` wajib saat reject |
| GET | `/admin/students/{id}/ktm` | Admin | Download file KTM dari private storage |
| GET | `/admin/alerts` | Eskalasi: UMKM tidak merespons, mentor telat, dll. Filter `type`, `status` (default belum RESOLVED), `severity`; HIGH tampil dulu |
| GET | `/admin/alerts/{id}` | Detail alert + riwayat follow up + konteks (milestone, submission, review mentor, kontrak / pembatalan) |
| GET | `/admin/cancellations/{id}` | Detail + bukti + submission & riwayat review + escrow + `allocatable_milestones`. Chat menyusul (Fase 7) |
| POST | `/admin/cancellations/{id}/approve` | `allocations[]` (`milestone_id`, `amount_to_student`, `amount_to_umkm`) untuk setiap milestone yang dananya masih ditahan, tiap baris = nilai milestone, total = `held_amount`. Hanya setelah pihak lain menanggapi atau batas 3 hari lewat (422 jika belum) |
| POST | `/admin/cancellations/{id}/reject` | `admin_notes` wajib. Aturan waktu sama dengan approve |
| POST | `/admin/alerts/{id}/follow-ups` | Catat follow up ke UMKM (`channel`: WHATSAPP/TELEPON/EMAIL, `outcome`: TIDAK_DIANGKAT/DIJAWAB_AKAN_REVIEW/DIJAWAB_MENOLAK/LAINNYA, `notes`). Hanya alert `UMKM_UNRESPONSIVE` (422 selain itu). Follow up pertama memulai batas 7 hari; berikutnya tidak menggeser deadline. 409 jika alert AWAITING_DECISION/RESOLVED |
| POST | `/admin/milestones/{id}/force-approve` | Milestone ESCALATED → APPROVED (`approved_via` ADMIN_FORCE) + pencairan dana. Untuk kasus UMKM diam, hanya setelah batas follow up lewat (409 jika alert masih OPEN/FOLLOWED_UP). `notes` opsional |
| POST | `/admin/milestones/{id}/return-to-student` | ESCALATED → IN_PROGRESS, `notes` wajib. Tidak menambah `revision_count` |
| POST | `/admin/contracts/{id}/terminate` | Kontrak IN_PROGRESS → TERMINATED dengan `allocations[]` seperti approve pembatalan, `admin_notes` wajib. 409 jika ada pengajuan PENDING |
| POST | `/admin/milestones/{id}/reassign-mentor` | `mentor_id` opsional (otomatis jika kosong). Untuk milestone IN_PROGRESS / MENTOR_REVIEW / ESCALATED; reset `mentor_return_count`, ESCALATED → IN_PROGRESS. Mentor lama tetap dibayar jika `fee_eligible` |
| POST | `/admin/milestones/{id}/extra-chance` | Hanya ESCALATED karena 3x dikembalikan mentor (409 selain itu); reset `mentor_return_count`, → IN_PROGRESS |
| POST | `/admin/milestones/{id}/forward-to-client` | ESCALATED → CLIENT_REVIEW tanpa persetujuan mentor; timer review UMKM dimulai ulang |
| POST | `/admin/users/{id}/suspend` | `reason` wajib. ACTIVE → SUSPENDED, semua token dicabut. Akun admin tidak bisa di-suspend lewat API |
| GET/PUT | `/admin/settings` | PUT body `{ "settings": { key: value } }`; hanya key di README, divalidasi (komisi 10–15%) |
| GET | `/admin/reports/finance` | `?from=&to=` (tanggal WIB). GMV, biaya gateway, komisi, fee mentor, platform bersih, refund, saldo escrow & wallet. Payout menyusul (Fase 7) |
