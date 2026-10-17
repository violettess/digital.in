# Keputusan Desain (di luar dokumen utama)

Keputusan yang diambil saat implementasi karena dokumen desain tidak menjawab. Bisa direvisi pemilik proyek.

## Audit kode vs desain

| # | Hal | Keputusan | Alasan |
|---|---|---|---|
| DA-1 | Arti kolom `student_id` / `mentor_id` / `umkm_id` | Berisi **users.id** di projects, applications, invitations, contracts, milestones, mentor_assignments, certificates, ratings, conversations. Berisi **\*_profiles.id** hanya di `student_skills`, `mentor_expertises`, `portfolio_items` | Mencatat penyimpangan dari ERD (relasi digambar ke tabel profil) agar join tidak salah |
| DA-2 | Hapus data keuangan | FK kontrak, milestone, escrow, wallet, ledger, settlement, payment = RESTRICT. User dengan riwayat transaksi tidak bisa dihapus, hanya di-suspend | Ledger adalah sumber kebenaran; tidak boleh hilang lewat cascade |
| DA-3 | Enum status | Ditegakkan di state machine aplikasi, belum ada CHECK constraint di DB | Semua perubahan status lewat state machine terpusat |
| DA-4 | `platform_settings.value` | Disimpan `jsonb` (bukan string) agar daftar seperti `[3, 7, 10]` terbaca apa adanya; kolom `description` ditambahkan | ERD menyebut string |
| DA-5 | Driver mock di production | Ditolak saat di-resolve (fail closed) | Mencegah escrow/payout palsu |
| DA-6 | Refresh token dipakai ulang | Semua refresh & access token user dicabut + audit `REFRESH_TOKEN_REUSE_DETECTED` | Deteksi pencurian token |

## Fase 7 — Payout, sertifikat, rating, chat, premium listing

| # | Hal | Keputusan | Alasan |
|---|---|---|---|
| D7-1 | Disbursement | Antarmuka `DisbursementGateway` + driver `mock` (validasi rekening selalu lolos, transfer PROCESSING lalu webhook). Secret webhook terpisah `DISBURSEMENT_WEBHOOK_SECRET`, fail closed | Gateway belum dipilih; Batas Keamanan |
| D7-2 | Biaya transfer | `withdrawal_fee` di setting jika diisi; jika null mengikuti tarif gateway per kanal (mock: BANK 2.500, EWALLET 1.000) | README: "sesuai tarif disbursement gateway yang dipilih" |
| D7-3 | Jurnal payout | Request: Wallet (D) / Payout Clearing (K net) / Biaya Transfer Payable (K fee), saldo langsung berkurang + `pending_withdrawal`. Gagal: jurnal reversal. Sukses: hanya `pending_withdrawal` dilepas | 06 bagian 3d; sequence 5 |
| D7-4 | Rekening | `account_number` dienkripsi (cast `encrypted`), kolom teknis `account_number_last4` untuk tampilan; maks 5 rekening; rekening pertama otomatis primary; penarikan wajib rekening terverifikasi milik sendiri | Data sensitif |
| D7-5 | Banyak penarikan | Boleh lebih dari satu penarikan berjalan selama saldo cukup (saldo dikunci per penarikan dengan row lock) | Tidak dibatasi dokumen |
| D7-6 | Sertifikat | Diterbitkan otomatis saat kontrak COMPLETED (transaksi yang sama), `verification_code` acak 40 karakter. **PDF belum dibuat** (`pdf_url` null) karena belum ada library PDF | Menambah dependency perlu persetujuan |
| D7-7 | Portofolio terverifikasi | Judul & deskripsi dari project, `media_urls` kosong (file hasil kerja private); `completed_contracts_count` +1 | File submission tidak boleh otomatis dipublikasikan |
| D7-8 | Rating | Body `target` STUDENT/UMKM/MENTOR; mentor wajib pernah mereview kontrak itu (`review_count` > 0); satu rating per (kontrak, penilai, yang dinilai); tidak ada batas waktu; `rating_avg` dihitung ulang per arah rating | README aturan 19; ERD |
| D7-9 | Percakapan | Dibuat otomatis saat lamaran / undangan (unik per project + mahasiswa), `contract_id` diisi saat lamaran diterima. Endpoint baru `GET /conversations` | Frontend butuh cara menemukan ID percakapan; ERD contract_id nullable "sebelum kontrak" |
| D7-10 | Deteksi pesan | Regex nomor HP Indonesia, email, tautan WA/Telegram/LINE, kata kunci transaksi di luar platform. Pesan tetap terkirim, `is_flagged` + peringatan; admin melihat chat di detail pembatalan | ERD `is_flagged`; tidak memblokir komunikasi |
| D7-11 | Realtime | Event `MessageSent` (ShouldBroadcast) di private channel `conversation.{id}`, otorisasi lewat `POST /api/broadcasting/auth` (Sanctum). Server WebSocket (Reverb/Pusher) belum dipasang; `BROADCAST_CONNECTION` default log/null | Menambah server WebSocket perlu keputusan infrastruktur |
| D7-12 | Premium listing | Hanya project OPEN; tagihan PENDING yang sama dikembalikan (double click); membeli saat masih aktif = perpanjangan mulai `ends_at` periode aktif; tagihan gagal/kedaluwarsa → EXPIRED; dibayar terlambat → refund otomatis. Jurnal PREMIUM_LISTING ke Pendapatan Platform | ERD; 07 premium-reminder/expire |
| D7-13 | Setting baru | `premium_reminder_days_before` = 3 | Angka di file 07 belum ada di setting |
| D7-14 | Project selesai/batal saat premium aktif | Premium tetap berjalan sampai `ends_at`, tidak di-refund; daftar project hanya menampilkan OPEN | Tidak dibahas dokumen |

