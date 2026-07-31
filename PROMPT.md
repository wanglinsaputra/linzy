## PROMPT

Saya ingin membangun aplikasi web bernama **Linzy** — pengguna paste link dari berbagai platform, sistem otomatis mendeteksi platform & tipe media (video/foto/audio), lalu menampilkan pilihan format untuk diunduh (mirip UI: input field "Tempel Tautan Postingan" → tombol "Ambil Media" → preview media terdeteksi + caption → pilihan format MP4/MP3 dengan info ukuran file & tombol unduh).

### Platform yang WAJIB didukung
1. TikTok
2. Twitter / X
3. Instagram (post, reels, story jika memungkinkan)
4. Facebook (video, reels)
5. Threads
6. Pinterest
7. Reddit
8. Bluesky
9. Spotify
10. CapCut (link export/share)

### Engine ekstraksi: strategi berlapis (utama + fallback)
Jangan bikin backend cuma bergantung ke satu sumber. Susun begini:
1. **Prioritas utama**: yt-dlp langsung ke platform asli (paling stabil & terdokumentasi untuk TikTok, Twitter/X, Reddit, Bluesky, Pinterest).
2. **Fallback opsional**: kalau yt-dlp gagal untuk suatu platform (misal IG/FB/Threads kena rate limit atau butuh session), baru coba ambil dari layanan agregator pihak ketiga seperti 9xbuddy.site sebagai cadangan — TAPI catat: 9xbuddy TIDAK punya API publik resmi, situsnya pakai Cloudflare bot-protection, dan endpoint internalnya bisa berubah kapan saja tanpa pemberitahuan. Jadi kalau mau dipakai, bungkus pemanggilannya dalam try/catch terpisah, jangan jadi single point of failure, dan siap-siap fallback ini butuh maintenance ekstra / bisa berhenti berfungsi sewaktu-waktu.
3. Untuk Mediafire, Sfilemobi, CapCut — tetap pakai custom scraper langsung ke situs aslinya (lebih stabil daripada lewat agregator pihak ketiga).

### Arsitektur yang diinginkan

**Frontend**
- Next.js (App Router) + Tailwind CSS
- Halaman utama: input URL, tombol "Paste" (baca clipboard), tombol "Clear", tombol utama "Ambil Media"
- State: idle → loading → hasil terdeteksi (tampilkan thumbnail/preview, badge tipe media "VIDEO/FOTO/AUDIO", badge "Auto Detected", caption asli + tombol salin caption, link "Lihat Asli")
- Setelah deteksi: tampilkan card per format yang tersedia (misal MP4 HD, MP3, dst) lengkap dengan dimensi & ukuran file, serta tombol "Unduh File"
- Tab filter hasil: Semua / Video / Foto / Audio dengan counter jumlah masing-masing
- Badge daftar "Platform Didukung" di halaman utama (grid label platform)
- Desain dark theme, aksen warna cyan/kuning, mirip dashboard console
- Tampilkan nama brand **"Linzy"** di header/logo aplikasi dan sebagai judul halaman (title tag)
- **Desain wajib mengikuti file desain yang sudah ada di root project** (hasil export dari Google Stitch — bisa berupa file gambar/HTML/CSS/spec, sesuaikan format apa pun yang tersedia). Baca dan pahami dulu file tersebut sebelum mulai coding UI — jangan bikin desain baru dari nol, ikuti persis warna, layout, spacing, typography, dan komponen yang sudah ditentukan di file itu. Kalau ada bagian yang kurang jelas dari file desain (misal state hover, responsive behavior), boleh diasumsikan wajar mengikuti pola yang sudah ada, tapi jangan mengubah arah desain yang sudah ditetapkan.
- **Dukungan PWA (Progressive Web App)**: tambahkan `manifest.json` (nama app "Linzy", icon, theme color sesuai DESIGN.md), service worker untuk basic caching (app shell + asset statis), dan pastikan bisa di-"Add to Home Screen" di mobile. Gunakan `next-pwa` atau setup manual service worker sesuai kebutuhan Next.js App Router. Tidak perlu offline-first penuh (karena fitur utama butuh koneksi internet), cukup app shell caching supaya loading lebih cepat & terasa seperti app native.

