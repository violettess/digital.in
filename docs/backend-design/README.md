# Desain Backend — Platform UMKM × Mahasiswa

Dokumen ini berisi diagram untuk membangun backend. Semua diagram ditulis dalam **Mermaid**, jadi tampil otomatis di GitHub, GitLab, Notion, Obsidian, dan VS Code. Bisa juga di-copy ke [mermaid.live](https://mermaid.live) untuk dilihat atau diekspor ke PNG/SVG.

## Isi

| File | Isi | Kapan dipakai |
|---|---|---|
| [01-arsitektur-sistem.md](01-arsitektur-sistem.md) | Modul backend, infrastruktur, layanan eksternal | Menyusun struktur folder/project |
| [02-use-case.md](02-use-case.md) | Aksi setiap aktor (UMKM, Mahasiswa, Mentor, Admin, Sistem) | Menentukan endpoint & hak akses |
| [03-erd.md](03-erd.md) | Skema database lengkap | Membuat migration |
| [04-state-diagram.md](04-state-diagram.md) | Status Project, Contract, Milestone, Escrow, Pembatalan, Payout | Membuat validasi transisi status |
| [05-sequence-diagram.md](05-sequence-diagram.md) | Alur lamaran, pembayaran, milestone, pembatalan, payout | Mengimplementasi logic tiap endpoint |
| [06-alur-keuangan-escrow.md](06-alur-keuangan-escrow.md) | Aliran dana, jurnal ledger, rumus & rekomendasi komisi mentor | Mengimplementasi modul keuangan |
| [07-scheduler-dan-notifikasi.md](07-scheduler-dan-notifikasi.md) | Job terjadwal, timer UMKM tidak merespons, daftar notifikasi | Mengimplementasi worker/cron |
| [08-api-endpoints.md](08-api-endpoints.md) | Daftar endpoint REST | Kontrak dengan tim frontend |

## Aturan Bisnis yang Sudah Dikunci

1. UMKM membayar penuh di awal → dana ditahan di escrow → dicairkan **per milestone** yang disetujui.
2. Mentor (senior/dosen) meninjau **setiap submission** sebelum ke UMKM dan dibayar komisi **per milestone**.
3. Revisi UMKM maksimal **2 kali per milestone**. Setelah 2 revisi habis, UMKM hanya bisa **Approve** atau **Ajukan Sengketa**. Pengembalian oleh mentor **tidak** dihitung sebagai revisi UMKM.
4. Pembatalan:
   - Sebelum pengerjaan dimulai (`AWAITING_PAYMENT` / `FUNDED`) → bisa dibatalkan langsung oleh UMKM atau mahasiswa, nilai project dikembalikan penuh (biaya gateway tidak dikembalikan).
   - Saat pengerjaan berjalan (`IN_PROGRESS`) → ajukan pembatalan → admin meninjau → dana dialokasikan **per milestone** ke mahasiswa atau UMKM.
5. Komisi platform 10–15% (default 12%), mentor mendapat bagian dari komisi tersebut (rekomendasi 30%, min Rp 10.000 — detail di file 06).
6. **Komisi dipotong dari bagian mahasiswa** — UMKM membayar sesuai harga yang disepakati.
7. **Biaya payment gateway ditanggung UMKM.**
8. **Mahasiswa mengusulkan pembagian milestone** di lamaran (default dari template). Terkunci setelah UMKM menerima lamaran.
9. **Satu project = satu mahasiswa**, milestone dikerjakan **berurutan**.
10. **Mentor tetap dibayar walau milestone dibatalkan**, asalkan mentor sudah menyelesaikan minimal satu review di milestone tersebut. Biayanya ditanggung platform.
11. **Mahasiswa membatalkan setelah dana masuk (belum mulai)** → dana dikembalikan penuh ke UMKM. UMKM bisa membuka ulang project dan memilih mahasiswa lain (bayar ulang).
12. **Mentor maksimal mengembalikan pekerjaan 3 kali per milestone.** Pengembalian ke-3 otomatis membuat milestone `ESCALATED` dan memberi alert ke admin.
13. **Mahasiswa maksimal punya 2 kontrak aktif** (`AWAITING_PAYMENT`, `FUNDED`, `IN_PROGRESS`, `CANCELLATION_REQUESTED`). Dicek saat apply, saat menerima undangan, dan sekali lagi saat UMKM menerima lamaran.
14. **Minimum penarikan saldo Rp 20.000.** Biaya transfer ditanggung penarik (dipotong dari jumlah yang ditarik).
15. **Premium listing Rp 50.000 berlaku 30 hari.**
16. **Pengerjaan dimulai hanya saat mahasiswa klik *Mulai Kerja*.** Tidak ada auto-start. Selama belum diklik, kontrak tetap `FUNDED` dan masih bisa dibatalkan langsung.
17. **UMKM tidak merespons hasil kerja:**
    - Reminder otomatis H+3, H+7, H+10.
    - H+14: admin mendapat alert dan wajib **follow up** UMKM (telepon/WA), lalu mencatatnya di sistem.
    - Setelah follow up, UMKM diberi **batas waktu 7 hari** dan masih bisa approve/minta revisi seperti biasa.
    - Jika batas waktu lewat dan UMKM tetap diam → milestone `ESCALATED` → **admin yang memutuskan**. Tidak ada auto-approve.
18. **Biaya payment gateway tidak dikembalikan** saat refund. Yang dikembalikan hanya nilai project yang masih ditahan escrow.
19. **Hanya mahasiswa yang menilai mentor.** UMKM menilai mahasiswa, mahasiswa menilai UMKM dan mentor.

## Rekomendasi Tambahan (Belum Dikonfirmasi)

**Mahasiswa sudah dibayar tapi tidak klik *Mulai Kerja*.** Karena tidak ada auto-start, dana UMKM bisa tertahan terlalu lama. Usulan:
- Reminder ke mahasiswa 24 jam dan 72 jam setelah `FUNDED`.
- Hari ke-7 belum mulai → beri tahu UMKM bahwa ia bisa membatalkan langsung dengan refund penuh, dan buat alert admin `STUDENT_NOT_STARTED`.

## Smart Matching (Rule-Based, MVP)

Skor 0–100 untuk setiap mahasiswa terverifikasi yang punya skill di kategori project:

| Faktor | Bobot |
|---|---:|
| Skill di kategori yang sama (level ADVANCED = penuh) | 35 |
| Rating rata-rata | 25 |
| Kota sama dengan UMKM | 15 |
| Tingkat penyelesaian kontrak | 15 |
| Ketersediaan: 0 kontrak aktif = 10, 1 kontrak aktif = 5 | 10 |

Mahasiswa yang sudah punya 2 kontrak aktif **tidak dimasukkan** ke rekomendasi. Mahasiswa baru tanpa rating diberi nilai rating default (misal 3,5) agar tetap punya kesempatan muncul.

## Nilai di `platform_settings`

| Key | Nilai |
|---|---|
| `platform_fee_pct` | 12 |
| `mentor_share_pct` | 30 |
| `mentor_min_fee` | 10000 |
| `min_milestone_amount` | 150000 |
| `max_revisions_per_milestone` | 2 |
| `max_mentor_returns_per_milestone` | 3 |
| `max_active_contracts_per_student` | 2 |
| `min_withdrawal_amount` | 20000 |
| `withdrawal_fee` | sesuai tarif disbursement gateway yang dipilih |
| `premium_listing_price` | 50000 |
| `premium_listing_days` | 30 |
| `payment_expiry_hours` | 24 |
| `start_reminder_hours` | 24, 72 |
| `student_not_started_alert_days` | 7 |
| `mentor_sla_hours` | 48 |
| `umkm_review_reminder_days` | 3, 7, 10 |
| `umkm_unresponsive_alert_days` | 14 |
| `umkm_followup_deadline_days` | 7 (dihitung sejak admin mencatat follow up) |
| `admin_followup_sla_days` | 2 (admin belum follow up → severity HIGH) |
| `cancellation_response_days` | 3 |
| `invitation_expiry_days` | 3 (job `invitation-expire` di file 07) |
| `matching_default_rating` | 3.5 (rating & tingkat penyelesaian default untuk mahasiswa baru di smart matching) |
| `mentor_overdue_alert_hours` | 72 (alert admin `MENTOR_OVERDUE`) |
| `milestone_due_reminder_days_before` | 2 (reminder H-2 due date milestone) |
| `student_overdue_alert_days` | 3 (alert `STUDENT_OVERDUE` H+3 lewat due date) |
| `premium_reminder_days_before` | 3 (tawarkan perpanjangan premium listing) |

## Urutan Implementasi yang Disarankan

1. Auth + profil + verifikasi
2. Project + lamaran + kontrak + milestone (tanpa uang dulu, status diubah manual)
3. **Ledger + escrow + webhook pembayaran** (paling kritis, kerjakan dengan teliti dan banyak tes)
4. Mentor review + batas revisi
5. Scheduler (reminder & eskalasi)
6. Pembatalan + panel admin
7. Payout, sertifikat, rating, chat, premium listing
