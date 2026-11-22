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
js/answer.js          ringkasan lokal atau jawaban AI (opsional)
js/app.js             UI: rute, tab, paging, saran, pintasan "/"
data/                 cadangan events.json, posts.json + synonyms.json
worker/ai-answer.js   Cloudflare Worker opsional untuk jawaban AI
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

## Jawaban AI (opsional)
Isi `AI_ENDPOINT` di `js/config.js` dengan URL Worker. Kunci API hanya di Secret Cloudflare, jangan di repo.

## Tahap berikutnya
Komunitas dan ajakan (Supabase, kunci anon saja), halaman `/e/` per kategori, riwayat pencarian, pencarian gambar poster, sitemap, analitik.
