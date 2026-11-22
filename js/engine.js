/* GWM Search engine v2 — tanpa dependensi, jalan di browser.
   Alur: muat data -> bangun indeks terbalik berbobot -> pahami kueri (tanggal/harga/mdpl/kota)
         -> koreksi typo & perluas sinonim -> skor BM25 per field -> filter -> urutkan -> buang duplikat. */
(function(){
"use strict";
const C=window.SX_CONFIG;
const norm=s=>(s||"").toString().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^a-z0-9\s]/g," ").replace(/\s+/g," ").trim();
const strip=h=>(h||"").replace(/<[^>]+>/g," ").replace(/&[a-z#0-9]+;/g," ").replace(/\s+/g," ").trim();
const words=s=>{const n=norm(s);return n?n.split(" "):[]};
const NOW=()=>window.SX_NOW?new Date(window.SX_NOW+"T12:00:00"):new Date();
const ymd=d=>d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
const addD=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x};
const day0=()=>{const n=NOW();return new Date(n.getFullYear(),n.getMonth(),n.getDate())};

/* ---------------- konfigurasi bobot (satu tempat untuk menyetel) ---------------- */
const UNIT={rb:1e3,ribu:1e3,k:1e3,jt:1e6,juta:1e6};
const FW={t:6,a:9,c:4,e:3,b:1};          // judul, alias/singkatan, kota+venue, entitas (genre/lineup/gunung/tag), isi
const FK=Object.keys(FW),MAXSPAN=7;
const W={exact:1,prefix:.7,syn:.6,fuzzy:.8,phrase:8,allInTitle:3,startsTitle:4,city:5,
         soon:2.5,pastPenalty:-8,boostCap:5,boostW:.3,relaxedNeed:.5};

const CAT_WORDS={konser:"konser concert",festival:"festival fest",naikgunung:"gunung pendakian naik gunung open trip hiking",
 pameran:"pameran expo exhibition",seminar:"seminar workshop talk",meetup:"meetup kopdar komunitas",lainnya:"",
 komunitas:"komunitas forum"};
const PAGES=[
 ["Beranda GoWithDME","","Portal info konser, festival, dan naik gunung","beranda home utama"],
 ["Semua event","id/event","Kalender semua acara","event acara kalender jadwal agenda"],
 ["Naik gunung","id/gunung","Pendakian, open trip, checklist packing, patungan","gunung pendakian hiking open trip packing"],
 ["Cari teman jalan","id/teman","Ajakan barengan nonton konser atau mendaki","teman barengan ajakan"],
 ["Komunitas","id/komunitas","Forum dan grup per kota","komunitas forum grup"],
 ["Ajukan event atau open trip","id/ajukan","Kirim event untuk ditinjau admin","ajukan submit tambah event"],
 ["Bantuan dan FAQ","id/bantuan","Pertanyaan umum dan kontak","bantuan faq kontak"]
];

/* ---------------- data -> dokumen ---------------- */
function parsePrice(l){
 if(l==null)return null;const s=String(l).toLowerCase();
 if(/gratis|free|tanpa biaya/.test(s))return 0;
 const n=[...s.matchAll(/rp\.?\s*([\d.,]+)\s*(rb|ribu|k|jt|juta)?\b/g)].map(m=>{let v=+m[1].replace(/[.,]/g,"");if(m[2])v=m[1].includes(",")?+m[1].replace(",",".")*UNIT[m[2]]:v*UNIT[m[2]];return v}).filter(x=>x>=1000);
 return n.length?Math.min(...n):null;
}
/* Singkatan otomatis dari judul: "My Chemical Romance Live..." -> mcr; "5 Seconds of Summer" -> 5sos; "The Jesus and Mary Chain" -> jamc */
function acronyms(title){
 const out=new Set(),w=words(title);
 for(const st of [0,1]){
  if(st&&w[0]!=="the")break;let a="";
  for(let i=st;i<Math.min(w.length,st+6);i++){
   if(/^20\d\d$/.test(w[i]))break;a+=w[i][0];
   if(a.length>=3)out.add(a);}
 }
 return [...out];
}
function build(events,posts){
 const d=[],site=C.SITE;
 (events||[]).filter(e=>!e.status||e.status==="published").forEach(e=>{
  const city=typeof e.city==="object"&&e.city?e.city.name:(e.city||"");
  const hike=e.category==="naikgunung",price=parsePrice(e.price_label),alt=e.altitude_mdpl?+e.altitude_mdpl:null;
  const tags=[CAT_WORDS[e.category]||e.category,e.difficulty,price===0?"gratis free":"",price!=null&&price>0&&price<=100000?"murah hemat terjangkau":""];
  d.push({type:hike?"gunung":"event",cat:e.category,title:e.title,desc:e.description||"",url:`${site}/id/e/${e.slug}`,img:e.poster_url||"",
   date:e.event_date||"",end:e.end_date||e.event_date||"",city,venue:e.venue||"",price,alt,diff:e.difficulty||"",sponsor:e.sponsor_label||"",
   meta:[city,e.venue,e.price_label,e.mountain,alt?alt+" mdpl":"",e.difficulty].filter(Boolean),boost:+e.boost_score||0,
   F:{t:words(e.title+" "+(e.title_en||"")),a:acronyms(e.title),c:words(city+" "+(e.venue||"")),
      e:words([e.genre,e.lineup,e.organizer,e.mountain,...tags].filter(Boolean).join(" ")),
      b:words(((e.description||"")+" "+(e.description_en||"")).slice(0,1500))}});
 });
 (posts||[]).forEach(p=>{const body=strip(p.body);d.push({type:"blog",cat:p.category,title:p.title,desc:body.slice(0,400),
  url:`${site}/blog/${p.category}/${p.slug}`,img:"",date:(p.published_at||"").slice(0,10),end:"",city:"",venue:"",price:null,alt:null,diff:"",sponsor:"",
  meta:[p.category],boost:0,F:{t:words(p.title),a:[],c:[],e:words((p.tags||[]).join(" ")+" "+(p.category||"").replace(/-/g," ")),b:words(body.slice(0,3000))}})});
 PAGES.forEach(p=>d.push({type:"page",title:p[0],desc:p[2],url:`${site}/${p[1]}`,img:"",date:"",end:"",city:"",venue:"",price:null,alt:null,diff:"",sponsor:"",
  meta:[],boost:0,F:{t:words(p[0]),a:[],c:[],e:words(p[3]),b:words(p[2])}}));
 return d;
}

/* ---------------- indeks terbalik ---------------- */
let SYN={},DOCS=[],IDX=new Map(),DF=new Map(),VOCAB=[],AVG={},N=0,CITYW=new Set(),CITYN=new Map(),SYNG=[],ONEWAY={};
const NOCITY=new Set("barat selatan tengah utara timur hulu kota kab kabupaten".split(" "));
function index(){
 IDX=new Map();DF=new Map();const tot={};FK.forEach(f=>tot[f]=0);CITYW=new Set();CITYN=new Map();N=DOCS.length;
 DOCS.forEach((d,i)=>{const seen=new Set();d.fl={};
  for(const f of FK){const ws=d.F[f];d.fl[f]=ws.length;tot[f]+=ws.length;const tf=new Map();ws.forEach(w=>tf.set(w,(tf.get(w)||0)+1));
   tf.forEach((c,w)=>{let p=IDX.get(w);if(!p)IDX.set(w,p=[]);p.push([i,f,c]);seen.add(w)});}
  seen.forEach(w=>DF.set(w,(DF.get(w)||0)+1));
  d.eend=d.date&&d.end&&d.end>d.date?(new Date(d.end)-new Date(d.date)>MAXSPAN*864e5?ymd(addD(new Date(d.date+"T12:00:00"),MAXSPAN)):d.end):d.date;  // rentang >7 hari biasanya jendela pendaftaran, bukan lama acara
  d.past=!!d.date&&d.type!=="blog"&&d.eend<ymd(day0());
  d.nt=norm(d.title);d.tset=new Set(d.F.t.map(w=>w==="festival"?"fest":w));
  if(d.city){CITYN.set(norm(d.city),d.city);words(d.city).forEach(w=>{if(!NOCITY.has(w))CITYW.add(w)});}});
 FK.forEach(f=>AVG[f]=Math.max(1,tot[f]/Math.max(1,N)));
 VOCAB=[...IDX.keys()].sort();
}
const IDF=w=>{const n=DF.get(w)||0;return Math.log(1+(N-n+.5)/(n+.5))};
function lowerBound(a,x){let l=0,h=a.length;while(h>l){const m=(l+h)>>1;if(a[m]<x)l=m+1;else h=m}return l}

/* ---------------- sinonim ---------------- */
function loadSyn(sy){
 SYN=sy||{};ONEWAY=SYN._oneway||{};SYNG=[];
 for(const k in SYN){if(k[0]==="_")continue;const g=[k,...SYN[k]].map(norm).filter(Boolean);if(g.length>1)SYNG.push(g)}
}
const hasWord=(w)=>IDX.has(w);
function synAlts(word){ // alternatif satu kata, bobot sinonim
 const r=new Set();
 for(const g of SYNG)if(g.includes(word))g.forEach(x=>{if(x!==word)r.add(x)});
 const o=ONEWAY[word];if(o)o.map(norm).forEach(x=>r.add(x));
 return [...r];
}

/* ---------------- koreksi typo (Damerau-Levenshtein terbatas) ---------------- */
function dl(a,b,max){
 if(Math.abs(a.length-b.length)>max)return max+1;
 const al=a.length,bl=b.length;let p2=null,p1=Array.from({length:bl+1},(_,j)=>j);
 for(let i=1;i<=al;i++){const cur=[i];let mn=i;
  for(let j=1;j<=bl;j++){let v=Math.min(p1[j]+1,cur[j-1]+1,p1[j-1]+(a[i-1]===b[j-1]?0:1));
   if(i>1&&j>1&&a[i-1]===b[j-2]&&a[i-2]===b[j-1])v=Math.min(v,p2[j-2]+1);
   cur[j]=v;if(v<mn)mn=v}
  if(mn>max)return max+1;p2=p1;p1=cur}
 return p1[bl];
}
function correct(w){
 if(w.length<4||/\d/.test(w)||IDX.has(w))return [];
 const i=lowerBound(VOCAB,w);if(VOCAB[i]&&VOCAB[i].startsWith(w))return []; // masih diketik (awalan)
 const max=w.length<=5?1:2;let best=[],bd=max+1;
 for(const v of VOCAB){
  if(v[0]!==w[0]||Math.abs(v.length-w.length)>max||v.length<3)continue;
  const d=dl(w,v,max);if(d>max)continue;
  if(d===2&&(DF.get(v)||0)<8)continue;   // jarak 2 hanya ke kata yang umum di korpus (cegah koreksi liar)
  if(d<bd){bd=d;best=[v]}else if(d===bd)best.push(v);}
 return best.sort((a,b)=>(DF.get(b)||0)-(DF.get(a)||0)).slice(0,3);
}

/* ---------------- memahami kueri ---------------- */
const STOP=new Set(("di ke dari yang untuk dan atau dengan pada ini itu apa siapa kapan dimana mana bagaimana gimana saja aja ada adalah apakah the a of in to for tolong cari carikan dong ya nih "+
 "event acara kegiatan info jadwal agenda daftar list rekomendasi terbaru lagi sedang buat bisa mau ingin pengen yg dgn utk tentang soal hari").split(" "));
const INFO=new Set("tips cara panduan artikel checklist kenapa mengapa bagaimana gimana persiapan".split(" "));
const SOFT=new Set("konser concert tiket nonton".split(" ")); // kata kategori longgar: menambah skor, tidak wajib cocok bila ada kata lain
const MN="januari februari maret april mei juni juli agustus september oktober november desember".split(" ");
const MABB={jan:0,feb:1,mar:2,apr:3,jun:5,jul:6,agu:7,agt:7,sep:8,sept:8,okt:9,nov:10,des:11};
const DN={minggu:0,senin:1,selasa:2,rabu:3,kamis:4,jumat:5,sabtu:6};
const fmtN=n=>n.toLocaleString("id-ID");
const money=n=>n>=1e6?(n/1e6)+" jt":(n/1e3)+" rb";
function parse(raw){
 let s=" "+String(raw||"").toLowerCase().replace(/[’']/g,"")+" ";const o={from:null,to:null,near:false,price:null,alt:null,chips:[]};
 // 1) ketinggian: "di atas 3000 mdpl", "< 2500 mdpl", "3000 mdpl"
 s=s.replace(/(?:(di ?atas|lebih dari|minimal|min|>=?|di ?bawah|kurang dari|maks(?:imal)?|max|<=?)\s*)?(\d[\d.,]*)\s*(?:mdpl|mdp|meter)\b/,(m,c,n)=>{
  const v=+n.replace(/[.,]/g,"");if(v<100)return m;
  const up=/atas|lebih|min|>/.test(c||""),down=/bawah|kurang|mak|<|max/.test(c||"");
  o.alt=up?{min:v}:down?{max:v}:{near:v};
  o.chips.push(up?"≥ "+fmtN(v)+" mdpl":down?"≤ "+fmtN(v)+" mdpl":"sekitar "+fmtN(v)+" mdpl");return " "});
 // 2) anggaran: "di bawah 200rb", "budget 150k", "max rp200.000", "tiket 200rb"
 const price=(m,c,rp,n,u)=>{let v=+n.replace(/[.,]/g,"");if(u)v*=UNIT[u];else if(v<1000)return m;
  o.price={max:v};o.chips.push("≤ Rp "+fmtN(v));return " "};
 s=s.replace(/(di ?bawah|kurang dari|maks(?:imal)?|max|under|budget|dibawah|sampai|hingga|<=?)\s*(rp\.?\s*)?(\d[\d.,]*)\s*(rb|ribu|k|jt|juta)?\b/,(m,c,rp,n,u)=>price(m,c,rp,n,u));
 if(!o.price)s=s.replace(/()()\brp\.?\s*(\d[\d.,]*)\s*(rb|ribu|k|jt|juta)?\b/,(m,a,b,n,u)=>price(m,"","",n,u));
 if(!o.price)s=s.replace(/()()\b(\d{2,4})\s*(rb|ribu|k|jt|juta)\b/,(m,a,b,n,u)=>price(m,"","",n,u));
 s=" "+norm(s)+" ";
 if(!o.price&&/ (gratis|free|tanpa biaya) /.test(s)){s=s.replace(/ (gratis|free|tanpa biaya) /," ");o.price={max:0};o.chips.push("Gratis")}
 // 3) tanggal
 const t0=day0(),eat=(re,fn)=>{const m=s.match(re);if(m){s=s.replace(re," ");fn(m);return true}return false};
 const rng=(a,b,label)=>{o.from=ymd(a);o.to=ymd(b);if(label)o.chips.push(label)};
 const mon=m=>MN.indexOf(m);
 eat(/ (?:tanggal |tgl )?(\d{1,2}) (januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember|jan|feb|mar|apr|jun|jul|agu|agt|sept|sep|okt|nov|des)(?: (\d{4}))? /,m=>{
  const mo=MN.includes(m[2])?mon(m[2]):MABB[m[2]];let y=m[3]?+m[3]:t0.getFullYear();const dt=new Date(y,mo,+m[1]);
  if(!m[3]&&dt<t0)dt.setFullYear(y+1);rng(dt,dt,dt.toLocaleDateString("id-ID",{day:"numeric",month:"long"}))});
 if(!o.from){
  eat(/ bulan ini /,()=>rng(t0,new Date(t0.getFullYear(),t0.getMonth()+1,0),"bulan ini"));
  eat(/ bulan depan /,()=>rng(new Date(t0.getFullYear(),t0.getMonth()+1,1),new Date(t0.getFullYear(),t0.getMonth()+2,0),"bulan depan"));
  eat(/ minggu ini /,()=>rng(t0,addD(t0,(7-t0.getDay())%7),"minggu ini"));
  eat(/ minggu depan /,()=>{const mon1=addD(t0,((8-t0.getDay())%7)||7);rng(mon1,addD(mon1,6),"minggu depan")});
  eat(/ hari ini /,()=>rng(t0,t0,"hari ini"));
  eat(/ besok /,()=>rng(addD(t0,1),addD(t0,1),"besok"));
  eat(/ lusa /,()=>rng(addD(t0,2),addD(t0,2),"lusa"));
  eat(/ (akhir pekan|weekend|wiken) /,()=>{const w=t0.getDay();if(w===0)rng(t0,t0,"akhir pekan");else{const sat=addD(t0,6-w);rng(w===6?t0:sat,addD(sat,1),"akhir pekan")}});
  eat(/ (akhir tahun|liburan akhir tahun|nataru) /,()=>rng(new Date(t0.getFullYear(),11,1),new Date(t0.getFullYear(),11,31),"akhir tahun"));
  eat(/ (tahun baru|malam tahun baru|nye) /,()=>rng(new Date(t0.getFullYear(),11,31),new Date(t0.getFullYear()+1,0,2),"tahun baru"));
  eat(/ natal /,()=>rng(new Date(t0.getFullYear(),11,24),new Date(t0.getFullYear(),11,26),"natal"));
  eat(/ tahun depan /,()=>rng(new Date(t0.getFullYear()+1,0,1),new Date(t0.getFullYear()+1,11,31),"tahun depan"));
  if(!o.from)eat(new RegExp(" ("+MN.join("|")+")( \\d{4})? "),m=>{const mo=mon(m[1]);let y=m[2]?+m[2]:t0.getFullYear();if(!m[2]&&mo<t0.getMonth())y++;
   rng(new Date(y,mo,1),new Date(y,mo+1,0),m[1][0].toUpperCase()+m[1].slice(1)+" "+y)});
  if(!o.from)eat(/ (hari minggu|senin|selasa|rabu|kamis|jumat|sabtu) ?(ini|depan)? /,m=>{
   const nm=m[1].replace("hari ","");let n=(DN[nm]-t0.getDay()+7)%7;if(m[2]==="depan")n+=7;const dt=addD(t0,n);rng(dt,dt,nm+(m[2]?" "+m[2]:""))});
 }
 eat(/ (terdekat|segera|mendatang|akan datang|upcoming|sebentar lagi) /,()=>{o.near=true});
 if(o.near&&!o.from){o.from=ymd(t0);o.chips.push("terdekat")}
 const toks=s.split(" ").filter(t=>t&&!STOP.has(t));
 return Object.assign(o,{toks,q:toks.join(" "),info:toks.some(t=>INFO.has(t))});
}

/* ---------------- konsep: kata + sinonim + koreksi ---------------- */
function buildConcepts(toks,info,hasFilter){
 const cs=[];let rest=" "+toks.join(" ")+" ";
 // sinonim berkata banyak ("naik gunung") jadi satu konsep
 for(const g of SYNG)for(const m of g)if(m.includes(" ")&&rest.includes(" "+m+" ")){
  rest=rest.replace(" "+m+" "," ");
  const alts=[{w:m.split(" "),wt:1},...g.filter(x=>x!==m).map(x=>({w:x.split(" "),wt:W.syn}))];
  g.forEach(x=>(ONEWAY[x]||[]).forEach(y=>alts.push({w:norm(y).split(" "),wt:W.syn})));   // "jawa tengah" -> jateng -> semarang, solo, ...
  cs.push({label:m,alts});}
 for(const t of rest.split(" ").filter(Boolean)){
  const alts=[{w:[t],wt:1,pre:true}];
  synAlts(t).forEach(x=>alts.push({w:x.split(" "),wt:W.syn}));
  const fx=correct(t);fx.forEach(x=>{alts.push({w:[x],wt:W.fuzzy});info.fixed.push([t,x])});
  cs.push({label:t,alts});}
 cs.forEach(c=>{c.city=c.alts.some(a=>a.w.length===1&&CITYW.has(a.w[0]));c.soft=SOFT.has(c.label)});
 if(!hasFilter&&cs.every(c=>c.soft))cs.forEach(c=>c.soft=false);
 return cs;
}
/* skor satu kata untuk semua dokumen: Map(docIdx -> skor), opsional dibatasi 1 field */
function wordMap(w,prefix,only,cache){
 const key=w+"|"+prefix+"|"+(only||"");if(cache.has(key))return cache.get(key);
 const m=new Map(),add=(word,wt)=>{const post=IDX.get(word);if(!post)return;const idf=IDF(word);
  for(const [di,f,tf] of post){if(only&&f!==only)continue;
   const tfn=tf/(tf+1.2*(.25+.75*(DOCS[di].fl[f]/AVG[f])));m.set(di,(m.get(di)||0)+idf*FW[f]*tfn*wt)}};
 add(w,W.exact);
 if(prefix&&w.length>=3){for(let i=lowerBound(VOCAB,w);i<VOCAB.length&&VOCAB[i].startsWith(w);i++)if(VOCAB[i]!==w)add(VOCAB[i],W.prefix)}
 cache.set(key,m);return m;
}
function altMap(a,cache,only){ // frasa: semua kata harus ada, skor = rata-rata
 if(a.w.length===1)return wordMap(a.w[0],!!a.pre,only,cache);
 const ms=a.w.map(x=>wordMap(x,false,only,cache));const r=new Map();
 for(const [di,s] of ms[0]){let t=s,ok=true;for(let i=1;i<ms.length;i++){const v=ms[i].get(di);if(!v){ok=false;break}t+=v}if(ok)r.set(di,t/ms.length)}
 return r;
}
function conceptMap(c,cache,only){
 const k="C|"+c.label+"|"+(only||"");if(cache.has(k))return cache.get(k);
 const r=new Map();
 for(const a of c.alts)for(const [di,s] of altMap(a,cache,only)){const v=s*a.wt;if(v>(r.get(di)||0))r.set(di,v)}
 cache.set(k,r);return r;
}

/* ---------------- pencarian ---------------- */
function run(it,cs,tab,o){
 const cache=new Map(),today=ymd(day0()),hasF=!!(it.from||it.price||it.alt);
 const maps=cs.map(c=>conceptMap(c,cache)),cityMaps=cs.map(c=>c.city?conceptMap(c,cache,"c"):null);
 let cand;
 const softOnly=cs.length&&cs.every(c=>c.soft);
 if(cs.length&&!softOnly){cand=new Set();maps.forEach(m=>m.forEach((_,k)=>cand.add(k)))}else cand=new Set(DOCS.map((_,i)=>i));
 const from=it.from,to=o.widen?null:it.to,qn=it.q,qset=new Set(it.toks.map(w=>w==="festival"?"fest":w)),out=[];
 for(const di of cand){const d=DOCS[di];
  if(tab&&tab!=="all"&&d.type!==tab)continue;
  if((!cs.length||softOnly)&&(d.type==="blog"||d.type==="page"))continue;           // mode jelajah: hanya event
  if(!from&&(!cs.length||softOnly)&&d.past)continue;                    // mode jelajah tanpa tanggal: sembunyikan yang sudah lewat
  if(from){if(!d.date||d.type==="blog"||d.type==="page")continue;if(d.eend<from)continue;if(to&&d.date>to)continue}
  if(it.price&&!o.loose){if(d.price==null||d.price>it.price.max)continue}
  if(it.alt&&!o.loose){if(d.alt==null)continue;const a=it.alt;if(a.min&&d.alt<a.min)continue;if(a.max&&d.alt>a.max)continue;if(a.near&&d.alt<a.near-100)continue}
  let sc=hasF?1:0,hit=0,skip=false;
  for(let i=0;i<cs.length;i++){const v=maps[i].get(di),cm=cs[i].city&&cityMaps[i].get(di);
   if(cm)sc+=W.city;
   else if(cs[i].city&&d.city&&o.strict){skip=true;break}      // ketat: kota harus cocok di field kota (khusus event)
   if(v){if(!cs[i].soft)hit++;sc+=v}}
  if(skip)continue;
  if(cs.length){
   const hard=cs.filter(c=>!c.soft).length,need=o.strict?hard:Math.max(1,Math.ceil(hard*W.relaxedNeed));
   if(hit<need)continue;
   if(hit===hard)sc+=3;
   if(qn&&d.nt.includes(qn))sc+=W.phrase;
   if(qn&&d.nt.startsWith(qn))sc+=W.startsTitle;
   if(cs.length>1&&[...qset].every(w=>d.tset.has(w)))sc+=W.allInTitle;
  }
  if(it.alt&&it.alt.near&&d.alt)sc-=Math.abs(d.alt-it.alt.near)/1000;
  if(d.date&&d.type!=="blog"&&d.type!=="page"){
   if(d.past)sc+=W.pastPenalty;else{const days=(new Date(d.date+"T12:00:00")-new Date(today+"T12:00:00"))/864e5;sc+=W.soon*Math.exp(-Math.max(0,days)/30)}}
  else if(d.type==="blog"&&d.date){const age=(day0()-new Date(d.date+"T12:00:00"))/864e5;sc+=.6*Math.exp(-Math.max(0,age)/60)}
  if(it.info&&d.type==="blog")sc+=4;
  sc+=Math.min(d.boost,W.boostCap)*W.boostW;
  out.push({d,sc});
 }
 const byDate=!!from||!cs.length;
 const st=d=>from&&d.date<from?from:d.date;   // acara yang sudah berjalan dihitung mulai dari awal rentang
 out.sort(byDate?((a,b)=>st(a.d)<st(b.d)?-1:st(a.d)>st(b.d)?1:b.sc-a.sc):((a,b)=>b.sc-a.sc||(a.d.date<b.d.date?-1:1)));
 return out;
}
/* Buang duplikat (satu acara diunggah dua kali dengan judul agak beda). */
function dedupe(list){
 const kept=[];let dups=0;
 for(const x of list){const d=x.d;let dup=false;
  if(d.type==="event"||d.type==="gunung"){
   for(const k of kept){const e=k.d;if(e.type!==d.type||norm(e.city)!==norm(d.city)||!e.date||!d.date)continue;
    if(Math.abs(new Date(e.date)-new Date(d.date))>2*864e5)continue;
    let i=0;d.tset.forEach(w=>{if(e.tset.has(w))i++});const u=d.tset.size+e.tset.size-i;
    if(u&&i/u>=.6){dup=true;break}}}
  if(dup)dups++;else kept.push(x);}
 return {kept,dups};
}
let LAST={};
function search(q,tab){
 const it=parse(q),info={fixed:[]},cs=buildConcepts(it.toks,info,!!(it.from||it.price||it.alt));
 LAST={chips:it.chips.slice(),fixed:info.fixed,relaxed:false,widened:false,dups:0,browse:!cs.length&&!(it.from||it.price||it.alt)};
 cs.forEach(c=>{if(c.city){const w=c.alts.find(x=>x.w.length===1&&CITYW.has(x.w[0])).w[0];LAST.chips.unshift("Kota: "+w.replace(/\b\w/g,x=>x.toUpperCase()))}});
 let r;
 if(!cs.length&&!(it.from||it.price||it.alt)){ // hanya kata umum ("event"): tampilkan yang akan datang
  r=run(Object.assign({},it,{from:ymd(day0())}),cs,tab,{strict:true});LAST.chips.push("akan datang");
 }else{
  // Urutan pelonggaran = urutan "mana yang paling boleh dikorbankan": tanggal dulu, lalu kata, terakhir harga/mdpl. Kota tidak pernah dikorbankan sebelum kata lain.
  r=run(it,cs,tab,{strict:true});
  if(!r.length&&it.from){r=run(it,cs,tab,{strict:true,widen:true});LAST.widened=r.length>0}
  if(!r.length){r=run(it,cs,tab,{strict:false});LAST.relaxed=r.length>0;LAST.widened=false}
  if(!r.length&&it.from){r=run(it,cs,tab,{strict:false,widen:true});LAST.widened=r.length>0;LAST.relaxed=r.length>0}
  if(!r.length&&(it.price||it.alt)){r=run(it,cs,tab,{strict:false,loose:true,widen:!!it.from});LAST.relaxed=r.length>0;LAST.chips=LAST.chips.filter(c=>!/^[≤≥]|sekitar|Gratis/.test(c))}
 }
 const dd=dedupe(r);LAST.dups=dd.dups;
 if(LAST.fixed.length){let s=" "+norm(q)+" ";LAST.fixed.forEach(([a,b])=>{s=s.replace(" "+a+" "," "+b+" ")});LAST.didYouMean=s.trim()}
 return dd.kept.map(x=>x.d);
}

/* ---------------- saran ketikan ---------------- */
function suggest(q,max=6){
 const n=norm(q);if(n.length<2)return [];
 const ws=n.split(" "),last=ws[ws.length-1],head=ws.slice(0,-1).join(" "),out=[],seen=new Set();
 const push=s=>{const k=norm(s);if(s&&!seen.has(k)&&out.length<max){seen.add(k);out.push(s)}};
 const live=DOCS.filter(d=>(d.type==="event"||d.type==="gunung")&&!d.past);
 live.filter(d=>d.nt.startsWith(n)).forEach(d=>push(d.title));
 for(const [cn,city] of CITYN)if(last.length>=2&&cn.startsWith(last)){const pre=head?head.replace(/\b\w/g,x=>x.toUpperCase())+" ":"";push(head?pre+city:"Konser "+city);if(!head){push(city+" bulan ini");push("Festival "+city)}}
 live.filter(d=>d.nt.split(" ").some(w=>w.startsWith(n)||(ws.length>1&&d.nt.includes(n)))).forEach(d=>push(d.title));
 DOCS.filter(d=>d.nt.includes(n)).forEach(d=>push(d.title));
 if(out.length<max&&last.length>=3){const i=lowerBound(VOCAB,last),c=[];for(let j=i;j<VOCAB.length&&VOCAB[j].startsWith(last)&&c.length<40;j++)if(!/^\d+$/.test(VOCAB[j]))c.push(VOCAB[j]);
  c.sort((a,b)=>(DF.get(b)||0)-(DF.get(a)||0)).slice(0,3).forEach(w=>push((head?head+" ":"")+w))}
 if(!out.length&&n.length>=4){const fx=correct(last);fx.slice(0,2).forEach(w=>push((head?head+" ":"")+w))}
 return out;
}

/* ---------------- muat data ---------------- */
async function getJSON(url,local,key){
 try{const c=JSON.parse(sessionStorage.getItem(key)||"null");if(c&&Date.now()-c.t<C.CACHE_MIN*6e4)return c.v}catch(_){}
 for(const u of [url,local]){
  try{const ac=new AbortController(),to=setTimeout(()=>ac.abort(),6000);
   const r=await fetch(u,{cache:"no-cache",signal:ac.signal});clearTimeout(to);if(!r.ok)continue;const v=await r.json();
   try{sessionStorage.setItem(key,JSON.stringify({t:Date.now(),v}))}catch(_){}return v}catch(_){}
 }
 return [];
}
let loading=null;
function load(){
 if(loading)return loading;
 return loading=(async()=>{
  const [ev,po,sy]=await Promise.all([getJSON(C.EVENTS_URL,"data/events.json","sx_ev"),getJSON(C.POSTS_URL,"data/posts.json","sx_po"),getJSON("data/synonyms.json","data/synonyms.json","sx_sy")]);
  loadSyn(Array.isArray(sy)?{}:sy);DOCS=build(ev,po);index();return DOCS;})();
}
window.SX={load,search,suggest,norm,
 intent:q=>{const p=parse(q);return {toks:p.toks,from:p.from,to:p.to,near:p.near,q:p.q,price:p.price,alt:p.alt,chips:p.chips}},
 terms:q=>{const t=parse(q).toks.slice();(LAST.fixed||[]).forEach(f=>t.push(f[1]));return [...new Set(t)]},
 get last(){return LAST},
 _debug:{parse,acronyms,parsePrice,correct}};
})();
