# 04 — State Diagram (State Machine)

Ini bagian paling penting untuk backend. Setiap endpoint yang mengubah status **wajib** mengecek bahwa transisinya ada di diagram ini; jika tidak ada, tolak dengan `409 Conflict`.

## 0. Akun & Verifikasi Profil

```mermaid
stateDiagram-v2
    state "User status" as UserStatus {
        [*] --> PENDING_VERIFICATION
        PENDING_VERIFICATION --> ACTIVE : UMKM OTP valid / mahasiswa email kampus valid / admin menyetujui KTM atau mentor
        ACTIVE --> SUSPENDED : admin suspend (fase admin)
        SUSPENDED --> [*]
    }

    state "Profile verification_status" as ProfileVerification {
        [*] --> PENDING
        PENDING --> VERIFIED : verifikasi email kampus atau admin menyetujui KTM / mentor
        PENDING --> REJECTED : admin menolak KTM / mentor
        VERIFIED --> [*]
        REJECTED --> [*]
    }
```

Aturan fase auth: UMKM menjadi `ACTIVE` setelah nomor telepon terverifikasi OTP. Mahasiswa dengan email kampus menjadi `ACTIVE` setelah tautan verifikasi sekali pakai yang berlaku 60 menit dibuka; mahasiswa tanpa email kampus dan mentor menunggu keputusan admin. Status profil mahasiswa/mentor bergerak dari `PENDING` ke `VERIFIED` atau `REJECTED` hanya melalui state machine.

Access token berlaku 15 menit. Refresh token acak disimpan sebagai hash, berlaku 30 hari, dirotasi saat digunakan, dan token lama tidak dapat digunakan ulang.

---

## 1. Project

Project adalah "lowongan". Pengerjaan sebenarnya dilacak di **Contract**.

```mermaid
stateDiagram-v2
    [*] --> DRAFT : UMKM membuat project
    DRAFT --> OPEN : UMKM publish
    DRAFT --> CANCELLED : UMKM hapus

    OPEN --> ASSIGNED : UMKM menerima lamaran, kontrak dibuat
    OPEN --> CLOSED : deadline lewat tanpa kontrak
    OPEN --> CANCELLED : UMKM batalkan

    ASSIGNED --> OPEN : kontrak batal sebelum pengerjaan dimulai, UMKM pilih buka ulang
    ASSIGNED --> COMPLETED : kontrak COMPLETED
    ASSIGNED --> CANCELLED : kontrak CANCELLED atau TERMINATED

    COMPLETED --> [*]
    CANCELLED --> [*]
    CLOSED --> [*]
```

---

## 2. Contract (Siklus Pengerjaan)

Definisi **"pengerjaan sudah berjalan"** = kontrak berstatus `IN_PROGRESS`, yaitu **hanya** setelah mahasiswa menekan tombol **Mulai Kerja**. Tidak ada auto-start.

```mermaid
stateDiagram-v2
    [*] --> AWAITING_PAYMENT : UMKM terima lamaran

    AWAITING_PAYMENT --> FUNDED : webhook pembayaran sukses, dana masuk escrow
    AWAITING_PAYMENT --> CANCELLED : tagihan expired 24 jam, atau UMKM / mahasiswa batalkan

    FUNDED --> IN_PROGRESS : mahasiswa klik Mulai Kerja
    FUNDED --> CANCELLED : UMKM / mahasiswa batalkan langsung, nilai project dikembalikan ke UMKM

    IN_PROGRESS --> CANCELLATION_REQUESTED : UMKM / mahasiswa ajukan pembatalan
    IN_PROGRESS --> COMPLETED : milestone terakhir APPROVED

    CANCELLATION_REQUESTED --> IN_PROGRESS : admin tolak, atau pengaju menarik pengajuan
    CANCELLATION_REQUESTED --> TERMINATED : admin setujui, dana dialokasikan per milestone

    COMPLETED --> [*] : terbitkan sertifikat, buka rating
    CANCELLED --> [*]
    TERMINATED --> [*]

    note right of CANCELLATION_REQUESTED
        Semua aksi milestone dibekukan.
        Timer review UMKM dihentikan.
    end note
```

