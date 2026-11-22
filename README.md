# GWM Search — search.gowithdme.com

Mesin pencari statis untuk ekosistem GoWithDME (event, gunung, blog, halaman). Mirip portal pencarian Naver: kolom besar di beranda, saran ketikan, tab kategori, ringkasan jawaban di atas hasil.

## Struktur
```
CNAME                 search.gowithdme.com (GitHub Pages)
index.html            beranda + hasil (satu halaman, rute ?q=...&tab=...)
404.html  robots.txt  manifest.webmanifest  opensearch.xml (bisa ditambah ke browser sebagai mesin cari)
css/search.css        tampilan (terang/gelap otomatis)
js/config.js          SATU-SATUNYA tempat sambungan ke gowithdme.com
js/engine.js          muat data, normalisasi, skor, sinonim, toleransi salah ketik, saran
js/answer.js          jawaban AI dari Worker (mode "search") atau ringkasan lokal bila AI mati
js/app.js             UI: rute, tab, paging, saran, pintasan "/"
data/                 cadangan events.json, posts.json + synonyms.json
js/md.js              render Markdown jawaban AI (tabel, daftar, chip sumber [n])
tools/sync.py         salin data dari gowithdme.com
.github/workflows/    sync.yml (tiap 6 jam)
```

## Pasang
1. Buat repo `gowithdme-search`, upload isi folder ini, push ke `main`.
2. Settings > Pages > Deploy from branch `main` / root. Custom domain: `search.gowithdme.com`, centang Enforce HTTPS.
3. Cloudflare > DNS > tambah **CNAME** `search` → `calvfinka.github.io` (ganti dengan akun GitHub pemilik repo), **Proxy status: DNS only** (awan abu-abu) sampai sertifikat HTTPS GitHub terbit; sesudahnya boleh Proxied dengan SSL mode Full.
4. Settings > Actions > General > Workflow permissions: Read and write.

Uji lokal: `python3 -m http.server 8000` lalu buka `http://localhost:8000/`.

## Menyambung data
Data dibaca langsung dari `https://gowithdme.com/data/events.json` dan `posts.json` (otomatis ikut terbaru), disimpan 5 menit di sessionStorage, cadangan ke `data/`. Pola URL hasil: event `/id/e/<slug>`, blog `/blog/<kategori>/<slug>`. Jika pola di situs induk berubah, ubah di `build()` pada `js/engine.js`.

## Tab AI (gaya Naver) dan sambungan ke ai.gowithdme.com
Setelah mencari, halaman berubah menjadi hasil dengan tab **AI** (bawaan), Semua, Event, Gunung, Blog, Halaman. Tab AI menampilkan jawaban ringkas (kalimat tebal, tabel, langkah bernomor, chip sumber), kartu Sumber, tombol Salin/Bagikan, saran lanjutan, dan tombol **Lanjutkan di GoWithDME AI** yang membuka `ai.gowithdme.com/?q=...&mode=...` langsung dengan pertanyaan itu.

Search dan AI memakai **satu Worker yang sama** (`dme-ai`, repo `ai`, folder `worker/`). Search mengirim `mode: "search"` beserta hasil teratas dari mesin lokal; Worker hanya menerima tautan `gowithdme.com`, menjawab dari data itu, dan mengembalikan `text` + `sources`. Kunci Groq/Gemini tetap hanya di Secret Cloudflare. Jika Worker mati atau lambat (25 dtk), tab AI otomatis menampilkan ringkasan tabel lokal.

**Urutan pasang:** (1) deploy Worker terbaru dari repo `ai` (`cd worker && bash deploy.sh`) karena origin `search.gowithdme.com` baru ditambahkan di sana; (2) push repo `ai`; (3) push repo `search`. Pengaturan ada di `js/config.js` (`AI_ENDPOINT`, `AI_CHAT_URL`).

## Tahap berikutnya
Komunitas dan ajakan (Supabase, kunci anon saja), halaman `/e/` per kategori, riwayat pencarian, pencarian gambar poster, sitemap, analitik.
