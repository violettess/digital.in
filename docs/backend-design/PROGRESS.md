# Progress Implementasi Backend

Urutan mengikuti "Urutan Implementasi yang Disarankan" di `README.md`.

- [x] 1. Auth + profil + verifikasi — diaudit & diperbaiki (lihat "Audit")
- [x] 2. Project + lamaran + kontrak + milestone
- [x] 3. Ledger + escrow + webhook pembayaran
- [x] 4. Mentor review + batas revisi
- [x] 5. Scheduler (reminder & eskalasi)
- [x] 6. Pembatalan + panel admin
- [x] 7. Payout, sertifikat, rating, chat, premium listing

## Blocker / Celah yang Masih Terbuka

- **Butuh keputusan manusia — gateway pembayaran.** Baru ada driver `mock`. Pilih Midtrans atau Xendit, lalu buat driver yang mengimplementasikan `App\Modules\payment\Gateway\PaymentGateway` (create charge, verifikasi signature resmi gateway, parsing webhook). Cek juga catatan legal escrow di file 06.
- **Konfigurasi** — `PAYMENT_WEBHOOK_SECRET` wajib diisi di `.env`; tanpa itu webhook selalu 500 (fail closed).
- **Butuh keputusan manusia — sertifikat PDF.** Pilih library PDF (misal `barryvdh/laravel-dompdf`) dan desain sertifikat; saat ini `pdf_url` null, verifikasi publik sudah jalan lewat API.
- **Butuh keputusan manusia — WebSocket.** Pasang server realtime (Laravel Reverb atau Pusher) dan set `BROADCAST_CONNECTION`; event & otorisasi channel chat sudah siap.
- **Gateway asli — disbursement** — driver disbursement (validasi rekening, transfer, webhook resmi) belum ada; `DISBURSEMENT_WEBHOOK_SECRET` wajib diisi di `.env`.
- **Gateway asli — refund** — driver Midtrans/Xendit perlu mengimplementasikan `refund()` dan webhook status refund (driver mock langsung SUCCESS). Refund FAILED saat ini hanya memberi tahu admin; belum ada endpoint retry.
- **Belum di `08-api-endpoints.md`** — kelola kategori & template (use case admin A2), lihat audit log (A9), daftar pengajuan pembatalan untuk admin (saat ini lewat `GET /admin/alerts`), daftar undangan mahasiswa.
- **Operasional** — delayed job butuh worker `php artisan queue:work` (Redis) dan cron `* * * * * php artisan schedule:run`. Kanal WhatsApp/email masih mock (log): perlu template WhatsApp Business yang disetujui Meta dan layanan email.
- **Test di Postgres** — semua test berjalan di SQLite in-memory: `lockForUpdate`, partial index, dan race condition belum teruji di Postgres. Siapkan database test terpisah (jangan DB dev, `RefreshDatabase` menghapus isinya) dan jalankan suite di CI.

## Audit Kode vs Desain (semua modul)

Tidak ada temuan Kritis. Temuan **Sedang** yang sudah diperbaiki:

- Data keuangan bisa ikut terhapus lewat cascade (user → kontrak → escrow/milestone/settlement; ledger kehilangan akun) → FK keuangan RESTRICT; `ledger_transactions.idempotency_key` NOT NULL; FK `portfolio_items.contract_id`; kolom `platform_settings.description` (migration `2026_10_17_160000`).
- Driver mock pembayaran/disbursement bisa aktif di production → ditolak saat di-resolve.
- Registrasi & kirim ulang email kampus tanpa rate limit; OTP WhatsApp tanpa batas per IP → limiter `register`, `campus-email`, dan batas OTP 10/jam per IP.
- Email verifikasi kampus dikirim sinkron (mailer gagal → 500 setelah akun tersimpan) → notifikasi lewat queue setelah commit.
- Refresh token tanpa deteksi pemakaian ulang → reuse mencabut semua sesi + audit log.
- `GET /students/{id}` menampilkan mahasiswa yang di-suspend → 404.
- Mentor tidak bisa mengatur keahlian (penugasan per kategori tidak pernah cocok) → `expertise_category_ids` di `PUT /me/profile`.
- Ikut diperbaiki (Rendah): `ktm_file_url`/`verified_by` tidak lagi dikirim di `/me/profile` (`has_ktm`), `/admin/verifications/{id}` hanya menerima UUID.