| Status | Bisa dibatalkan langsung? | Uang |
|---|---|---|
| `AWAITING_PAYMENT` | Ya | Belum ada |
| `FUNDED` | Ya | Nilai project dikembalikan penuh ke UMKM. Biaya gateway tidak dikembalikan |
| `IN_PROGRESS` | Tidak, harus ajukan ke admin | Dialokasikan admin per milestone. Mentor yang sudah review tetap dibayar |

Jika dibatalkan di `FUNDED` (oleh UMKM **atau** mahasiswa), dana dikembalikan ke UMKM. Project kembali `OPEN` jika UMKM memilih membuka ulang, dan UMKM membayar lagi saat menerima mahasiswa baru.

---

## 3. Milestone (dengan Mentor Review & Batas Revisi)

Aturan:
- Setiap submission **selalu** melewati mentor sebelum ke UMKM, termasuk submission hasil revisi.
- Mentor mengembalikan pekerjaan (`NEEDS_CHANGES`) **tidak** dihitung sebagai revisi UMKM.
- UMKM punya **maks 2 revisi per milestone**. Setelah revisi ke-2 disubmit, UMKM hanya bisa **Approve** atau **Ajukan Sengketa** ke admin.
- Jika UMKM tidak merespons di `CLIENT_REVIEW` selama 14 hari, admin mendapat alert dan wajib **follow up**. Milestone **tetap** `CLIENT_REVIEW` selama 7 hari setelah follow up, jadi UMKM masih bisa approve/minta revisi. Baru setelah batas itu lewat, milestone `ESCALATED` dan admin memutuskan (lihat `07-scheduler-dan-notifikasi.md`).
- Mentor maksimal mengembalikan pekerjaan **3 kali per milestone**. Pengembalian ke-3 membuat milestone `ESCALATED` dengan alert `MENTOR_RETURN_LIMIT`. Admin bisa memberi kesempatan tambahan, mengganti mentor, meneruskan hasil ke UMKM, atau memproses pembatalan.
- Begitu mentor menyelesaikan review pertama, `mentor_assignments.fee_eligible = true`. Mentor tetap dibayar walau milestone kemudian dibatalkan atau mentornya diganti.

```mermaid
stateDiagram-v2
    [*] --> LOCKED : kontrak dibuat

    LOCKED --> IN_PROGRESS : kontrak IN_PROGRESS dan milestone sebelumnya APPROVED

    IN_PROGRESS --> MENTOR_REVIEW : mahasiswa submit hasil

    MENTOR_REVIEW --> IN_PROGRESS : mentor NEEDS_CHANGES ke-1 atau ke-2, tidak menambah revision_count
    MENTOR_REVIEW --> ESCALATED : mentor NEEDS_CHANGES ke-3, alert MENTOR_RETURN_LIMIT
    MENTOR_REVIEW --> CLIENT_REVIEW : mentor APPROVED, timer review UMKM dimulai

    CLIENT_REVIEW --> APPROVED : UMKM approve
    CLIENT_REVIEW --> REVISION_REQUESTED : UMKM minta revisi, hanya jika revision_count masih di bawah 2
    CLIENT_REVIEW --> CLIENT_REVIEW : H+14 alert admin, admin follow up UMKM
    CLIENT_REVIEW --> ESCALATED : UMKM ajukan sengketa setelah 2 revisi, atau batas 7 hari setelah follow up lewat

    REVISION_REQUESTED --> IN_PROGRESS : revision_count bertambah 1

    ESCALATED --> APPROVED : admin force approve
    ESCALATED --> IN_PROGRESS : admin minta perbaikan tambahan atau ganti mentor
    ESCALATED --> CLIENT_REVIEW : admin teruskan hasil ke UMKM
    ESCALATED --> CANCELLED : admin memutuskan pembatalan kontrak

    note right of CANCELLED
        Kontrak TERMINATED: setiap milestone yang belum APPROVED
        (LOCKED, IN_PROGRESS, MENTOR_REVIEW, CLIENT_REVIEW, ESCALATED) menjadi CANCELLED.
    end note

    APPROVED --> [*] : dana milestone dicairkan, milestone berikutnya dibuka
    CANCELLED --> [*]
```