## Fase 6 — Pembatalan + panel admin

| # | Hal | Keputusan | Alasan |
|---|---|---|---|
| D6-1 | Project setelah batal langsung | Mahasiswa membatalkan → project OPEN. UMKM membatalkan → CANCELLED, kecuali `reopen_project = true` → OPEN | README 11 & state diagram project (ASSIGNED → OPEN bila UMKM pilih buka ulang) |
| D6-2 | Tagihan saat batal di AWAITING_PAYMENT | Payment PENDING → EXPIRED. Jika tetap dibayar, webhook mencatat PAID lalu me-refund otomatis | Tidak ada status "dibatalkan" di ERD payments |
| D6-3 | Kapan admin boleh memutuskan | Approve/reject hanya setelah pihak lain menanggapi **atau** `response_due_at` (3 hari) lewat; selain itu 422. Job `cancellation-response` memindahkan alert ke AWAITING_DECISION | 04 bagian 5: batas tanggapan 3 hari |
| D6-4 | Tanggapan pihak lain | Sekali, selama PENDING (boleh setelah 3 hari selama admin belum memutuskan) | Tidak dibahas dokumen |
| D6-5 | Milestone saat TERMINATED | Semua milestone yang belum APPROVED → CANCELLED lewat `MilestoneStateMachine::cancelForTermination` (catatan di state diagram) | Sequence 4: "milestone sisa CANCELLED"; diagram hanya punya ESCALATED → CANCELLED |
| D6-6 | Jeda timer | Kolom teknis `milestones.client_review_paused_seconds`; saat ditolak/ditarik ditambah durasi jeda dan `follow_up_deadline` digeser. Kunci siklus reminder tetap `client_review_started_at` sehingga reminder yang sudah terkirim tidak terulang | Lanjutan D5-4 |
| D6-7 | Submission saat keputusan admin | RETURNED_BY_MENTOR → PENDING_CLIENT (teruskan ke UMKM) / ACCEPTED (force approve); PENDING_CLIENT → REVISION_REQUESTED (return to student, tanpa menambah `revision_count`). Keputusan admin dicatat di `submission_reviews` dengan `reviewer_role` ADMIN | Lanjutan D4-5 |
| D6-8 | Jurnal alokasi pembatalan | Per milestone: `MILESTONE_RELEASE` untuk bagian mahasiswa (dipotong komisi) dan `REFUND` untuk bagian UMKM. Fee mentor (dari nilai **penuh** milestone) dicatat di transaksi pertama; jika seluruhnya di-refund, platform yang menanggung (sesuai contoh 06 bagian 3c). Satu `milestone_settlement` per milestone | 06 bagian 3c & 4 |
| D6-9 | Terminasi oleh admin | `POST /admin/contracts/{id}/terminate` membuat `cancellation_request` dengan `requester_role` ADMIN, kontrak IN_PROGRESS → CANCELLATION_REQUESTED → TERMINATED dalam satu transaksi | State diagram kontrak hanya punya jalur TERMINATED lewat CANCELLATION_REQUESTED |
| D6-10 | Refund lewat gateway | Baris `refunds` dibuat di transaksi keputusan; panggilan gateway dijalankan `ProcessRefundJob` setelah commit. Sukses → jurnal UMKM Refund Payable (D) / Gateway Clearing (K); payment REFUNDED hanya jika seluruh nilai project dikembalikan. Gagal → refund FAILED, admin diberi tahu, saldo tetap di payable. Driver mock langsung SUCCESS | Panggilan jaringan tidak boleh di dalam transaksi DB |
| D6-11 | Status alert non-UMKM_UNRESPONSIVE | OPEN → AWAITING_DECISION / RESOLVED, AWAITING_DECISION → RESOLVED. Keputusan admin menutup semua alert terkait milestone/kontrak/pembatalan | Diagram 7 khusus UMKM tidak merespons |
| D6-12 | Pembayaran terlambat | Payment EXPIRED/FAILED → PAID diizinkan saat webhook PAID masuk; kontrak masih AWAITING_PAYMENT → escrow didanai, kontrak sudah batal → refund otomatis | Uang yang benar-benar masuk tidak boleh diabaikan (menutup blocker Fase 3) |
| D6-13 | Wallet UMKM_REFUND | Milik UMKM (`user_id` UMKM), tidak boleh negatif | Payable per UMKM |
| D6-14 | Ganti mentor | Hanya untuk milestone IN_PROGRESS/MENTOR_REVIEW/ESCALATED; mentor pengganti otomatis tidak boleh mentor lama; mentor pilihan admin wajib ACTIVE + VERIFIED + punya kapasitas. SLA mentor dihitung ulang sejak penugasan baru | 04 bagian 3 |
| D6-15 | Suspend | Akun ADMIN tidak bisa di-suspend lewat API; semua token Sanctum & refresh token dicabut. Kontrak berjalan milik user yang di-suspend tidak diubah otomatis (ditangani admin lewat terminasi) | Mencegah admin terkunci; dampak kontrak butuh keputusan manusia |
| D6-16 | Setting | Hanya key di README, divalidasi per key (komisi 10–15%, `mentor_overdue_alert_hours` > `mentor_sla_hours`). Audit log memakai nil UUID sebagai `entity_id` karena `platform_settings` ber-PK string | Audit log wajib untuk keputusan admin |
| D6-17 | Bukti pembatalan | `evidence_urls[]` berupa URL https (maks 10), belum upload file | ERD menyimpan URL |