Temuan **Rendah** yang belum diperbaiki (backlog): CHECK constraint enum di DB, kolom nullable yang selalu terisi (contract_no, snapshot fee, payer_id), timestamps di pivot skills/expertises, `active_contracts_count` tidak pernah diperbarui (dihitung dari kontrak), kode error khusus untuk 429/503, enumerasi akun di OTP/login, normalisasi nomor HP saat login, prune token kedaluwarsa, paginasi antrean verifikasi, cast `rating_avg`, rate limit webhook, test KTM reject/validasi file/akses download, penyelesaian refund berstatus PROCESSING (butuh webhook refund dari driver asli).

Test regresi: `tests/Feature/AuditFixesTest.php` + test reuse refresh token di `AuthApiTest`.

## Laporan per Fase

### Fase 7 — Payout, sertifikat, rating, chat, premium listing

- Payout: rekening (terenkripsi, maks 5, primary), preview biaya, penarikan dengan saldo dikunci, disbursement lewat job, webhook SUCCESS/FAILED (gagal = jurnal reversal), riwayat penarikan, command dev `payouts:mock-complete`.
- Sertifikat + portofolio terverifikasi otomatis saat kontrak COMPLETED, verifikasi publik untuk HRD, daftar sertifikat mahasiswa, notifikasi minta rating.
- Rating UMKM → mahasiswa, mahasiswa → UMKM & mentor, `rating_avg` diperbarui.
- Chat: percakapan otomatis per project, pesan + tanda dibaca, deteksi kontak/transaksi di luar platform, event broadcast private channel, chat tampil di detail pembatalan admin.
- Premium listing: pembelian + pembayaran lewat webhook yang sama, perpanjangan, urutan teratas di `GET /projects`, job reminder 3 hari & expire, refund pembayaran terlambat.
- Laporan keuangan admin kini memuat payout & pendapatan premium.
- Tabel baru: `bank_accounts`, `payouts`, `certificates`, `ratings`, `conversations`, `messages`, `premium_listings`.
- Belum: PDF sertifikat, server WebSocket, driver disbursement asli, upload lampiran chat (baru URL).
- Keputusan: `DECISIONS.md` bagian Fase 7.

### Fase 6 — Pembatalan + panel admin

- Pembatalan: `POST /contracts/{id}/cancellations` (DIRECT untuk AWAITING_PAYMENT/FUNDED dengan refund penuh tanpa biaya gateway; NEEDS_REVIEW untuk IN_PROGRESS), tanggapan pihak lain, tarik pengajuan, job `cancellation-response` 3 hari, jeda & penggeseran timer review UMKM.
- Keputusan admin: approve dengan alokasi per milestone (komisi dari bagian mahasiswa, fee mentor dari nilai penuh, refund bagian UMKM), reject, terminasi langsung, force-approve (guard AWAITING_DECISION), return-to-student, extra-chance, forward-to-client, reassign-mentor (mentor lama tetap dibayar).
- Refund lewat gateway (`refunds`, `ProcessRefundJob`, jurnal payable → gateway clearing). Pembayaran terlambat setelah kontrak batal kini di-refund otomatis (blocker Fase 3 tertutup).
- Panel admin: `GET /admin/alerts`, `GET /admin/alerts/{id}`, `GET /admin/cancellations/{id}`, `GET/PUT /admin/settings`, `GET /admin/reports/finance`, `POST /admin/users/{id}/suspend`.
- Tabel/kolom baru: `cancellation_requests` (+ partial unique 1 PENDING per kontrak), `cancellation_allocations`, `refunds`, `milestones.client_review_paused_seconds`.
- Belum: chat di detail pembatalan (Fase 7), upload file bukti, retry refund gagal, kelola kategori/template, viewer audit log.
- Keputusan: `DECISIONS.md` bagian Fase 6.

