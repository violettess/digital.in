# 03 — Entity Relationship Diagram (ERD)

ERD dibagi menjadi 5 bagian supaya terbaca. Bagian 0 adalah peta relasi tingkat tinggi; bagian 1–4 berisi atribut detail.

Konvensi:
- Semua `id` bertipe `uuid`.
- Semua tabel punya `created_at` dan `updated_at` (tidak ditulis ulang agar ringkas).
- Uang disimpan sebagai `bigint` dalam Rupiah.
- Kolom `status` adalah enum; nilainya mengikuti `04-state-diagram.md`.

---

## 0. Peta Relasi (Overview)

```mermaid
erDiagram
    USERS ||--o| UMKM_PROFILES : has
    USERS ||--o| STUDENT_PROFILES : has
    USERS ||--o| MENTOR_PROFILES : has
    USERS ||--o| WALLETS : owns

    UMKM_PROFILES ||--o{ PROJECTS : posts
    PROJECTS ||--o{ APPLICATIONS : receives
    PROJECTS ||--o{ INVITATIONS : sends
    STUDENT_PROFILES ||--o{ APPLICATIONS : submits

    PROJECTS ||--o{ CONTRACTS : "has (max 1 active)"
    APPLICATIONS ||--o| CONTRACTS : "becomes"
    CONTRACTS ||--|{ MILESTONES : "split into"
    MILESTONES ||--o{ SUBMISSIONS : has
    SUBMISSIONS ||--o{ SUBMISSION_REVIEWS : "reviewed by"
    MENTOR_PROFILES ||--o{ MILESTONES : "assigned to"

    CONTRACTS ||--|| ESCROWS : "secured by"
    ESCROWS ||--o{ LEDGER_ENTRIES : records
    WALLETS ||--o{ LEDGER_ENTRIES : records
    PAYMENTS ||--o| ESCROWS : funds

    CONTRACTS ||--o{ CANCELLATION_REQUESTS : has
    CONTRACTS ||--o{ RATINGS : has
    CONTRACTS ||--o| CERTIFICATES : produces
    CONTRACTS ||--o| CONVERSATIONS : has
```

---

## 1. Users, Profil & Verifikasi

```mermaid
erDiagram
    USERS {
        uuid id PK
        string name
        string email UK "nullable untuk UMKM"
        string phone UK "wajib untuk UMKM"
        string password_hash
        string role "UMKM, STUDENT, MENTOR, ADMIN"
        string status "PENDING_VERIFICATION, ACTIVE, SUSPENDED"
        timestamp phone_verified_at
        timestamp email_verified_at
        timestamp last_login_at
    }

    OTP_CODES {
        uuid id PK
        string phone
        string code_hash
        string purpose "REGISTER, LOGIN, RESET_PASSWORD"
        int attempt_count
        string verification_token_hash "nullable, sekali pakai setelah OTP REGISTER valid"
        timestamp verified_at
        timestamp verification_expires_at
        timestamp expires_at
        timestamp used_at
    }

    REFRESH_TOKENS {
        uuid id PK
        uuid user_id FK
        string token_hash UK
        timestamp expires_at
        timestamp revoked_at
        uuid replaced_by_id FK "nullable, refresh token hasil rotasi"
    }

    UMKM_PROFILES {
        uuid id PK
        uuid user_id FK, UK
        string business_name
        string business_type "kuliner, fashion, kerajinan, jasa, dll"
        string address
        string city
        decimal latitude
        decimal longitude
        string instagram_url
        decimal rating_avg "rating dari mahasiswa, opsional"
    }

    UNIVERSITIES {
        uuid id PK
        string name
        string email_domain UK "contoh: ugm.ac.id"
        string city
        boolean is_partner
    }

    STUDENT_PROFILES {
        uuid id PK
        uuid user_id FK, UK
        uuid university_id FK
        string nim
        string major
        int semester
        string campus_email "nullable, domain mengikuti universities.email_domain"
        timestamp campus_email_verified_at "nullable"
        string ktm_file_url
        string verification_status "PENDING, VERIFIED, REJECTED"
        uuid verified_by FK "admin, nullable"
        text bio
        decimal rating_avg
        int completed_contracts_count
        int active_contracts_count "maks 2"
        boolean is_available
    }

    MENTOR_PROFILES {
        uuid id PK
        uuid user_id FK, UK
        string title "Dosen, Senior Designer, dll"
        string institution
        text bio
        string verification_status "PENDING, VERIFIED, REJECTED"
        int max_active_reviews
        boolean is_available
        decimal rating_avg
    }

    SERVICE_CATEGORIES {
        uuid id PK
        string name "Desain Menu, Kelola Sosmed, Daftar Marketplace"
        string slug UK
        boolean is_active
    }

    STUDENT_SKILLS {
        uuid student_id PK, FK
        uuid category_id PK, FK
        string level "BEGINNER, INTERMEDIATE, ADVANCED"
    }

    MENTOR_EXPERTISES {
        uuid mentor_id PK, FK
        uuid category_id PK, FK
    }

    PORTFOLIO_ITEMS {
        uuid id PK
        uuid student_id FK
        uuid contract_id FK "nullable, terisi jika dari platform"
        string title
        text description
        json media_urls
        boolean is_verified "true jika berasal dari kontrak selesai"
    }

    USERS ||--o| UMKM_PROFILES : has
    USERS ||--o| STUDENT_PROFILES : has
    USERS ||--o| MENTOR_PROFILES : has
    USERS ||--o{ REFRESH_TOKENS : owns
    UNIVERSITIES ||--o{ STUDENT_PROFILES : enrolls
    STUDENT_PROFILES ||--o{ STUDENT_SKILLS : has
    SERVICE_CATEGORIES ||--o{ STUDENT_SKILLS : classifies
    MENTOR_PROFILES ||--o{ MENTOR_EXPERTISES : has
    SERVICE_CATEGORIES ||--o{ MENTOR_EXPERTISES : classifies
    STUDENT_PROFILES ||--o{ PORTFOLIO_ITEMS : owns
```