## Fase 5 — Scheduler (reminder & eskalasi)

| # | Hal | Keputusan | Alasan |
|---|---|---|---|
| D5-1 | Arsitektur | Delayed job `ScheduledCheckJob` dijadwalkan saat event + cron harian `scheduler:sweep`; keduanya memanggil `SchedulerChecks` yang mengecek ulang status & waktu | 07 bagian 1 |
| D5-2 | Sekali jalan | Tabel teknis baru `scheduler_action_logs` (`action_key` UNIQUE, `insertOrIgnore` di transaksi yang sama dengan aksinya) | Job + cron bisa berjalan berulang; tidak boleh mengirim reminder ganda |
| D5-3 | Membatalkan reminder | Tidak menghapus job; job yang basi tidak berbuat apa-apa karena status/siklus (`client_review_started_at`) berubah | Lebih aman daripada melacak ID job di queue |
| D5-4 | Jeda saat `CANCELLATION_REQUESTED` | Semua timer milestone dilewati selama kontrak bukan `IN_PROGRESS`. Penggeseran waktu saat kontrak kembali `IN_PROGRESS` dikerjakan di fase pembatalan | 07 bagian 2: timer dijeda |
| D5-5 | Setting baru | `mentor_overdue_alert_hours` 72, `milestone_due_reminder_days_before` 2, `student_overdue_alert_days` 3 | Angka di file 07 belum ada di `platform_settings` |
| D5-6 | Zona waktu | Aturan berbasis tanggal memakai `config('app.business_timezone')` = Asia/Jakarta; timestamp tetap UTC | Due date "H-2 / H+0" harus mengikuti hari kalender pengguna |
| D5-7 | `student-not-started` | Diimplementasikan sesuai rekomendasi README (belum dikonfirmasi): hari ke-7 → notifikasi UMKM + alert `STUDENT_NOT_STARTED` MEDIUM | Steering: pakai rekomendasi jika belum dijawab |
| D5-8 | Milestone tanpa mentor | Alert `MENTOR_OVERDUE` langsung pada batas `mentor_sla_hours` (tidak ada mentor untuk diingatkan) | Lanjutan D4-2 |
| D5-9 | Auto-resolve alert | `MENTOR_OVERDUE` → RESOLVED saat mentor mereview; `UMKM_UNRESPONSIVE` (OPEN/FOLLOWED_UP) → RESOLVED saat UMKM approve/minta revisi | 04 bagian 7: UMKM merespons → RESOLVED |
| D5-10 | Follow up | `POST /admin/alerts/{id}/follow-ups` dibuat di fase ini (memulai timer 7 hari), hanya untuk `UMKM_UNRESPONSIVE`. `assigned_to` diisi admin pertama yang follow up. Daftar/detail alert & keputusan admin tetap Fase 6 | Rantai eskalasi scheduler butuh titik awal follow up |
| D5-11 | Project lewat deadline | OPEN → CLOSED saat hari deadline berakhir (WIB); lamaran terbuka → REJECTED, undangan PENDING → EXPIRED | 04 bagian 1: "deadline lewat tanpa kontrak" |
| D5-12 | Penerima notifikasi admin | Semua user ADMIN yang ACTIVE (alert belum di-assign) | ERD `admin_alerts.assigned_to` nullable |
| D5-13 | Kanal eksternal | `NotificationChannelSender` dengan driver log (mock). Notifikasi in-app = baris `notifications`; `sent_at` diisi setelah kanal eksternal terkirim | Batas Keamanan: layanan eksternal pakai mock |
| D5-14 | Event notifikasi yang dipasang | Lamaran masuk/diterima/ditolak, undangan, pembayaran sukses/expired, pengerjaan dimulai, submission perlu review, mentor mengembalikan (ke-1/2/3), hasil siap direview, revisi diminta, milestone disetujui, sengketa, semua reminder & eskalasi di atas | 07 bagian 3; sisanya (pembatalan, sertifikat, payout, premium) ikut fasenya |