**Backend**
- Node.js (bisa pakai Next.js API routes untuk endpoint ringan, TAPI proses ekstraksi berat harus di server terpisah — lihat catatan deployment)
- Gunakan **yt-dlp** sebagai engine ekstraksi utama untuk: TikTok, Twitter/X, Reddit, Bluesky, Pinterest, dan coba juga Instagram/Facebook/Threads (panggil via child_process atau library wrapper seperti `youtube-dl-exec` / `yt-dlp-wrap`)
- Untuk platform yang TIDAK didukung baik oleh yt-dlp (Mediafire, Sfilemobi, CapCut): buatkan custom scraper — fetch HTML halaman, parse pakai `cheerio`, cari elemen/link direct download (biasanya ada di tag `<a>`, `<video>`, `<source>`, atau embedded JSON/script tag di halaman)
- Untuk Spotify: JANGAN scraping. Pakai **Spotify Web API resmi** (client credentials flow, gratis) untuk ambil metadata lagu + preview_url (30 detik). Jangan buatkan fitur "download lagu penuh" — itu melanggar DRM & ToS, beda kategori risiko dari platform lain.
- Deteksi platform otomatis dari URL pattern (regex per domain) sebelum menentukan scraper mana yang dipanggil
- Untuk proses yang butuh convert (misal ambil audio dari video), gunakan `ffmpeg` (via `fluent-ffmpeg`), jalankan sebagai job asinkron, bukan blocking request
- Buat job queue sederhana (bisa pakai `bullmq` + Redis kalau mau proper, atau in-memory queue untuk versi sederhana dulu) agar proses lama tidak timeout
- Response API harus punya status: `processing` → `done` → `error`, supaya frontend bisa polling atau pakai websocket/SSE

### Struktur folder yang disarankan
```
/app
  /api
    /detect       -> deteksi platform dari URL
    /extract      -> jalankan scraper/yt-dlp sesuai platform
    /status/[id]  -> cek status job
    /download     -> proxy download file ke user
  /components
  /lib
    /scrapers
      tiktok.ts
      twitter.ts
      instagram.ts
      facebook.ts
      threads.ts
      pinterest.ts
      reddit.ts
      bluesky.ts
      spotify.ts
      capcut.ts
      mediafire.ts
      sfilemobi.ts
    detectPlatform.ts
    ytdlpWrapper.ts
    ffmpegHelper.ts
```

### Hal-hal penting yang harus diperhatikan (jangan diabaikan)
1. **Instagram/Facebook/Threads** butuh cookies/session untuk beberapa konten (terutama private/reels tertentu) — sediakan mekanisme load cookies dari file/env variable, dan tangani error dengan pesan jelas kalau butuh re-auth.
2. **Rate limiting**: tambahkan retry logic dengan backoff, dan siapkan struktur agar mudah ditambahkan proxy rotation nantinya (jangan hardcode single IP call).
3. **Error handling per platform**: jika satu scraper gagal (platform ubah struktur), jangan sampai crash seluruh aplikasi — tangkap error dan tampilkan pesan "Platform sedang bermasalah" ke user.
4. **File temporary**: hasil download/convert simpan sementara (folder `/tmp` atau cloud storage seperti S3/R2 kalau deploy serverless), lalu hapus otomatis setelah beberapa waktu (cron cleanup).
5. **Validasi URL**: cek dan sanitasi URL input sebelum diproses, tolak URL yang bukan dari domain platform yang didukung.
6. **CapCut**: karena tidak ada tool umum, buat scraper custom — cek dulu struktur halaman share/export CapCut (biasanya render link video ada di JSON embedded di script tag `__NEXT_DATA__` atau sejenisnya).
7. **Spotify**: hanya metadata + preview 30 detik. Tampilkan disclaimer di UI kalau full track tidak bisa diunduh karena proteksi hak cipta.
8. Buat scrapper dari 9xbuddy.site 