### Fase 5 — Scheduler (reminder & eskalasi)

- Job dari file 07: `start-reminder` 24/72 jam, `student-not-started` hari ke-7, `mentor-sla` 48 jam + alert `MENTOR_OVERDUE` 72 jam, `client-review-reminder` H+3/H+7/H+10, `umkm-unresponsive` H+14, `admin-followup-sla` (severity HIGH), `followup-deadline` (milestone ESCALATED + alert AWAITING_DECISION), `milestone-deadline` H-2/H+0 + alert `STUDENT_OVERDUE` H+3, `invitation-expire`, project OPEN → CLOSED setelah deadline. `expire-payment` sudah dari Fase 3.
- Delayed job dijadwalkan saat event (dana masuk, submit, mentor approve, alert dibuat, follow up, milestone dibuka, undangan, publish) + cron `scheduler:sweep` harian 01:00 WIB. Setiap aksi sekali jalan (`scheduler_action_logs`), job basi tidak berbuat apa-apa, timer dijeda selain kontrak IN_PROGRESS.
- `POST /admin/alerts/{id}/follow-ups` + tabel `alert_follow_ups`, state machine `admin_alerts`, auto-resolve alert saat mentor/UMKM akhirnya merespons.
- Modul notifikasi: tabel `notifications`, `GET /notifications`, `POST /notifications/{id}/read`, kanal WhatsApp/email lewat job (mock log). Event notifikasi dari file 07 bagian 3 dipasang untuk alur yang sudah ada.
- Setting baru: `mentor_overdue_alert_hours`, `milestone_due_reminder_days_before`, `student_overdue_alert_days`. Config `app.business_timezone`.
- Belum: `cancellation-response` & penggeseran timer saat jeda (Fase 6), `premium-reminder` / `premium-expire` (Fase 7), daftar & keputusan alert admin (Fase 6), kanal WhatsApp/email asli.
- Keputusan: `DECISIONS.md` bagian Fase 5.

### Fase 3 — Ledger + escrow + webhook pembayaran

- `POST /contracts/{id}/payments`: tagihan PENDING (nilai project + biaya gateway ditanggung UMKM), satu tagihan aktif per kontrak, `expires_at` dari `payment_expiry_hours`, delayed job `ExpirePaymentJob` + cron `payments:expire-overdue` (per jam) sebagai jaring pengaman.
- Webhook ditulis ulang: signature atas raw body (fail closed), log selalu disimpan, lock contract → payment, idempotent per `gateway_ref`, cek nominal, event PAID / FAILED / EXPIRED. Expired → kontrak CANCELLED, project kembali OPEN.
- `LedgerService` ditulis ulang: posting double-entry tervalidasi (seimbang, nominal positif, akun valid, idempotency key), cache saldo wallet & escrow diperbarui dengan row lock, invariant escrow dicek setiap perubahan, wajib di dalam transaksi.
- Jurnal `ESCROW_FUNDED` dan `MILESTONE_RELEASE` sesuai file 06 (termasuk fee minimum mentor, batas fee ≤ komisi, mentor pengganti ditanggung platform). `milestone_settlements` dan `mentor_assignments.fee_amount/fee_paid_at` terisi.
- Approve UMKM (Fase 4) kini mencairkan dana di transaksi yang sama; gagal cair → approval di-rollback.
- `GET /wallet` untuk mahasiswa & mentor. Command dev `payments:mock-pay`.
- Dihapus: `PaymentGatewayService` lama, `LedgerService::createWalletEntry` (jurnal satu sisi), endpoint simulasi `POST /contracts/{id}/accept`.
- Tabel/kolom baru: `milestone_settlements`, `payments.checkout_url`, unique wallet per (user, type) + wallet sistem per type.
- Belum: driver gateway asli, notifikasi, reminder Mulai Kerja (Fase 5), refund & alokasi pembatalan (Fase 6), payout (Fase 7), premium listing payment (Fase 7).
- Keputusan: `DECISIONS.md` bagian Fase 3.