## Fase 3 — Ledger + escrow + webhook pembayaran

| # | Hal | Keputusan | Alasan |
|---|---|---|---|
| D3-1 | Gateway | Antarmuka `PaymentGateway` dengan driver `mock` (default, `payments.gateway = MOCK`). Driver Midtrans/Xendit ditambahkan setelah gateway dipilih | Gateway belum diputuskan; steering: layanan eksternal pakai mock |
| D3-2 | Signature webhook mock | HMAC-SHA256 atas raw body dengan `PAYMENT_WEBHOOK_SECRET`, header `X-Signature`. Secret kosong → 500 (fail closed). Signature salah → 401 `INVALID_SIGNATURE` | Sebelumnya dihitung dari JSON yang di-encode ulang dan ada fallback `dev_secret` |
| D3-3 | Tagihan dibuat sebelum webhook | `POST /contracts/{id}/payments` membuat payment PENDING + `gateway_ref`; webhook hanya mencari payment yang sudah ada. `gateway_ref` tak dikenal → 200 `IGNORED`, log disimpan | Sequence diagram bagian 2; mencegah webhook palsu membuat payment |
| D3-4 | Satu tagihan aktif | Jika ada payment PENDING, endpoint mengembalikan yang sama (200). Setelah FAILED boleh buat baru. `contracts.payment_due_at` diperbarui ke `expires_at` tagihan | Idempotent untuk double click; expiry dihitung dari tagihan (07 `expire-payment`) |
| D3-5 | Nominal webhook | PAID hanya diterima jika `gross_amount` = `amount + gateway_fee`; selain itu 422, escrow tidak didanai, log tetap `processed = false` untuk ditinjau | Mencegah escrow terdanai sebagian |
| D3-6 | Escrow HELD → RELEASED | Ditambahkan ke state diagram untuk kontrak satu milestone | Diagram hanya punya HELD → PARTIALLY_RELEASED |
| D3-7 | Pembulatan | Persentase → basis poin, `round half-up` integer: `intdiv(amount × bp + 5000, 10000)` | Tanpa float pada uang |
| D3-8 | Lebih dari satu mentor `fee_eligible` | Setiap mentor yang belum dibayar mendapat fee penuh; jika total > komisi, `platform_net` negatif (Pendapatan Platform di-debit) | 04 bagian 3: "selisihnya ditanggung platform" |
| D3-9 | Akun ledger | `ESCROW`, `WALLET` (STUDENT, MENTOR, PLATFORM_REVENUE, UMKM_REFUND), `GATEWAY_CLEARING`. Wallet sistem memakai `user_id` NULL dan boleh negatif; wallet user tidak | Jurnal di file 06 memakai Gateway Clearing |
| D3-10 | Dibayar setelah kontrak batal | Payment tetap PAID, escrow tidak didanai, dicatat di audit log `PAYMENT_RECEIVED_FOR_INACTIVE_CONTRACT`. Refund diproses di fase pembatalan/admin | Belum ada modul refund |
| D3-11 | Approval gagal dicairkan | Jika escrow tidak bisa mencairkan dana milestone, seluruh approval UMKM di-rollback (422) | Approve & pencairan wajib dalam satu transaksi |
| D3-12 | Simulasi dev | `POST /contracts/{id}/accept` (Fase 2) dihapus; diganti `php artisan payments:mock-pay {payment_id} [--status=PAID|FAILED|EXPIRED]` (mock + non-production saja) | Semua dana harus lewat ledger |
| D3-13 | `payments.checkout_url` | Kolom baru untuk URL/instruksi bayar dari gateway | Frontend perlu menampilkan ulang instruksi bayar |

