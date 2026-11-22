// Satu-satunya berkas yang perlu diubah untuk menyambung ke situs induk.
window.SX_CONFIG = {
  SITE: "https://gowithdme.com",
  // Sumber data (GitHub Pages mengirim CORS terbuka). Gagal -> pakai salinan di data/.
  EVENTS_URL: "https://gowithdme.com/data/events.json",
  POSTS_URL:  "https://gowithdme.com/data/posts.json",
  // Opsional: isi URL Cloudflare Worker (worker/ai-answer.js) agar ada jawaban AI.
  // Kosong = ringkasan lokal dari hasil pencarian.
  AI_ENDPOINT: "",
  CACHE_MIN: 5,
  PER_PAGE: 10,
  SUGGEST: [
    ["Konser", "Konser terdekat di Bandung bulan ini"],
    ["Gunung", "Gunung apa yang cocok untuk pemula?"],
    ["Festival", "Festival musik akhir tahun 2026"],
    ["Blog", "Tips nonton konser bareng teman"]
  ]
};
