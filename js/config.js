// Satu-satunya berkas yang perlu diubah untuk menyambung ke situs induk dan AI.
window.SX_CONFIG = {
  SITE: "https://gowithdme.com",
  // Sumber data (GitHub Pages mengirim CORS terbuka). Gagal -> pakai salinan di data/.
  EVENTS_URL: "https://gowithdme.com/data/events.json",
  POSTS_URL:  "https://gowithdme.com/data/posts.json",
  // Worker AI yang sama dengan ai.gowithdme.com (repo "ai", folder worker/). Mode "search" menjawab ringkas dari hasil pencarian.
  // Kosong atau gagal = tab AI memakai ringkasan lokal (tabel hasil teratas), tanpa error.
  AI_ENDPOINT: "https://dme-ai.calvfinka.workers.dev",
  // Lanjut ngobrol: ai.gowithdme.com/?q=...&mode=gunung|konser|trip membuka chat baru dengan pertanyaan itu.
  AI_CHAT_URL: "https://ai.gowithdme.com/",
  AI_TIMEOUT_MS: 25000,
  CACHE_MIN: 5,
  AI_CACHE_MIN: 15,
  PER_PAGE: 10,
  SUGGEST: [
    ["Konser", "Konser terdekat di Bandung bulan ini"],
    ["Gunung", "Gunung apa yang cocok untuk pemula?"],
    ["Festival", "Festival musik akhir tahun 2026"],
    ["Blog", "Tips nonton konser bareng teman"]
  ]
};