---

## 2. Project, Lamaran & Kontrak

```mermaid
erDiagram
    PROJECT_TEMPLATES {
        uuid id PK
        uuid category_id FK
        string title "contoh: Paket Setup Instagram Bisnis"
        text description
        json default_milestones "judul + persentase"
        bigint suggested_budget_min
        bigint suggested_budget_max
        int suggested_duration_days
    }

    PROJECTS {
        uuid id PK
        uuid umkm_id FK
        uuid category_id FK
        uuid template_id FK "nullable"
        string title
        text description
        bigint budget_min
        bigint budget_max
        date deadline
        string city
        string status "DRAFT, OPEN, ASSIGNED, COMPLETED, CANCELLED, CLOSED"
        timestamp published_at
        timestamp closed_at
    }

    PROJECT_ATTACHMENTS {
        uuid id PK
        uuid project_id FK
        string file_url
        string file_name
    }

    PREMIUM_LISTINGS {
        uuid id PK
        uuid project_id FK
        uuid payment_id FK
        bigint price "Rp 50.000, snapshot"
        int duration_days "default 30"
        timestamp starts_at
        timestamp ends_at
        string status "PENDING_PAYMENT, ACTIVE, EXPIRED"
    }

    INVITATIONS {
        uuid id PK
        uuid project_id FK
        uuid student_id FK
        text message
        string status "PENDING, ACCEPTED, DECLINED, EXPIRED"
        timestamp expires_at
    }

    APPLICATIONS {
        uuid id PK
        uuid project_id FK
        uuid student_id FK
        uuid invitation_id FK "nullable"
        text proposal
        bigint offered_price
        int estimated_days
        json proposed_milestones "judul, deskripsi, nominal, due_date"
        int match_score "hasil smart matching"
        string status "PENDING, SHORTLISTED, ACCEPTED, REJECTED, WITHDRAWN"
    }

    CONTRACTS {
        uuid id PK
        string contract_no UK
        uuid project_id FK
        uuid application_id FK, UK
        uuid umkm_id FK
        uuid student_id FK
        bigint total_amount
        decimal platform_fee_pct "snapshot, contoh 12.00"
        decimal mentor_share_pct "snapshot, porsi mentor dari fee platform"
        bigint mentor_min_fee "snapshot"
        string status "AWAITING_PAYMENT, FUNDED, IN_PROGRESS, CANCELLATION_REQUESTED, COMPLETED, CANCELLED, TERMINATED"
        timestamp payment_due_at
        timestamp funded_at
        timestamp started_at
        timestamp completed_at
        timestamp cancelled_at
        uuid cancelled_by FK
    }

    MILESTONES {
        uuid id PK
        uuid contract_id FK
        int sequence "1, 2, 3"
        string title
        text description
        bigint amount
        date due_date
        uuid mentor_id FK "mentor aktif saat ini, riwayat di MENTOR_ASSIGNMENTS"
        string status "LOCKED, IN_PROGRESS, MENTOR_REVIEW, CLIENT_REVIEW, REVISION_REQUESTED, ESCALATED, APPROVED, CANCELLED"
        int revision_count "revisi dari UMKM"
        int max_revisions "default 2"
        int mentor_return_count "dikembalikan oleh mentor"
        int max_mentor_returns "default 3, ke-3 memicu ESCALATED"
        timestamp started_at
        timestamp client_review_started_at "acuan timer UMKM tidak merespons"
        int client_review_paused_seconds "teknis: total jeda saat CANCELLATION_REQUESTED"
        timestamp approved_at
        string approved_via "CLIENT, ADMIN_FORCE"
    }

    MENTOR_ASSIGNMENTS {
        uuid id PK
        uuid milestone_id FK
        uuid mentor_id FK
        string status "ACTIVE, REPLACED, DONE"
        int review_count
        boolean fee_eligible "true setelah menyelesaikan 1 review"
        bigint fee_amount "diisi saat settlement"
        timestamp fee_paid_at
        timestamp assigned_at
        timestamp replaced_at
    }

    SUBMISSIONS {
        uuid id PK
        uuid milestone_id FK
        int version_no
        text notes
        string status "PENDING_MENTOR, RETURNED_BY_MENTOR, PENDING_CLIENT, REVISION_REQUESTED, ACCEPTED"
        timestamp submitted_at
    }

    SUBMISSION_FILES {
        uuid id PK
        uuid submission_id FK
        string file_url
        string file_name
        string mime_type
        bigint size_bytes
    }

    SUBMISSION_REVIEWS {
        uuid id PK
        uuid submission_id FK
        uuid reviewer_id FK
        string reviewer_role "MENTOR, UMKM, ADMIN"
        string decision "APPROVED, NEEDS_CHANGES, REVISION_REQUESTED"
        text feedback
        timestamp reviewed_at
    }

    SERVICE_CATEGORIES ||--o{ PROJECT_TEMPLATES : groups
    SERVICE_CATEGORIES ||--o{ PROJECTS : classifies
    PROJECT_TEMPLATES ||--o{ PROJECTS : "used by"
    PROJECTS ||--o{ PROJECT_ATTACHMENTS : has
    PROJECTS ||--o{ PREMIUM_LISTINGS : boosted
    PROJECTS ||--o{ INVITATIONS : sends
    PROJECTS ||--o{ APPLICATIONS : receives
    INVITATIONS ||--o| APPLICATIONS : "converted to"
    APPLICATIONS ||--o| CONTRACTS : becomes
    PROJECTS ||--o{ CONTRACTS : has
    CONTRACTS ||--|{ MILESTONES : "split into"
    MILESTONES ||--o{ SUBMISSIONS : has
    MILESTONES ||--o{ MENTOR_ASSIGNMENTS : "reviewed by"
    SUBMISSIONS ||--|{ SUBMISSION_FILES : contains
    SUBMISSIONS ||--o{ SUBMISSION_REVIEWS : receives
```