## Fase 2 — Project + lamaran + kontrak + milestone

| # | Hal | Keputusan | Alasan |
|---|---|---|---|
| D2-1 | Skor skill per level | ADVANCED 35, INTERMEDIATE 2/3 (≈23,3), BEGINNER 1/3 (≈11,7) | README hanya menyebut "ADVANCED = penuh" |
| D2-2 | Data matching | Kota mahasiswa = `universities.city` (profil mahasiswa tidak punya kota, sama dengan pencarian talent). Kota UMKM = `projects.city`, fallback `umkm_profiles.city`. Tingkat penyelesaian = COMPLETED / (COMPLETED + TERMINATED); tanpa riwayat memakai `matching_default_rating / 5` (70%). Ketersediaan = 10 × (1 − aktif / batas) | README tidak merinci rumus |
| D2-3 | Status lamaran | `PENDING`/`SHORTLISTED` → `ACCEPTED` / `REJECTED` / `WITHDRAWN`, sisanya final. Belum ada endpoint shortlist | Tidak ada state diagram lamaran |
| D2-4 | Lamaran ganda | Ditolak (422) jika mahasiswa punya lamaran PENDING/SHORTLISTED/ACCEPTED/REJECTED di project yang sama. Setelah WITHDRAWN boleh melamar ulang | Mencegah spam ke UMKM |
| D2-5 | Validasi usulan milestone | Maks 10 milestone, `due_date` ≥ hari ini dan tidak mundur dari milestone sebelumnya | Milestone dikerjakan berurutan |
| D2-6 | Milestone default dari template | Jika `proposed_milestones` kosong dan project punya template: nominal = persentase × harga (dibulatkan ke bawah, sisa ke milestone terakhir), due date proporsional dari `estimated_days` | README aturan 8 |
| D2-7 | Kode error batas kontrak aktif | Apply & terima undangan → 422; UMKM menerima lamaran → 409 | Mengikuti sequence diagram bagian 1 |
| D2-8 | Alur undangan | Accept undangan hanya mengubah status; mahasiswa lalu mengirim lamaran biasa yang otomatis tertaut (`applications.invitation_id`) | ERD "converted to"; harga & milestone tetap diusulkan mahasiswa |
| D2-9 | Masa berlaku undangan | Setting baru `invitation_expiry_days` = 3. Undangan lewat batas ditandai EXPIRED saat diakses; job `invitation-expire` di Fase 5 | File 07 menyebut 3 hari, belum ada di daftar setting |
| D2-10 | `payment_due_at` | Diisi saat kontrak dibuat: sekarang + `payment_expiry_hours` | Kontrak AWAITING_PAYMENT batal jika tagihan expired 24 jam |
| D2-11 | Nomor kontrak | `CTR-YYYYMMDD-XXXXXXXX` (acak, UNIQUE) | Tidak ditentukan |
| D2-12 | Simulasi dana masuk | ~~`POST /contracts/{id}/accept`~~ — dihapus di Fase 3, diganti D3-12 | Fase 2 "status diubah manual" |
| D2-13 | Batal project | Lamaran PENDING/SHORTLISTED → REJECTED, undangan PENDING → EXPIRED | Tidak dibahas dokumen |
| D2-14 | Setting wajib | Angka bisnis dibaca lewat `PlatformSettingsService::int/number`, yang melempar error jika key tidak ada (tidak ada nilai cadangan diam-diam) | Mencegah komisi/batas salah |

