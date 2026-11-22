/* Mesin pencari: ambil data, normalisasi, beri skor. Tanpa dependensi. */
(function(){
const C=window.SX_CONFIG;
const norm=s=>(s||"").toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9\s]/g," ").replace(/\s+/g," ").trim();
const strip=h=>(h||"").replace(/<[^>]+>/g," ").replace(/&[a-z#0-9]+;/g," ").replace(/\s+/g," ").trim();
const PAGES=[
 ["Beranda GoWithDME","","Portal info konser, festival, dan naik gunung","beranda home utama"],
 ["Semua event","id/event","Kalender semua acara","event acara kalender"],
 ["Naik gunung","id/gunung","Pendakian, open trip, checklist packing, patungan","gunung pendakian hiking open trip packing"],
 ["Cari teman jalan","id/teman","Ajakan barengan nonton konser atau mendaki","teman barengan ajakan"],
 ["Komunitas","id/komunitas","Forum dan grup per kota","komunitas forum grup"],
 ["Ajukan event atau open trip","id/ajukan","Kirim event untuk ditinjau admin","ajukan submit tambah event"],
 ["Bantuan dan FAQ","id/bantuan","Pertanyaan umum dan kontak","bantuan faq kontak"]
];
const abs=u=>!u?"":/^https?:\/\//i.test(u)?u:C.SITE+"/"+String(u).replace(/^\/+/,"");
function build(events,posts){
 const d=[];const site=C.SITE;
 (events||[]).filter(e=>!e.status||e.status==="published").forEach(e=>{
  const city=typeof e.city==="object"&&e.city?e.city.name:(e.city||"");
  const hike=e.category==="naikgunung";
  d.push({type:hike?"gunung":"event",cat:e.category,title:e.title,
   desc:e.description||"",url:`${site}/id/e/${e.slug}`,img:abs(e.poster_url),
   date:e.event_date||"",end:e.end_date||"",meta:[city,e.venue,e.price_label,e.mountain,e.altitude_mdpl?e.altitude_mdpl+" mdpl":"",e.difficulty].filter(Boolean),
   extra:[e.genre,e.lineup,e.organizer,e.mountain,e.title_en,city,e.category].filter(Boolean).join(" "),boost:+e.boost_score||0});
 });
 (posts||[]).forEach(p=>d.push({type:"blog",cat:p.category,title:p.title,
  desc:strip(p.body).slice(0,400),url:`${site}/blog/${p.category}/${p.slug}`,img:"",date:(p.published_at||"").slice(0,10),
  meta:[p.category],extra:(p.tags||[]).toString()+" "+strip(p.body).slice(0,3000),boost:0}));
 PAGES.forEach(p=>d.push({type:"page",title:p[0],desc:p[2],url:`${site}/${p[1]}`,img:"",date:"",meta:[],extra:p[3],boost:0}));
 d.forEach(x=>{x.nt=norm(x.title);x.nb=norm(x.desc+" "+x.meta.join(" ")+" "+x.extra);x.ws=[...new Set((x.nt+" "+x.nb.slice(0,1500)).split(" "))];});
 return d;
}
async function getJSON(url,local,key){
 try{const c=JSON.parse(sessionStorage.getItem(key)||"null");
  if(c&&Date.now()-c.t<C.CACHE_MIN*6e4)return c.v;}catch(_){}
 for(const u of [url,local]){
  try{const r=await fetch(u,{cache:"no-cache"});if(!r.ok)continue;const v=await r.json();
   try{sessionStorage.setItem(key,JSON.stringify({t:Date.now(),v}))}catch(_){}
   return v;}catch(_){}
 }
 return [];
}
let SYN={},DOCS=null;
async function load(){
 if(DOCS)return DOCS;
 const [ev,po,sy]=await Promise.all([getJSON(C.EVENTS_URL,"data/events.json","sx_ev"),getJSON(C.POSTS_URL,"data/posts.json","sx_po"),getJSON("data/synonyms.json","data/synonyms.json","sx_sy")]);
 SYN=sy||{};DOCS=build(ev,po);return DOCS;
}
function lev1(a,b){
 if(Math.abs(a.length-b.length)>1)return false;let i=0,j=0,e=0;
 while(i<a.length&&j<b.length){if(a[i]===b[j]){i++;j++;continue}if(++e>1)return false;
  if(a.length>b.length)i++;else if(a.length<b.length)j++;else{i++;j++}}
 return e+(a.length-i)+(b.length-j)<=1;
}
function expand(tok){const s=new Set([tok]);for(const k in SYN){const g=[k,...SYN[k]].map(norm);if(g.includes(tok))g.forEach(x=>x.split(" ").forEach(w=>s.add(w)));}return [...s];}
const STOP=new Set("di ke dari yang untuk dan atau dengan pada ini itu apa siapa kapan dimana mana bagaimana gimana saja aja ada adalah apakah the a of in to for tolong cari carikan dong ya nih".split(" "));
const MN="januari februari maret april mei juni juli agustus september oktober november desember".split(" ");
const ymd=d=>d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
const addD=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x};
/* Pahami "bulan ini", "terdekat", "desember 2026", dst. -> filter tanggal; sisanya jadi kata kunci. */
function intent(n){
 let s=" "+n+" ",from=null,to=null,near=false;const now=new Date(),t0=new Date(now.getFullYear(),now.getMonth(),now.getDate());
 const eat=(re,fn)=>{const m=s.match(re);if(m){s=s.replace(re," ");fn(m)}};
 eat(/ bulan ini /,()=>{from=ymd(t0);to=ymd(new Date(t0.getFullYear(),t0.getMonth()+1,0))});
 eat(/ bulan depan /,()=>{from=ymd(new Date(t0.getFullYear(),t0.getMonth()+1,1));to=ymd(new Date(t0.getFullYear(),t0.getMonth()+2,0))});
 eat(/ minggu ini /,()=>{from=ymd(t0);to=ymd(addD(t0,(7-t0.getDay())%7))});
 eat(/ hari ini /,()=>{from=to=ymd(t0)});
 eat(/ besok /,()=>{from=to=ymd(addD(t0,1))});
 eat(/ (akhir pekan|weekend) /,()=>{const w=t0.getDay();if(w===0)from=to=ymd(t0);else{const sat=addD(t0,6-w);from=ymd(sat);to=ymd(addD(sat,1))}});
 eat(/ akhir tahun /,()=>{from=ymd(new Date(t0.getFullYear(),11,1));to=ymd(new Date(t0.getFullYear(),11,31))});
 eat(new RegExp(" ("+MN.join("|")+")( \\d{4})? "),m=>{const mo=MN.indexOf(m[1]);let y=m[2]?+m[2]:t0.getFullYear();if(!m[2]&&mo<t0.getMonth())y++;from=ymd(new Date(y,mo,1));to=ymd(new Date(y,mo+1,0))});
 eat(/ (terdekat|segera|mendatang|akan datang) /,()=>{near=true});
 if(near&&!from)from=ymd(t0);
 const toks=s.split(" ").filter(t=>t&&!STOP.has(t));
 return {toks,from,to,near,q:toks.join(" ")};
}
const has=(str,t)=>t.length<4?(" "+str).includes(" "+t):str.includes(t);
function search(q,tab){
 const r=run(q,tab,true);return r.length?r:run(q,tab,false);
}
function run(q,tab,strict){
 const it=intent(norm(q)),toks=it.toks,dated=!!it.from;
 if(!toks.length&&!dated)return [];
 const groups=toks.map(expand);const today=ymd(new Date());const out=[];
 for(const d of DOCS||[]){
  if(tab&&tab!=="all"&&d.type!==tab)continue;
  if(dated){
   if(!d.date||d.type==="blog"||d.type==="page")continue;
   const end=d.end||d.date;
   if(end<it.from)continue;if(it.to&&d.date>it.to)continue;
  }
  let sc=dated?1:0,hit=0;
  if(toks.length&&d.nt.includes(it.q))sc+=12;
  for(const g of groups){let best=0;
   for(const t of g){const w=t===g[0]?1:.6;
    if(has(d.nt,t))best=Math.max(best,(d.nt.split(" ").includes(t)?6:4)*w);
    else if(has(d.nb,t))best=Math.max(best,1.5*w);
    else if(t.length>=5&&d.ws.some(x=>lev1(t,x)))best=Math.max(best,2*w);}
   if(best){hit++;sc+=best}}
  if(toks.length){
   const need=strict?toks.length:Math.ceil(toks.length/2);
   if(!hit||hit<need)continue;
   if(hit===toks.length)sc+=3;
  }
  if(d.date&&d.type!=="blog"&&!dated){const f=d.date>=today;sc+=f?2:-1;if(f){const days=(new Date(d.date)-new Date(today))/864e5;if(days<=30)sc+=1.5}}
  sc+=Math.min(d.boost,5)*.3;
  out.push({d,sc});
 }
 out.sort(dated?((a,b)=>(a.d.date<b.d.date?-1:a.d.date>b.d.date?1:b.sc-a.sc)):((a,b)=>b.sc-a.sc));
 return out.map(x=>x.d);
}
function suggest(q,max=6){
 const n=norm(q);if(n.length<2)return [];const seen=new Set(),r=[];
 for(const d of DOCS||[]){if(d.nt.includes(n)&&!seen.has(d.nt)){seen.add(d.nt);r.push(d.title);if(r.length>=max)break}}
 return r;
}
window.SX={load,search,suggest,norm,intent:q=>intent(norm(q)),terms:q=>intent(norm(q)).toks};
})();