**Catatan aturan bisnis di level data:**
- `SUM(milestones.amount) = contracts.total_amount` — divalidasi saat kontrak dibuat.
- Satu project hanya boleh punya **satu** kontrak dengan status aktif (`AWAITING_PAYMENT`, `FUNDED`, `IN_PROGRESS`, `CANCELLATION_REQUESTED`). Gunakan partial unique index.
- Milestone dikerjakan **berurutan**: milestone ke-2 baru `IN_PROGRESS` setelah milestone ke-1 `APPROVED`.
- Mahasiswa maksimal **2 kontrak aktif**. Saat UMKM menerima lamaran, lock baris `student_profiles` (`SELECT ... FOR UPDATE`) lalu hitung ulang kontrak aktif, supaya dua UMKM yang menerima di waktu bersamaan tidak membuat mahasiswa punya 3 kontrak.
- Setiap milestone minimal **Rp 150.000**.

---

## 3. Keuangan: Payment, Escrow, Ledger, Payout

```mermaid
erDiagram
    PAYMENTS {
        uuid id PK
        uuid payer_id FK
        string purpose "ESCROW_FUNDING, PREMIUM_LISTING"
        uuid reference_id "contract_id atau premium_listing_id"
        bigint amount
        bigint gateway_fee
        string gateway "MIDTRANS, XENDIT"
        string gateway_ref UK "untuk idempotensi webhook"
        string method "VA, QRIS, EWALLET"
        string status "PENDING, PAID, FAILED, EXPIRED, REFUNDED"
        timestamp expires_at
        timestamp paid_at
    }

    PAYMENT_WEBHOOK_LOGS {
        uuid id PK
        string gateway
        string gateway_ref
        string event_type
        json payload
        boolean processed
        timestamp received_at
    }

    ESCROWS {
        uuid id PK
        uuid contract_id FK, UK
        uuid payment_id FK
        bigint funded_amount
        bigint released_amount
        bigint refunded_amount
        bigint held_amount "funded - released - refunded"
        string status "PENDING_FUNDING, HELD, PARTIALLY_RELEASED, RELEASED, REFUNDED, SETTLED"
    }

    WALLETS {
        uuid id PK
        uuid user_id FK "nullable untuk akun sistem"
        string type "STUDENT, MENTOR, UMKM_REFUND, PLATFORM_REVENUE"
        bigint balance "cache, sumber kebenaran adalah ledger"
        bigint pending_withdrawal
    }

    LEDGER_TRANSACTIONS {
        uuid id PK
        string type "ESCROW_FUNDED, MILESTONE_RELEASE, REFUND, WITHDRAWAL, PREMIUM_LISTING"
        string reference_type "MILESTONE, CONTRACT, PAYOUT, CANCELLATION"
        uuid reference_id
        string idempotency_key UK
        text description
    }

    LEDGER_ENTRIES {
        uuid id PK
        uuid transaction_id FK
        string account_type "ESCROW, WALLET"
        uuid escrow_id FK "nullable"
        uuid wallet_id FK "nullable"
        string direction "DEBIT, CREDIT"
        bigint amount
    }

    MILESTONE_SETTLEMENTS {
        uuid id PK
        uuid milestone_id FK, UK
        bigint gross_amount
        bigint platform_fee
        bigint mentor_fee
        bigint platform_net
        bigint student_amount
        bigint refund_amount "jika ada pembatalan"
        uuid ledger_transaction_id FK
        timestamp settled_at
    }

    BANK_ACCOUNTS {
        uuid id PK
        uuid user_id FK
        string channel "BANK, EWALLET"
        string provider_code "BCA, BRI, DANA, OVO, GOPAY"
        string account_number "dienkripsi (cast encrypted)"
        string account_number_last4 "teknis: ditampilkan ke klien"
        string account_holder_name
        boolean is_verified
        boolean is_primary
    }

    PAYOUTS {
        uuid id PK
        uuid wallet_id FK
        uuid bank_account_id FK
        bigint amount
        bigint fee "biaya transfer, ditanggung penarik"
        bigint net_amount "amount - fee, yang diterima di rekening"
        string status "REQUESTED, PROCESSING, SUCCESS, FAILED"
        string gateway_ref UK
        timestamp requested_at
        timestamp completed_at
    }

    REFUNDS {
        uuid id PK
        uuid payment_id FK
        uuid cancellation_request_id FK "nullable"
        bigint amount "nilai project saja, biaya gateway tidak dikembalikan"
        string status "PENDING, PROCESSING, SUCCESS, FAILED"
        string gateway_ref UK
    }

    PAYMENTS ||--o{ PAYMENT_WEBHOOK_LOGS : logs
    PAYMENTS ||--o| ESCROWS : funds
    PAYMENTS ||--o{ REFUNDS : "refunded by"
    ESCROWS ||--o{ LEDGER_ENTRIES : records
    WALLETS ||--o{ LEDGER_ENTRIES : records
    LEDGER_TRANSACTIONS ||--|{ LEDGER_ENTRIES : contains
    MILESTONE_SETTLEMENTS ||--|| LEDGER_TRANSACTIONS : "posted as"
    WALLETS ||--o{ PAYOUTS : withdraws
    BANK_ACCOUNTS ||--o{ PAYOUTS : receives
```

