# 05 — Sequence Diagram

Alur utama dari awal sampai akhir, dipecah menjadi 6 bagian.

---

## 0. Auth & Verifikasi

```mermaid
sequenceDiagram
    autonumber
    actor U as UMKM
    actor S as Mahasiswa
    actor T as Mentor
    actor A as Admin
    participant API as Backend API
    participant DB as Database
    participant WA as Meta WhatsApp Cloud API
    participant Mail as Email

    U->>API: POST /auth/otp/send (phone)
    API->>DB: simpan hash OTP, expires_at = sekarang + 5 menit
    API->>WA: kirim template OTP
    U->>API: POST /auth/otp/verify (phone, code)
    API->>DB: lock OTP, cek expiry dan attempt_count < 5
    API-->>U: verification_token sekali pakai, TTL 5 menit
    U->>API: POST /auth/register/umkm (phone, verification_token, business_name, password)
    API->>DB: konsumsi proof, buat user/profile, status ACTIVE
    API-->>U: access token 15 menit + refresh token 30 hari

    S->>API: POST /auth/register/student (email, university_id, campus_email opsional)
    API->>DB: buat user/profile PENDING_VERIFICATION
    opt campus_email tersedia
        API->>Mail: tautan signed sekali pakai, berlaku 60 menit
        S->>API: GET /auth/email/verify/{profile}/{hash}
        API->>DB: profile VERIFIED, user ACTIVE
    end
    opt campus_email tidak tersedia
        S->>API: POST /students/me/verification (KTM PDF/JPG/PNG, maks 5 MB)
        API->>DB: simpan file private, profil tetap PENDING
        A->>API: POST /admin/verifications/{id}/approve atau /reject (type=STUDENT_KTM)
        API->>DB: state machine profil/user, tulis audit log
    end

    T->>API: POST /auth/register/mentor
    API->>DB: buat akun dan profil PENDING_VERIFICATION
    A->>API: POST /admin/verifications/{id}/approve atau /reject (type=MENTOR)
    API->>DB: state machine profil/user, tulis audit log
```

---

## 1. Posting Project → Lamaran → Kontrak

```mermaid
sequenceDiagram
    autonumber
    actor U as UMKM
    actor M as Mahasiswa
    participant API as Backend API
    participant MT as Matching
    participant DB as Database
    participant N as Notification

    U->>API: POST /projects (kategori, deskripsi, budget, deadline)
    API->>DB: simpan project status DRAFT
    U->>API: POST /projects/{id}/publish
    API->>DB: status OPEN
    API->>MT: hitung rekomendasi talent
    MT->>DB: ambil mahasiswa VERIFIED dengan skill kategori ini
    MT-->>API: daftar mahasiswa + match_score
    API-->>U: project terpublikasi + rekomendasi talent

    opt UMKM mengundang mahasiswa
        U->>API: POST /projects/{id}/invitations
        API->>N: kirim undangan ke mahasiswa
    end

    M->>API: POST /projects/{id}/applications (proposal, harga, usulan milestone)
    API->>DB: hitung kontrak aktif mahasiswa
    alt sudah punya 2 kontrak aktif
        API-->>M: 422 batas 2 proyek aktif tercapai
    end
    API->>API: validasi total milestone = harga penawaran, tiap milestone minimal Rp 150.000
    API->>DB: simpan application PENDING
    API->>N: notifikasi lamaran masuk ke UMKM

    U->>API: POST /applications/{id}/accept
    API->>DB: BEGIN TRANSACTION
    API->>DB: lock student_profile, hitung ulang kontrak aktif
    alt mahasiswa sudah punya 2 kontrak aktif
        API->>DB: ROLLBACK
        API-->>U: 409 mahasiswa sedang penuh, pilih pelamar lain
    end
    API->>DB: application ACCEPTED, lamaran lain REJECTED
    API->>DB: buat contract AWAITING_PAYMENT + snapshot fee
    API->>DB: buat milestones status LOCKED
    API->>DB: buat escrow PENDING_FUNDING
    API->>DB: project ASSIGNED
    API->>DB: COMMIT
    API->>N: notifikasi ke mahasiswa diterima dan lamaran lain ditolak
    API-->>U: contract_id, lanjut ke pembayaran
```

---

## 2. Pembayaran Escrow (Funding)

