# 02 — Use Case per Aktor

Mermaid tidak punya diagram use case UML resmi, jadi digambarkan dengan flowchart. Satu diagram per aktor agar mudah dibaca.

## Aktor

| Aktor | Peran |
|---|---|
| UMKM | Klien yang memposting project dan membayar |
| Mahasiswa | Talenta yang mengerjakan project |
| Mentor | Senior/dosen yang meninjau hasil kerja per milestone (dibayar komisi) |
| Admin | Verifikasi, menangani pembatalan, eskalasi, dan pencairan manual |
| System (Scheduler) | Aktor otomatis: reminder, timeout, eskalasi |
| Payment Gateway | Sistem eksternal pembayaran & disbursement |

## UMKM

```mermaid
flowchart LR
    U(["UMKM"])
    U --> U1["Registrasi + OTP WhatsApp"]
    U --> U2["Kelola profil usaha"]
    U --> U3["Buat project dari form / template"]
    U --> U4["Beli premium listing"]
    U --> U5["Lihat rekomendasi talent"]
    U --> U6["Undang mahasiswa"]
    U --> U7["Terima / tolak lamaran"]
    U --> U8["Bayar escrow"]
    U --> U9["Pantau progress milestone"]
    U --> U10["Approve atau minta revisi, maks 2x per milestone"]
    U --> U11["Batalkan langsung, sebelum pengerjaan dimulai"]
    U --> U12["Ajukan pembatalan, saat pengerjaan berjalan"]
    U --> U13["Beri rating & ulasan"]
    U --> U14["Chat dengan mahasiswa"]
```

## Mahasiswa

```mermaid
flowchart LR
    M(["Mahasiswa"])
    M --> M1["Registrasi + verifikasi email kampus / KTM"]
    M --> M2["Kelola profil, skill, portofolio"]
    M --> M3["Browse & filter project"]
    M --> M4["Apply: proposal, harga, usulan milestone"]
    M --> M5["Terima / tolak undangan"]
    M --> M6["Mulai pengerjaan"]
    M --> M7["Submit hasil per milestone"]
    M --> M8["Batalkan langsung, sebelum pengerjaan dimulai"]
    M --> M9["Ajukan pembatalan, saat pengerjaan berjalan"]
    M --> M10["Lihat saldo & tarik dana"]
    M --> M11["Unduh sertifikat"]
    M --> M12["Chat dengan UMKM"]
```

## Mentor

```mermaid
flowchart LR
    T(["Mentor"])
    T --> T1["Registrasi + verifikasi oleh admin"]
    T --> T2["Atur keahlian & ketersediaan"]
    T --> T3["Lihat antrean review"]
    T --> T4["Approve submission ke UMKM"]
    T --> T5["Kembalikan ke mahasiswa dengan feedback"]
    T --> T6["Lihat saldo komisi & tarik dana"]
```

## Admin

```mermaid
flowchart LR
    A(["Admin"])
    A --> A1["Verifikasi mahasiswa & mentor"]
    A --> A2["Kelola kategori, template, setting komisi"]
    A --> A3["Tinjau pengajuan pembatalan"]
    A --> A4["Putuskan alokasi dana per milestone"]
    A --> A5["Tangani eskalasi: UMKM tidak merespons, mentor telat"]
    A --> A11["Follow up UMKM yang tidak merespons dan catat hasilnya"]
    A --> A6["Force approve milestone"]
    A --> A10["Tangani milestone yang 3x dikembalikan mentor"]
    A --> A7["Assign / ganti mentor"]
    A --> A8["Suspend akun"]
    A --> A9["Lihat laporan keuangan & audit log"]
```

## System (Scheduler) & Payment Gateway

```mermaid
flowchart LR
    S(["Scheduler"])
    S --> S1["Kirim reminder review ke UMKM"]
    S --> S2["Buat alert admin jika UMKM tidak merespons 14 hari"]
    S --> S7["Eskalasi milestone jika batas follow up 7 hari lewat"]
    S --> S8["Reminder mahasiswa yang belum klik Mulai Kerja"]
    S --> S3["Reminder & reassign mentor yang melewati SLA"]
    S --> S4["Batalkan tagihan yang kedaluwarsa"]
    S --> S5["Akhiri premium listing yang habis"]
    S --> S6["Reminder deadline milestone ke mahasiswa"]

    P(["Payment Gateway"])
    P --> P1["Kirim webhook pembayaran sukses / gagal / expired"]
    P --> P2["Kirim webhook status payout & refund"]
```