**Pseudocode guard untuk "minta revisi":**

```text
function requestRevision(milestone, umkm):
    assert milestone.status == CLIENT_REVIEW
    assert milestone.contract.status == IN_PROGRESS
    assert milestone.revision_count < milestone.max_revisions   // max_revisions = 2
    milestone.revision_count += 1
    milestone.status = REVISION_REQUESTED -> IN_PROGRESS
    cancel scheduled reminder jobs untuk milestone ini
```

**Pseudocode untuk "mentor review":**

```text
function mentorReview(submission, mentor, decision):
    milestone = submission.milestone
    assert milestone.status == MENTOR_REVIEW
    assignment = active mentor_assignment milestone ini
    assert assignment.mentor_id == mentor.id
    assignment.review_count += 1
    assignment.fee_eligible = true                      // mentor tetap dibayar walau nanti batal

    if decision == APPROVED:
        milestone.status = CLIENT_REVIEW
        milestone.client_review_started_at = now()
        schedule reminder H+3, H+7, H+10 dan alert admin H+14
    else:  // NEEDS_CHANGES
        milestone.mentor_return_count += 1
        if milestone.mentor_return_count >= milestone.max_mentor_returns:   // 3
            milestone.status = ESCALATED
            create admin_alert MENTOR_RETURN_LIMIT
        else:
            milestone.status = IN_PROGRESS
```

Saat admin memberi kesempatan tambahan atau mengganti mentor, `mentor_return_count` direset ke 0. Mengganti mentor = assignment lama jadi `REPLACED` dan dibuat assignment baru. Mentor lama tetap dibayar jika `fee_eligible = true`, jadi milestone itu bisa punya dua fee mentor. Selisihnya ditanggung platform.

---

## 4. Escrow

```mermaid
stateDiagram-v2
    [*] --> PENDING_FUNDING : kontrak dibuat

    PENDING_FUNDING --> HELD : pembayaran sukses
    PENDING_FUNDING --> [*] : tagihan expired atau kontrak dibatalkan

    HELD --> PARTIALLY_RELEASED : milestone pertama dicairkan
    HELD --> RELEASED : kontrak satu milestone, pencairan pertama sekaligus terakhir
    HELD --> REFUNDED : batal di status FUNDED, nilai project dikembalikan penuh
    HELD --> SETTLED : terminasi, admin alokasikan sebagian ke mahasiswa dan sisanya ke UMKM

    PARTIALLY_RELEASED --> PARTIALLY_RELEASED : milestone berikutnya dicairkan
    PARTIALLY_RELEASED --> RELEASED : milestone terakhir dicairkan, held_amount = 0
    PARTIALLY_RELEASED --> SETTLED : terminasi, sisa dana dialokasikan admin

    RELEASED --> [*]
    REFUNDED --> [*]
    SETTLED --> [*]
```

Invariant yang harus selalu benar:

```text
escrow.held_amount = funded_amount - released_amount - refunded_amount
escrow.held_amount >= 0
```

---

## 5. Cancellation Request

