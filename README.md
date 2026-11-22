# GWM Search — search.gowithdme.com

Mesin pencari statis untuk ekosistem GoWithDME (event, gunung, blog, halaman). Mirip portal pencarian Naver: kolom besar di beranda, saran ketikan, tab kategori, ringkasan jawaban di atas hasil.

## Struktur
```
CNAME                 search.gowithdme.com (GitHub Pages)
index.html            beranda + hasil (satu halaman, rute ?q=...&tab=...)
404.html  robots.txt  manifest.webmanifest  opensearch.xml (bisa ditambah ke browser sebagai mesin cari)
css/search.css        tampilan (terang/gelap otomatis)
js/config.js          SATU-SATUNYA tempat sambungan ke gowithdme.com
js/engine.js          indeks terbalik, skor BM25 per field, pemahaman kueri, typo, singkatan, saran (lihat "Cara kerja")
js/answer.js          ringkasan lokal atau jawaban AI (opsional)
js/app.js             UI: rute, tab, paging, saran, pintasan "/"
data/                 cadangan events.json, posts.json + synonyms.json
worker/ai-answer.js   Cloudflare Worker opsional untuk jawaban AI
tools/sync.py         salin data dari gowithdme.com
tools/eval.js         uji kualitas: node tools/eval.js js/engine.js . -v
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

## Cara kerja mesin (v2)
Satu kueri melewati enam tahap:
1. **Indeks** (sekali saat muat): tiap dokumen dipecah ke 5 field berbobot: judul 6, singkatan 9, kota+venue 4, entitas (genre, lineup, gunung, tingkat, tag) 3, isi 1. Disimpan sebagai indeks terbalik kata -> dokumen.
2. **Memahami kueri**: tanggal ("bulan depan", "5 desember", "akhir pekan", "natal"), harga ("gratis", "di bawah 200rb"), ketinggian ("di atas 3000 mdpl"), dan kata penting. Kata umum ("event", "acara") dibuang. Bagian yang dipahami jadi filter dan ditampilkan sebagai chip.
3. **Memperluas kata**: sinonim (`data/synonyms.json`), singkatan otomatis dari judul (mcr, 5sos, jamc), dan koreksi typo ke kata yang ada di korpus.
4. **Skor**: BM25 per field. Kata langka lebih berharga daripada kata umum. Kota yang cocok di field kota mendapat bonus. Acara dekat naik, acara lewat turun.
5. **Filter bertahap**: ketat dulu (semua kata wajib). Kosong -> lebarkan tanggal -> longgarkan kata -> lepas harga/mdpl. Setiap pelonggaran diberi tahu ke pengguna.
6. **Rapikan**: buang acara ganda, urut tanggal jika kueri bertanggal.
Angka bobot ada di satu tempat: `FW` dan `W` di atas `engine.js`.

## Kualitas
`node tools/eval.js js/engine.js . -v` menjalankan 33 kueri dengan jawaban yang diketahui dan memberi skor. Jalankan setiap mengubah bobot atau sinonim. Tambah kasus baru di `CASES` setiap ada kueri nyata yang gagal.

## Catatan data
`end_date` yang lebih dari 7 hari dari `event_date` dianggap jendela pendaftaran, bukan lama acara. Perbaiki di sumber bila itu keliru.

## Tahap berikutnya
Komunitas dan ajakan (Supabase, kunci anon saja), halaman `/e/` per kategori, riwayat pencarian, pencarian gambar poster, sitemap, analitik.
