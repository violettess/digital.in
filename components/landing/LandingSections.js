import Link from "next/link";
import {
  IconArrow, IconSpark, IconStar, IconCheck, IconStore, IconCap, IconChat, IconPalette,
  IconGlobe, IconTag, IconBook, IconShield, IconClock,
} from "./LandingIcons";

// Section homepage (server component — tanpa hook/handler). Daftar → /choose-type
// (halaman pilih tipe akun yang sudah ada), bukan /daftar?peran= milik versi Vite.

const initialsOf = (name) => name.split(" ").map((n) => n[0]).join("").slice(0, 2);

export function LandingHero() {
  return (
    <section className="lp-hero">
      <div className="lp-blob" aria-hidden style={{ right: -160, top: -160, width: 520, height: 520, background: "var(--primary-light)", opacity: 0.6 }} />
      <div className="lp-blob" aria-hidden style={{ left: -128, bottom: -160, width: 420, height: 420, background: "var(--sky-tint)", opacity: 0.7 }} />
      <div className="lp-x lp-hero-grid" style={{ position: "relative" }}>
        <div>
          <span className="lp-eyebrow"><IconSpark size={14} /> Digitalisasi UMKM, oleh talenta muda</span>
          <h1 className="lp-h1">
            Usaha kecilmu,{" "}
            <em>
              naik kelas
              <svg aria-hidden viewBox="0 0 200 12" preserveAspectRatio="none">
                <path d="M2 8c40-6 120-6 196 0" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              </svg>
            </em>{" "}
            secara digital.
          </h1>
<<<<<<< HEAD
          <p className="lp-lead">
=======
          <p className="lp-lead" style={{ maxWidth: 560 }}>
>>>>>>> 3d15cf437f7342a62ab35a2a9a5a2e615e4b4f99
            Digital.in mempertemukan pemilik UMKM dengan mahasiswa berbakat untuk urusan konten, desain, website, sampai pembukuan. Hasil profesional, harga bersahabat.
          </p>
          <div className="lp-cta-row">
            <Link href="/choose-type" className="lp-btn lp-btn-lg lp-btn-primary">Saya punya usaha <IconArrow size={18} /></Link>
            <Link href="/choose-type" className="lp-btn lp-btn-lg lp-btn-outline">Saya mahasiswa</Link>
          </div>
          <div className="lp-checks">
            <span><IconCheck size={16} /> Tanpa biaya pendaftaran</span>
            <span><IconCheck size={16} /> Pembayaran aman</span>
          </div>
        </div>

<<<<<<< HEAD
        {/* Ilustrasi (kartu HTML, bukan gambar raster) — dibaca sebagai satu
            gambar oleh pembaca layar lewat role="img". */}
        <div
          className="lp-visual lp-card"
          role="img"
          aria-label="Ilustrasi kartu proyek berjalan: Konten Instagram untuk Kopi Anteng, 3 dari 4 tahap selesai, dikerjakan mahasiswa dengan rating 4,9 dan 5,0"
        >
          <div className="lp-visual-top">
            <div className="lp-visual-head">
              <span className="lp-visual-label">Proyek berjalan</span>
              <span className="lp-chip">Aktif</span>
            </div>
            <p className="lp-visual-title">Konten Instagram — Kopi Anteng</p>
            <div className="lp-bar"><div /></div>
            <p className="lp-visual-meta">3 dari 4 tahap selesai</p>
          </div>
          <div className="lp-visual-list">
=======
        <div className="lp-visual lp-card">
          <div className="lp-visual-top">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "#DBEAFE" }}>Proyek berjalan</span>
              <span className="lp-chip">Aktif</span>
            </div>
            <h3 style={{ margin: "12px 0 0", fontSize: 22, fontWeight: 800 }}>Konten Instagram — Kopi Anteng</h3>
            <div className="lp-bar"><div /></div>
            <p style={{ margin: "8px 0 0", fontSize: 14, color: "#DBEAFE" }}>3 dari 4 tahap selesai</p>
          </div>
          <div style={{ display: "grid", gap: 8, padding: 12 }}>
>>>>>>> 3d15cf437f7342a62ab35a2a9a5a2e615e4b4f99
            <TalentRow name="Nadia Putri" role="DKV · Univ. Indonesia" rating="4,9" />
            <TalentRow name="Rangga Saputra" role="Informatika · ITB" rating="5,0" />
          </div>
          <div className="lp-float lp-card">
<<<<<<< HEAD
            <p className="lp-float-label">Rata-rata selesai</p>
            <p className="lp-float-value">7 hari</p>
=======
            <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "var(--text-faint)" }}>Rata-rata selesai</p>
            <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "var(--primary)" }}>7 hari</p>
>>>>>>> 3d15cf437f7342a62ab35a2a9a5a2e615e4b4f99
          </div>
        </div>
      </div>
    </section>
  );
}

