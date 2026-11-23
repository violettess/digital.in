# Instruksi Proyek untuk GitHub Copilot

## Konteks
Repo ini adalah **backend** platform yang mempertemukan UMKM dengan mahasiswa untuk jasa digitalisasi. Frontend sudah dibuat terpisah dengan **React JS**; backend menyediakan REST API (+ WebSocket untuk chat) yang dikonsumsi frontend tersebut.

## Sumber Kebenaran: Dokumen Desain
Desain backend lengkap ada di `docs/backend-design/`. **Baca dokumen yang relevan sebelum menulis kode**, dan ikuti dokumen tersebut. Jangan mengarang aturan bisnis sendiri.

| Butuh informasi tentang | Baca |
|---|---|
| Aturan bisnis final, nilai setting, urutan implementasi | `docs/backend-design/README.md` |
| Modul & infrastruktur | `docs/backend-design/01-arsitektur-sistem.md` |
| Hak akses per aktor | `docs/backend-design/02-use-case.md` |
| Tabel, kolom, relasi | `docs/backend-design/03-erd.md` |
| Status & transisi yang valid | `docs/backend-design/04-state-diagram.md` |
| Urutan logic tiap alur | `docs/backend-design/05-sequence-diagram.md` |
| Escrow, ledger, komisi, payout | `docs/backend-design/06-alur-keuangan-escrow.md` |
| Job terjadwal & notifikasi | `docs/backend-design/07-scheduler-dan-notifikasi.md` |
| Daftar endpoint | `docs/backend-design/08-api-endpoints.md` |

Jika dokumen tidak menjawab, saling bertentangan, atau kamu perlu menyimpang dari desain: **berhenti dan tanyakan dulu**. Jika perubahan disetujui, perbarui dokumen desain di commit yang sama.

## Aturan Bisnis yang Tidak Boleh Dilanggar
- UMKM membayar penuh di awal → dana ditahan di escrow → dicairkan **per milestone** yang disetujui.
- Komisi platform default 12% (setting 10–15%), **dipotong dari bagian mahasiswa**. Mentor mendapat 30% dari komisi platform, minimal Rp 10.000 per milestone. Persentase di-*snapshot* ke kontrak saat kontrak dibuat.
- Mentor tetap dibayar walau milestone dibatalkan, jika sudah menyelesaikan minimal 1 review (`mentor_assignments.fee_eligible`). Ditanggung platform.
- Setiap submission melewati mentor dulu. Mentor maks mengembalikan **3 kali** per milestone; pengembalian ke-3 → milestone `ESCALATED`.
- UMKM maks **2 revisi** per milestone. Pengembalian oleh mentor tidak dihitung revisi. Setelah 2 revisi, UMKM hanya bisa Approve atau Ajukan Sengketa.
- Pengerjaan dimulai **hanya** saat mahasiswa klik *Mulai Kerja*. Tidak ada auto-start.
- Pembatalan: status `AWAITING_PAYMENT` / `FUNDED` → batal langsung, nilai project dikembalikan penuh (biaya gateway tidak). Status `IN_PROGRESS` → pengajuan, admin memutuskan alokasi dana per milestone.
- UMKM tidak merespons: reminder H+3/H+7/H+10 → alert admin H+14 → admin wajib follow up → batas 7 hari setelah follow up → baru admin memutuskan. Tidak ada auto-approve.
- Mahasiswa maks **2 kontrak aktif**. Nominal milestone harus integer Rupiah lebih dari Rp 0. Tarik saldo minimal Rp 20.000, biaya transfer ditanggung penarik.
- Biaya payment gateway ditanggung UMKM. Premium listing Rp 50.000 / 30 hari. Hanya mahasiswa yang menilai mentor.

## Aturan Teknis Wajib
- **Uang**: integer Rupiah (`BIGINT`). Dilarang `float`/`double`/`decimal` untuk nominal uang.
- **Ledger double-entry**: hanya modul Escrow & Ledger yang boleh mengubah saldo. Setiap transaksi ledger wajib seimbang (debit = kredit), jika tidak → rollback.
- **Transaksi DB + row lock** (`SELECT ... FOR UPDATE`) untuk setiap operasi uang dan pengecekan batas (misal batas 2 kontrak aktif).
- **State machine**: setiap perubahan status divalidasi terhadap `04-state-diagram.md` di satu tempat terpusat per entitas. Transisi tidak valid → HTTP `409 Conflict`. Pelanggaran aturan bisnis (batas revisi, saldo kurang) → `422`.
- **Webhook** payment gateway: verifikasi signature, simpan log, idempotent berdasarkan `gateway_ref` (UNIQUE).
- **Angka bisnis** (persentase, batas, timeout) dibaca dari tabel `platform_settings`, bukan di-hardcode.
- **Scheduler**: delayed job di queue + cron harian sebagai jaring pengaman. Setiap job mengecek ulang status sebelum bertindak.
- **Audit log** untuk semua aksi keuangan dan keputusan admin.
- **Otorisasi** per role sesuai `02-use-case.md` dan kolom Akses di `08-api-endpoints.md`. Selalu cek kepemilikan resource (UMKM hanya bisa akses project miliknya, dst).
- Kredensial & secret hanya lewat environment variable. Sediakan `.env.example`.

## Konvensi Kode
- Nama tabel, kolom, enum, dan endpoint **mengikuti persis** dokumen desain (bahasa Inggris, snake_case untuk DB).
- Struktur **modular monolith**: satu folder per modul (auth, profile, project, matching, application, contract, review, payment, ledger, payout, cancellation, chat, notification, certificate, admin, scheduler).
- Format respons API konsisten, misal `{ "data": ..., "meta": ... }` untuk sukses dan `{ "error": { "code", "message", "details" } }` untuk error.
- Komentar kode & pesan commit boleh bahasa Indonesia atau Inggris, tapi konsisten.
- Setiap logic keuangan dan state machine **wajib** punya unit test, termasuk kasus gagal dan race condition.

## Cara Bekerja
1. Sebelum mengerjakan, sebutkan dokumen desain mana yang kamu jadikan acuan.
2. Kerjakan bertahap per modul sesuai urutan di `README.md`. Jangan mengerjakan banyak modul sekaligus.
3. Setelah selesai, jalankan test dan laporkan hasilnya, plus daftar bagian desain yang belum diimplementasi.