### Fase 2 — Project + lamaran + kontrak + milestone

- Diperbaiki: `POST /applications/{id}/withdraw` dan `PUT /projects/{id}` sebelumnya 500 (method tidak ada); `GET /projects/{id}/applications` juga tidak ada; tabel `invitations` belum pernah dibuat; detail project membocorkan daftar lamaran ke semua user.
- Accept lamaran kini dalam satu transaksi: lock project → lamaran → profil mahasiswa, hitung ulang kontrak aktif (409 jika penuh), lamaran lain REJECTED, kontrak AWAITING_PAYMENT dengan snapshot fee + `payment_due_at` + nomor kontrak, milestone LOCKED (batas revisi/pengembalian dari `platform_settings`), escrow PENDING_FUNDING, project ASSIGNED, audit log.
- Apply: hanya mahasiswa VERIFIED, project OPEN (409), batas kontrak aktif (422), lamaran ganda (422), total milestone = harga, minimum per milestone dari setting, urutan due date, milestone default dari template, `match_score` dari smart matching.
- Undangan lengkap dengan state machine, masa berlaku dari setting, cek batas kontrak aktif saat accept.
- Smart matching rule-based (`GET /projects/{id}/recommendations` + saat publish), `GET /templates`, `GET /contracts`, `GET /contracts/{id}`, filter & visibilitas `GET /projects`.
- Partial unique index satu kontrak aktif per project.
- Tabel/kolom baru: `project_templates`, `projects.template_id`, `invitations`, FK `applications.invitation_id`. Setting baru: `invitation_expiry_days`, `matching_default_rating`.
- Belum: notifikasi, endpoint shortlist lamaran, upload `project_attachments`, kelola template oleh admin (Fase 6), job `invitation-expire` & project `CLOSED` saat deadline (Fase 5), buka ulang project setelah batal (Fase 6), urutan premium (Fase 7), daftar undangan milik mahasiswa (belum ada di `08-api-endpoints.md`).
- Keputusan: `DECISIONS.md` bagian Fase 2.

### Fase 4 — Mentor review + batas revisi

- Mulai Kerja membuka milestone 1 dan menugaskan mentor (keahlian kategori + beban review, kapasitas dikunci dengan row lock).
- Submit hasil kerja dengan file (private storage), mentor review (APPROVED / NEEDS_CHANGES), batas 3x pengembalian mentor → `ESCALATED` + alert `MENTOR_RETURN_LIMIT`, `fee_eligible` = true setelah review pertama.
- Review UMKM: batas 2 revisi (revisi ke-3 → 422), pengembalian mentor tidak dihitung revisi, approve membuka milestone berikutnya / menyelesaikan kontrak & project.
- Sengketa milestone setelah revisi habis → `ESCALATED` + alert `REVISION_LIMIT_DISPUTE`.
- Antrean review mentor, unduh file dengan cek akses, state machine terpusat untuk contract & submission, audit log setiap aksi review.
- Tabel baru: `admin_alerts`; kolom baru: `milestones.started_at`.
- Belum: notifikasi (modul notification belum ada), penjadwalan SLA mentor & reminder UMKM (Fase 5), endpoint admin untuk alert/eskalasi (Fase 6). Pencairan dana sudah tersambung di Fase 3.
- Keputusan: `DECISIONS.md` bagian Fase 4.