function TalentRow({ name, role, rating }) {
  return (
    <div className="lp-talent">
      <div className="lp-av">{initialsOf(name)}</div>
<<<<<<< HEAD
      <div className="lp-talent-main">
        <p className="lp-talent-name">{name}</p>
        <p className="lp-talent-role">{role}</p>
      </div>
      <span className="lp-talent-rate">
=======
      <div style={{ minWidth: 0, flex: 1 }}>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</p>
        <p style={{ margin: 0, fontSize: 12, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{role}</p>
      </div>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 14, fontWeight: 700 }}>
>>>>>>> 3d15cf437f7342a62ab35a2a9a5a2e615e4b4f99
        <IconStar size={14} className="lp-star" /> {rating}
      </span>
    </div>
  );
}

const STATS = [
  { value: "1.200+", label: "UMKM terbantu" },
  { value: "850+", label: "Mahasiswa aktif" },
  { value: "4,9/5", label: "Rata-rata rating" },
  { value: "Rp2,3M", label: "Tersalurkan ke mahasiswa" },
];

export function LandingStats() {
  return (
    <section className="lp-alt">
      <div className="lp-x lp-stats">
        {STATS.map((s) => (
          <div key={s.label}>
<<<<<<< HEAD
            <p className="lp-stat-v">{s.value}</p>
            <p className="lp-stat-l">{s.label}</p>
=======
            <p className="lp-stat-v" style={{ margin: 0 }}>{s.value}</p>
            <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--text-muted)" }}>{s.label}</p>
>>>>>>> 3d15cf437f7342a62ab35a2a9a5a2e615e4b4f99
          </div>
        ))}
      </div>
    </section>
  );
}

const STEPS = [
  { num: "01", title: "Ceritakan kebutuhanmu", desc: "Tulis apa yang usahamu perlukan — konten, logo, website, atau pembukuan. Cukup beberapa menit." },
  { num: "02", title: "Pilih talenta yang cocok", desc: "Lihat portofolio, rating, dan harga mahasiswa. Pilih yang paling pas dengan gaya usahamu." },
  { num: "03", title: "Kerjakan bersama", desc: "Diskusi lewat pesan, pantau progres per tahap, dan beri masukan langsung sampai puas." },
  { num: "04", title: "Bayar setelah beres", desc: "Dana ditahan aman dan baru cair ke mahasiswa saat hasil sudah kamu setujui." },
];