```mermaid
sequenceDiagram
    autonumber
    actor U as UMKM
    participant API as Backend API
    participant DB as Database
    participant PG as Payment Gateway
    participant L as Ledger
    participant N as Notification
    participant J as Scheduler

    U->>API: POST /contracts/{id}/payments
    API->>DB: buat payment PENDING, expires 24 jam
    API->>PG: create charge (VA / QRIS / e-wallet)
    PG-->>API: payment_url, gateway_ref
    API->>J: jadwalkan job expire-payment 24 jam
    API-->>U: tampilkan instruksi bayar

    U->>PG: bayar
    PG->>API: webhook payment.paid (gateway_ref)
    API->>API: verifikasi signature webhook
    API->>DB: simpan webhook log

    alt gateway_ref sudah diproses
        API-->>PG: 200 OK, abaikan (idempotent)
    else belum diproses
        API->>DB: BEGIN TRANSACTION + lock contract
        API->>DB: payment PAID
        API->>L: jurnal ESCROW_FUNDED
        API->>DB: escrow HELD, contract FUNDED
        API->>DB: COMMIT
        API->>N: notifikasi ke UMKM dan mahasiswa dana aman di escrow
        API->>J: jadwalkan reminder Mulai Kerja 24 jam dan 72 jam, cek hari ke-7
        API-->>PG: 200 OK
    end

    opt tidak dibayar dalam 24 jam
        J->>API: job expire-payment
        API->>DB: payment EXPIRED, contract CANCELLED
        API->>DB: project kembali OPEN
        API->>N: notifikasi ke UMKM dan mahasiswa
    end
```

---

## 3. Pengerjaan Milestone: Submit → Mentor → UMKM → Pencairan

```mermaid
sequenceDiagram
    autonumber
    actor M as Mahasiswa
    actor T as Mentor
    actor U as UMKM
    participant API as Backend API
    participant DB as Database
    participant L as Ledger
    participant N as Notification
    participant J as Scheduler

    M->>API: POST /contracts/{id}/start
    API->>DB: contract IN_PROGRESS, milestone 1 IN_PROGRESS
    API->>API: assign mentor sesuai kategori dan beban review
    API->>N: notifikasi UMKM pengerjaan dimulai

    loop setiap submission
        M->>API: POST /milestones/{id}/submissions (file, catatan)
        API->>DB: simpan submission version N, milestone MENTOR_REVIEW
        API->>N: notifikasi mentor
        API->>J: jadwalkan SLA mentor 48 jam

        T->>API: POST /submissions/{id}/mentor-review
        API->>DB: mentor_assignment fee_eligible = true
        alt mentor NEEDS_CHANGES ke-1 atau ke-2
            API->>DB: mentor_return_count +1, milestone IN_PROGRESS, revision_count tetap
            API->>N: feedback mentor ke mahasiswa
        else mentor NEEDS_CHANGES ke-3
            API->>DB: milestone ESCALATED
            API->>N: admin_alert MENTOR_RETURN_LIMIT
            API->>N: info ke mahasiswa bahwa admin akan meninjau
        else mentor APPROVED
            API->>DB: milestone CLIENT_REVIEW, catat client_review_started_at
            API->>N: notifikasi UMKM hasil siap direview
            API->>J: jadwalkan reminder H+3, H+7, H+10, alert admin H+14

            U->>API: POST /submissions/{id}/client-review
            alt UMKM minta revisi dan revision_count di bawah 2
                API->>DB: revision_count +1, milestone IN_PROGRESS
                API->>J: batalkan reminder
                API->>N: notifikasi mahasiswa ada revisi
            else UMKM minta revisi tapi sudah 2 kali
                API-->>U: 422 batas revisi habis, pilih Approve atau Ajukan Sengketa
            else UMKM approve
                API->>J: batalkan reminder
                API->>DB: BEGIN TRANSACTION + lock escrow
                API->>DB: milestone APPROVED
                API->>L: jurnal MILESTONE_RELEASE: mahasiswa, mentor, platform
                API->>DB: simpan milestone_settlement, update escrow
                API->>DB: buka milestone berikutnya IN_PROGRESS
                API->>DB: COMMIT
                API->>N: notifikasi mahasiswa dan mentor saldo masuk
            end
        end
    end

    Note over U,J: Jika UMKM diam, lihat alur follow up admin di bagian 6
    Note over API,DB: Jika milestone terakhir APPROVED
    API->>DB: contract COMPLETED, project COMPLETED, escrow RELEASED
    API->>DB: terbitkan certificate + portfolio_item terverifikasi
    API->>N: minta UMKM dan mahasiswa memberi rating
```

---

## 4. Pembatalan