```mermaid
stateDiagram-v2
    [*] --> PENDING : UMKM / mahasiswa ajukan, kontrak jadi CANCELLATION_REQUESTED

    PENDING --> PENDING : pihak lain memberi tanggapan, batas 3 hari
    PENDING --> WITHDRAWN : pengaju menarik pengajuan
    PENDING --> REJECTED : admin tolak
    PENDING --> APPROVED : admin setujui dan isi alokasi per milestone

    WITHDRAWN --> [*] : kontrak kembali IN_PROGRESS
    REJECTED --> [*] : kontrak kembali IN_PROGRESS
    APPROVED --> [*] : kontrak TERMINATED, escrow SETTLED
```

---

## 6. Payout (Penarikan Saldo)

```mermaid
stateDiagram-v2
    [*] --> REQUESTED : mahasiswa / mentor tarik saldo, saldo dikunci
    REQUESTED --> PROCESSING : dikirim ke disbursement API
    REQUESTED --> FAILED : disbursement API menolak saat pengiriman, saldo dikembalikan
    PROCESSING --> SUCCESS : webhook sukses
    PROCESSING --> FAILED : webhook gagal, saldo dikembalikan ke wallet
    SUCCESS --> [*]
    FAILED --> [*]
```

---

## 7. Admin Alert: UMKM Tidak Merespons

```mermaid
stateDiagram-v2
    [*] --> OPEN : H+14 di CLIENT_REVIEW
    OPEN --> OPEN : 2 hari belum di-follow up, severity HIGH
    OPEN --> FOLLOWED_UP : admin catat follow up, follow_up_deadline = sekarang + 7 hari
    OPEN --> RESOLVED : UMKM merespons sebelum di-follow up
    FOLLOWED_UP --> FOLLOWED_UP : admin catat follow up tambahan, deadline tidak bergeser
    FOLLOWED_UP --> RESOLVED : UMKM approve atau minta revisi sebelum deadline
    FOLLOWED_UP --> AWAITING_DECISION : deadline lewat, milestone ESCALATED
    AWAITING_DECISION --> RESOLVED : admin force approve, kembalikan ke mahasiswa, atau hentikan kontrak
    RESOLVED --> [*]
```

Guard: endpoint `force-approve` untuk kasus UMKM tidak merespons hanya boleh dipanggil saat alert berstatus `AWAITING_DECISION`, yaitu setelah follow up tercatat **dan** batas 7 hari sudah lewat.

Alert tipe lain (`MENTOR_OVERDUE`, `MENTOR_RETURN_LIMIT`, `REVISION_LIMIT_DISPUTE`, `STUDENT_OVERDUE`, `STUDENT_NOT_STARTED`, `CANCELLATION_REQUEST`) tidak punya follow up: `OPEN → AWAITING_DECISION` (misal batas tanggapan pembatalan 3 hari lewat) `→ RESOLVED`, atau langsung `OPEN → RESOLVED` saat admin memutuskan / pihak terkait merespons.

## 8. Premium Listing

```mermaid
stateDiagram-v2
    [*] --> PENDING_PAYMENT : UMKM membeli
    PENDING_PAYMENT --> ACTIVE : pembayaran sukses (perpanjangan mulai setelah periode aktif berakhir)
    PENDING_PAYMENT --> EXPIRED : tagihan gagal / kedaluwarsa
    ACTIVE --> EXPIRED : ends_at lewat
    EXPIRED --> [*]
```

## 9. Payment

```mermaid
stateDiagram-v2
    [*] --> PENDING : UMKM membuat tagihan
    PENDING --> PAID : webhook sukses
    PENDING --> FAILED : webhook gagal
    PENDING --> EXPIRED : 24 jam lewat atau kontrak dibatalkan sebelum bayar
    FAILED --> PAID : pembayaran terlambat tetap diterima gateway
    EXPIRED --> PAID : pembayaran terlambat tetap diterima gateway
    PAID --> REFUNDED : seluruh nilai project dikembalikan
```

Pembayaran terlambat untuk kontrak yang sudah batal tidak mendanai escrow; nilai project langsung di-refund otomatis (biaya gateway tidak).