export function LandingHowItWorks() {
  return (
    <section id="cara-kerja" className="lp-section">
      <div className="lp-x">
        <div style={{ maxWidth: 672 }}>
          <span className="lp-eyebrow">Cara kerja</span>
          <h2 className="lp-h2">Dari ide sampai hasil, dalam empat langkah.</h2>
          <p className="lp-lead">Kami buat prosesnya sesederhana mungkin — supaya kamu bisa fokus ke usahamu, bukan ribet urusan teknis.</p>
        </div>
        <div className="lp-grid c4">
          {STEPS.map((s) => (
            <div key={s.num} className="lp-card lp-step">
              <span className="lp-num">{s.num}</span>
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const UMKM_POINTS = [
  "Konten sosial media yang konsisten tiap bulan",
  "Logo & identitas merek yang berkarakter",
  "Website dan toko online siap jualan",
  "Pembukuan rapi untuk ajukan modal usaha",
];
const MAHA_POINTS = [
  "Proyek nyata untuk isi portofolio",
  "Penghasilan tambahan yang fleksibel",
  "Jam kerja diatur sendiri, remote",
  "Bangun reputasi lewat rating & ulasan",
];

export function LandingTwoSides() {
  return (
    <section className="lp-section lp-alt">
      <div className="lp-x lp-two">
        <div id="untuk-umkm" className="lp-side dark">
          <span className="lp-side-ic"><IconStore /></span>
          <h3>Untuk pemilik UMKM</h3>
          <p>Serahkan urusan digital ke tangan yang tepat, dengan biaya yang jauh lebih ringan dibanding agensi.</p>
          <ul>{UMKM_POINTS.map((p) => <li key={p}><IconCheck size={18} /><span>{p}</span></li>)}</ul>
          <Link href="/choose-type" className="lp-btn lp-btn-lg lp-btn-accent">Posting kebutuhan usaha <IconArrow size={18} /></Link>
        </div>
        <div id="untuk-mahasiswa" className="lp-side light">
          <span className="lp-side-ic"><IconCap /></span>
          <h3>Untuk mahasiswa</h3>
          <p>Ubah skill dan waktu luangmu jadi pengalaman nyata sekaligus penghasilan, tanpa mengganggu kuliah.</p>
          <ul>{MAHA_POINTS.map((p) => <li key={p}><IconCheck size={18} /><span>{p}</span></li>)}</ul>
          <Link href="/choose-type" className="lp-btn lp-btn-lg lp-btn-primary">Mulai cari proyek <IconArrow size={18} /></Link>
        </div>
      </div>
    </section>
  );
}

const CATEGORIES = [
  { icon: IconChat, title: "Konten Sosial Media", desc: "Feed, reels, dan caption yang menjual", from: "Rp300rb" },
  { icon: IconPalette, title: "Logo & Branding", desc: "Identitas visual yang mudah diingat", from: "Rp400rb" },
  { icon: IconGlobe, title: "Website & Toko Online", desc: "Profil usaha sampai sistem pesanan", from: "Rp1,2jt" },
  { icon: IconStore, title: "Setup Marketplace", desc: "Daftar & optimasi Shopee, Tokopedia", from: "Rp275rb" },
  { icon: IconBook, title: "Pembukuan Digital", desc: "Laporan rapi, siap ajukan modal", from: "Rp250rb" },
  { icon: IconTag, title: "Desain Promosi", desc: "Menu, banner, dan materi kampanye", from: "Rp200rb" },
];

export function LandingCategories() {
  return (
    <section id="kategori" className="lp-section">
      <div className="lp-x">
        <div className="lp-sec-head">
          <div style={{ maxWidth: 672 }}>
            <span className="lp-eyebrow">Kategori jasa</span>
            <h2 className="lp-h2">Apa pun kebutuhan digital usahamu, ada talentanya.</h2>
          </div>
<<<<<<< HEAD
          <Link href="/choose-type" className="lp-link">Mulai sekarang →</Link>
=======
          <Link href="/choose-type" style={{ fontSize: 14, fontWeight: 700, color: "var(--primary-dark)" }}>Mulai sekarang →</Link>
>>>>>>> 3d15cf437f7342a62ab35a2a9a5a2e615e4b4f99
        </div>
        <div className="lp-grid c3">
          {CATEGORIES.map((c) => (
            <Link key={c.title} href="/choose-type" className="lp-card lp-cat">
              <span className="lp-cat-ic"><c.icon /></span>
              <div>
                <h3>{c.title}</h3>
                <p>{c.desc}</p>
<<<<<<< HEAD
                <span className="lp-from">Mulai {c.from}</span>
=======
                <p className="lp-from">Mulai {c.from}</p>
>>>>>>> 3d15cf437f7342a62ab35a2a9a5a2e615e4b4f99
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

<<<<<<< HEAD
=======
const TESTIMONIALS = [
  { quote: "Konten Instagram warung saya jadi rapi dan konsisten. Pesanan naik hampir dua kali lipat dalam sebulan.", name: "Ibu Sari", role: "Warung Ibu Sari, Yogyakarta" },
  { quote: "Dapat proyek website pertama lewat Digital.in. Portofolio bertambah dan sekarang ada pemasukan tetap.", name: "Rangga Saputra", role: "Mahasiswa Informatika, ITB" },
  { quote: "Pembukuan usaha akhirnya rapi. Waktu ajukan pinjaman modal, laporannya langsung diterima bank.", name: "Pak Budi", role: "Berkah Furniture, Jepara" },
];

export function LandingTestimonials() {
  return (
    <section className="lp-section lp-alt">
      <div className="lp-x">
        <div style={{ maxWidth: 672 }}>
          <span className="lp-eyebrow">Cerita mereka</span>
          <h2 className="lp-h2">Usaha tumbuh, mahasiswa berkembang.</h2>
        </div>
        <div className="lp-grid c3">
          {TESTIMONIALS.map((t) => (
            <figure key={t.name} className="lp-card lp-quote">
              <div className="lp-stars">{[0, 1, 2, 3, 4].map((i) => <IconStar key={i} size={16} />)}</div>
              <blockquote>“{t.quote}”</blockquote>
              <figcaption>
                <span className="lp-av">{initialsOf(t.name)}</span>
                <div>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>{t.name}</p>
                  <p style={{ margin: 0, fontSize: 12, color: "var(--text-muted)" }}>{t.role}</p>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

>>>>>>> 3d15cf437f7342a62ab35a2a9a5a2e615e4b4f99
export function LandingCtaBand() {
  return (
    <section className="lp-section">
      <div className="lp-x">
        <div className="lp-cta">
          <div className="lp-blob" aria-hidden style={{ left: -80, top: 0, width: 256, height: 256, background: "var(--primary)", opacity: 0.4 }} />
          <div className="lp-blob" aria-hidden style={{ right: -80, bottom: 0, width: 256, height: 256, background: "var(--sky)", opacity: 0.3 }} />
          <h2>Siap membawa usahamu ke dunia digital?</h2>
          <p>Gabung gratis hari ini. Temukan talenta yang tepat atau proyek pertamamu dalam hitungan menit.</p>
          <div className="lp-cta-row">
            <Link href="/choose-type" className="lp-btn lp-btn-lg lp-btn-accent">Saya punya usaha</Link>
            <Link href="/choose-type" className="lp-btn lp-btn-lg lp-btn-light">Saya mahasiswa</Link>
          </div>
          <div className="lp-cta-meta">
            <span><IconShield size={16} /> Pembayaran ditahan sampai selesai</span>
            <span><IconClock size={16} /> Rata-rata proyek selesai 7 hari</span>
          </div>
        </div>
      </div>
    </section>
  );
}