```mermaid
sequenceDiagram
    autonumber
    actor P as Pengaju (UMKM / Mahasiswa)
    actor O as Pihak Lain
    actor A as Admin
    participant API as Backend API
    participant DB as Database
    participant L as Ledger
    participant PG as Payment Gateway
    participant N as Notification

    P->>API: POST /contracts/{id}/cancellations (alasan, bukti)
    API->>DB: cek status kontrak

    alt status AWAITING_PAYMENT
        API->>DB: contract CANCELLED, batalkan tagihan
        API->>N: notifikasi pihak lain
    else status FUNDED, belum mulai
        API->>DB: contract CANCELLED, cancellation type DIRECT
        API->>L: jurnal REFUND nilai project ke UMKM, tanpa biaya gateway
        API->>PG: request refund
        API->>N: notifikasi pihak lain
    else status IN_PROGRESS
        API->>DB: cancellation_request PENDING, contract CANCELLATION_REQUESTED
        API->>DB: bekukan milestone dan timer review
        API->>N: minta tanggapan pihak lain, batas 3 hari
        API->>N: buat admin_alert CANCELLATION_REQUEST
        O->>API: POST /cancellations/{id}/responses
        A->>API: GET /admin/cancellations/{id} (chat, submission, riwayat review)

        alt admin menolak
            A->>API: POST /admin/cancellations/{id}/reject
            API->>DB: contract kembali IN_PROGRESS, timer dilanjutkan
        else admin menyetujui
            A->>API: POST /admin/cancellations/{id}/approve (alokasi per milestone)
            API->>API: validasi total alokasi = held_amount escrow
            API->>DB: BEGIN TRANSACTION
            API->>L: jurnal release bagian mahasiswa + komisi platform
            API->>L: jurnal refund bagian UMKM
            API->>L: jurnal fee mentor yang fee_eligible, dari komisi atau ditanggung platform
            API->>DB: buat milestone_settlement per milestone
            API->>DB: contract TERMINATED, escrow SETTLED, milestone sisa CANCELLED
            API->>DB: COMMIT
            API->>PG: request refund bagian UMKM
        end
        API->>N: notifikasi hasil keputusan ke kedua pihak
    else status COMPLETED, CANCELLED, TERMINATED
        API-->>P: 409 kontrak tidak bisa dibatalkan
    end
```

---

## 5. Penarikan Saldo (Payout)

```mermaid
sequenceDiagram
    autonumber
    actor M as Mahasiswa / Mentor
    participant API as Backend API
    participant DB as Database
    participant L as Ledger
    participant DS as Disbursement API

    M->>API: POST /wallet/withdrawals (amount, bank_account_id)
    API->>DB: cek saldo cukup dan amount minimal Rp 20.000
    API->>API: hitung fee transfer, net_amount = amount - fee
    alt amount di bawah Rp 20.000 atau saldo kurang
        API-->>M: 422 penarikan ditolak
    end
    API->>DB: BEGIN TRANSACTION + lock wallet
    API->>L: jurnal WITHDRAWAL, saldo dikunci
    API->>DB: payout REQUESTED
    API->>DB: COMMIT
    API->>DS: create disbursement senilai net_amount
    API->>DB: payout PROCESSING

    DS->>API: webhook disbursement
    alt sukses
        API->>DB: payout SUCCESS
    else gagal
        API->>L: jurnal reversal, saldo kembali
        API->>DB: payout FAILED
    end
    API-->>M: notifikasi status penarikan
```

---

## 6. UMKM Tidak Merespons → Follow Up Admin → Keputusan Admin

```mermaid
sequenceDiagram
    autonumber
    actor U as UMKM
    actor A as Admin
    actor M as Mahasiswa
    participant J as Scheduler
    participant API as Backend API
    participant DB as Database
    participant L as Ledger
    participant N as Notification

    J->>API: job H+3, H+7, H+10
    API->>N: reminder ke UMKM via WhatsApp + in-app

    J->>API: job H+14
    API->>DB: cek milestone masih CLIENT_REVIEW
    API->>DB: buat admin_alert UMKM_UNRESPONSIVE status OPEN
    API->>N: notifikasi admin
    API->>J: jadwalkan cek SLA follow up admin 2 hari

    A->>U: follow up via telepon / WA
    A->>API: POST /admin/alerts/{id}/follow-ups (channel, outcome, catatan)
    API->>DB: simpan alert_follow_up, alert FOLLOWED_UP
    API->>DB: follow_up_deadline = sekarang + 7 hari
    API->>J: jadwalkan job follow-up-deadline
    API->>N: info ke mahasiswa bahwa admin sedang menindaklanjuti

    alt UMKM merespons sebelum deadline
        U->>API: POST /submissions/{id}/client-review
        API->>DB: proses seperti biasa, alert RESOLVED
        API->>J: batalkan job follow-up-deadline
    else deadline lewat tanpa respons
        J->>API: job follow-up-deadline
        API->>DB: milestone ESCALATED, alert AWAITING_DECISION
        API->>N: notifikasi admin harus memutuskan

        A->>API: GET /admin/alerts/{id} (submission, review mentor, chat, riwayat follow up)
        alt hasil kerja layak
            A->>API: POST /admin/milestones/{id}/force-approve
            API->>DB: milestone APPROVED, approved_via ADMIN_FORCE
            API->>L: jurnal MILESTONE_RELEASE
        else perlu perbaikan
            A->>API: POST /admin/milestones/{id}/return-to-student
            API->>DB: milestone IN_PROGRESS
        else hentikan kontrak
            A->>API: POST /admin/contracts/{id}/terminate (alokasi per milestone)
            API->>DB: proses seperti pembatalan yang disetujui admin
        end
        API->>DB: alert RESOLVED + audit log
        API->>N: notifikasi keputusan ke UMKM dan mahasiswa
    end
```