## Fase 4 — Mentor review + batas revisi

| # | Hal | Keputusan | Alasan |
|---|---|---|---|
| D4-1 | Cara memilih mentor | Mentor `ACTIVE` + `VERIFIED` + `is_available`, beban (assignment `ACTIVE`) di bawah `max_active_reviews`. Urutan: punya keahlian di kategori project → beban paling sedikit → paling lama terdaftar. Jika tidak ada ahli kategori, mentor lain yang tersedia dipakai | Sequence diagram hanya menyebut "sesuai kategori dan beban review" |
| D4-2 | Tidak ada mentor tersedia | Mulai Kerja tetap berhasil, milestone `IN_PROGRESS` tanpa mentor. Penugasan dicoba ulang saat mahasiswa submit. Jika tetap kosong, milestone menunggu di `MENTOR_REVIEW` sampai admin menugaskan (endpoint `reassign-mentor`, fase admin) | Kekurangan mentor adalah masalah platform, tidak boleh memblokir mahasiswa |
| D4-3 | Kapan mentor ditugaskan | Setiap kali milestone `LOCKED → IN_PROGRESS` (milestone 1 saat Mulai Kerja, berikutnya saat milestone sebelumnya `APPROVED`) | Satu assignment per milestone, sesuai `mentor_assignments.milestone_id` |
| D4-4 | Status assignment setelah milestone `APPROVED` | `ACTIVE → DONE` | Enum ERD; membebaskan kapasitas mentor |
| D4-5 | Status submission | `PENDING_MENTOR → RETURNED_BY_MENTOR` (mentor NEEDS_CHANGES) / `PENDING_CLIENT` (mentor APPROVED) → `REVISION_REQUESTED` / `ACCEPTED`. Hanya submission versi terbaru yang bisa direview | ERD punya enum, state diagram tidak memetakan submission |
| D4-6 | File submission | Wajib 1–10 file, maks 20 MB/file, ekstensi gambar/dokumen/arsip/video umum. Disimpan di disk private `local`, path tidak diekspos; unduh lewat `GET /submissions/{id}/files/{file}` | ERD `SUBMISSIONS ||--|{ SUBMISSION_FILES` (minimal satu file). Endpoint unduh ditambahkan ke `08-api-endpoints.md` |
| D4-7 | Siapa boleh melihat file | Mahasiswa pemilik, mentor yang pernah ditugaskan di milestone itu, admin. UMKM hanya setelah submission lolos mentor | "Setiap submission melewati mentor dulu" |
| D4-8 | Feedback wajib | Wajib untuk mentor `NEEDS_CHANGES` dan UMKM `REVISION_REQUESTED` | Use case "kembalikan ke mahasiswa dengan feedback" |
| D4-9 | Sengketa | Boleh diajukan UMKM **atau** mahasiswa pihak kontrak, hanya saat `CLIENT_REVIEW` dan `revision_count >= max_revisions` (selain itu 422). Milestone `ESCALATED` + alert `REVISION_LIMIT_DISPUTE` severity MEDIUM. Alasan disimpan di `audit_logs.after_data` karena ERD tidak punya tabel sengketa | Endpoint mengizinkan dua role, state diagram hanya punya satu transisi sengketa |
| D4-10 | Severity alert `MENTOR_RETURN_LIMIT` | MEDIUM | Tidak disebut dokumen |
| D4-11 | Alert idempotent | Alert dengan tipe + referensi yang sama tidak dibuat ulang selama belum `RESOLVED` | Mencegah duplikat dari double request |
| D4-12 | Error 403 untuk mentor yang tidak ditugaskan | Dicek sebelum status (403 lebih dulu dari 409) | Konsisten dengan endpoint lain: kepemilikan dulu, baru status |