**Kenapa pakai ledger?** Saldo (`wallets.balance`, `escrows.held_amount`) hanya *cache*. Sumber kebenaran adalah `LEDGER_ENTRIES`, di mana setiap transaksi wajib seimbang: `total DEBIT = total CREDIT`. Ini membuat audit dan rekonsiliasi dengan payment gateway jauh lebih mudah. Contoh jurnal ada di `06-alur-keuangan-escrow.md`.

---

## 4. Pembatalan, Rating, Sertifikat, Chat, Notifikasi, Admin

```mermaid
erDiagram
    CANCELLATION_REQUESTS {
        uuid id PK
        uuid contract_id FK
        uuid requested_by FK
        string requester_role "UMKM, STUDENT, ADMIN (terminasi langsung oleh admin)"
        string type "DIRECT, NEEDS_REVIEW"
        text reason
        json evidence_urls
        text counterparty_response
        string status "PENDING, APPROVED, REJECTED, WITHDRAWN"
        uuid resolved_by FK "admin"
        text admin_notes
        timestamp response_due_at
        timestamp resolved_at
    }

    CANCELLATION_ALLOCATIONS {
        uuid id PK
        uuid cancellation_request_id FK
        uuid milestone_id FK
        bigint amount_to_student
        bigint amount_to_umkm
        bigint mentor_fee "total fee mentor yang fee_eligible, ditanggung platform jika dana di-refund"
    }

    RATINGS {
        uuid id PK
        uuid contract_id FK
        uuid rater_id FK
        uuid ratee_id FK
        string direction "UMKM_TO_STUDENT, STUDENT_TO_UMKM, STUDENT_TO_MENTOR. UMKM tidak menilai mentor"
        int score "1 sampai 5"
        text comment
    }

    CERTIFICATES {
        uuid id PK
        uuid contract_id FK, UK
        uuid student_id FK
        string certificate_no UK
        string verification_code UK "untuk URL verifikasi publik"
        string pdf_url
        timestamp issued_at
    }

    CONVERSATIONS {
        uuid id PK
        uuid project_id FK
        uuid contract_id FK "nullable sebelum kontrak"
        uuid umkm_user_id FK
        uuid student_user_id FK
    }

    MESSAGES {
        uuid id PK
        uuid conversation_id FK
        uuid sender_id FK
        text body
        string attachment_url
        boolean is_flagged "deteksi nomor HP / ajakan transaksi di luar"
        timestamp read_at
    }

    NOTIFICATIONS {
        uuid id PK
        uuid user_id FK
        string type "APPLICATION_RECEIVED, PAYMENT_SUCCESS, REVIEW_REMINDER, dll"
        string title
        text body
        json data
        string channels "IN_APP, WHATSAPP, EMAIL"
        timestamp sent_at
        timestamp read_at
    }

    ADMIN_ALERTS {
        uuid id PK
        string type "UMKM_UNRESPONSIVE, MENTOR_OVERDUE, STUDENT_OVERDUE, STUDENT_NOT_STARTED, CANCELLATION_REQUEST, REVISION_LIMIT_DISPUTE, MENTOR_RETURN_LIMIT"
        string severity "LOW, MEDIUM, HIGH"
        string reference_type
        uuid reference_id
        string status "OPEN, FOLLOWED_UP, AWAITING_DECISION, RESOLVED"
        uuid assigned_to FK
        timestamp follow_up_deadline "follow up pertama + 7 hari"
        text resolution_notes
        timestamp resolved_at
    }

    ALERT_FOLLOW_UPS {
        uuid id PK
        uuid alert_id FK
        uuid admin_id FK
        string channel "WHATSAPP, TELEPON, EMAIL"
        string outcome "TIDAK_DIANGKAT, DIJAWAB_AKAN_REVIEW, DIJAWAB_MENOLAK, LAINNYA"
        text notes
        timestamp followed_up_at
    }

    PLATFORM_SETTINGS {
        string key PK "daftar lengkap di README"
        string value
        text description
    }

    AUDIT_LOGS {
        uuid id PK
        uuid actor_id FK
        string action
        string entity_type
        uuid entity_id
        json before_data
        json after_data
        string ip_address
        timestamp created_at
    }

    CANCELLATION_REQUESTS ||--o{ CANCELLATION_ALLOCATIONS : "decides"
    ADMIN_ALERTS ||--o{ ALERT_FOLLOW_UPS : "followed up by"
    CONVERSATIONS ||--o{ MESSAGES : contains
```
