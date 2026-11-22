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
function build(events,posts){
 const d=[];const site=C.SITE;
 (events||[]).filter(e=>!e.status||e.status==="published").forEach(e=>{
  const city=typeof e.city==="object"&&e.city?e.city.name:(e.city||"");
  const hike=e.category==="naikgunung";
  d.push({type:hike?"gunung":"event",cat:e.category,title:e.title,
   desc:e.description||"",url:`${site}/id/e/${e.slug}`,img:e.poster_url||"",
   date:e.event_date||"",meta:[city,e.venue,e.price_label,e.mountain,e.altitude_mdpl?e.altitude_mdpl+" mdpl":"",e.difficulty].filter(Boolean),
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
function search(q,tab){
 const r=run(q,tab,true);return r.length?r:run(q,tab,false);
}
function run(q,tab,strict){
 const n=norm(q);if(!n)return [];const toks=n.split(" ");const groups=toks.map(expand);
 const today=new Date().toISOString().slice(0,10);const out=[];
 for(const d of DOCS||[]){
  if(tab&&tab!=="all"&&d.type!==tab)continue;
  let sc=0,hit=0;const words=d.nt.split(" ");
  if(d.nt.includes(n))sc+=12;
  for(const g of groups){let best=0;
   for(const t of g){const w=t===g[0]?1:.6;
    if(d.nt.includes(t))best=Math.max(best,(words.includes(t)?6:4)*w);
    else if(d.nb.includes(t))best=Math.max(best,1.5*w);
    else if(t.length>=5&&d.ws.some(x=>lev1(t,x)))best=Math.max(best,2*w);}
   if(best){hit++;sc+=best}}
  if(!hit||(toks.length>1&&hit<(strict?toks.length:Math.ceil(toks.length/2))))continue;
  sc+=hit===toks.length?3:0;
  if(d.date&&d.type!=="blog"){const f=d.date>=today;sc+=f?2:-1;if(f){const days=(new Date(d.date)-new Date(today))/864e5;if(days<=30)sc+=1.5}}
  sc+=Math.min(d.boost,5)*.3;
  out.push({d,sc});
 }
 return out.sort((a,b)=>b.sc-a.sc).map(x=>x.d);
}
function suggest(q,max=6){
 const n=norm(q);if(n.length<2)return [];const seen=new Set(),r=[];
 for(const d of DOCS||[]){if(d.nt.includes(n)&&!seen.has(d.nt)){seen.add(d.nt);r.push(d.title);if(r.length>=max)break}}
 return r;
}
window.SX={load,search,suggest,norm};
})();
