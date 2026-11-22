#!/usr/bin/env node
/* Evaluasi mesin pencari. Pakai: node tools/eval.js [engine.js] [folder-proyek]
   Tiap kasus punya predikat "benar"; skor = porsi hasil teratas yang benar. "Hari ini" dikunci ke 2026-11-22. */
const fs=require("fs"),path=require("path");
const eng=path.resolve(process.argv[2]||path.join(__dirname,"../js/engine.js")),proj=path.resolve(process.argv[3]||path.join(__dirname,".."));
const TODAY="2026-11-22",RealDate=Date;
global.Date=class extends RealDate{constructor(...a){if(a.length)super(...a);else super(TODAY+"T12:00:00")}static now(){return new RealDate(TODAY+"T12:00:00").getTime()}};
global.window={SX_CONFIG:{SITE:"https://gowithdme.com",EVENTS_URL:"x",POSTS_URL:"x",CACHE_MIN:5},SX_NOW:TODAY};
global.sessionStorage={getItem:()=>null,setItem(){}};
global.fetch=async u=>{const f=path.join(proj,u);return fs.existsSync(f)?{ok:true,json:async()=>JSON.parse(fs.readFileSync(f,"utf8"))}:{ok:false}};
eval(fs.readFileSync(eng,"utf8"));const SX=window.SX;
/* Kebenaran dasar dari events.json (bukan dari mesin), supaya mesin lama & baru dinilai sama. */
const RAW=JSON.parse(fs.readFileSync(path.join(proj,"data/events.json"),"utf8")),GT={};
const price=l=>{if(l==null)return null;const t=String(l).toLowerCase();if(/gratis|free/.test(t))return 0;const n=[...t.matchAll(/rp\.?\s*([\d.,]+)/g)].map(m=>+m[1].replace(/[.,]/g,"")).filter(x=>x>0);return n.length?Math.min(...n):null};
RAW.forEach(e=>GT["/id/e/"+e.slug]={city:e.city||"",price:price(e.price_label),alt:e.altitude_mdpl?+e.altitude_mdpl:null,diff:e.difficulty||"",date:e.event_date||"",end:e.end_date||e.event_date||""});
const wrap=d=>{const g=GT[d.url.replace(/^https?:\/\/[^/]+/,"")];return g?Object.assign(Object.create(d),g,{past:g.end<TODAY}):d};
const ov=(d,a,b)=>d.date&&d.type!=="blog"&&d.type!=="page"&&(d.end||d.date)>=a&&d.date<=b;
const ev=d=>d.type==="event"||d.type==="gunung";
const city=(d,re)=>ev(d)&&re.test(d.city||"");
const T=(re)=>d=>re.test(d.title);
/* [kueri, mode, predikat, k]  mode: top1 | prec (porsi k teratas benar) | empty (idealnya tak ada hasil) | one (tepat satu yang cocok = tanpa duplikat) */
const CASES=[
 ["5sos","top1",T(/5 seconds/i)],["mcr","top1",T(/chemical romance/i)],["jamc","prec",T(/jesus and mary/i),2],
 ["voces8","top1",T(/voces8/i)],["merbabu","top1",T(/merbabu/i)],["open trip prau","top1",T(/prau/i)],["hardcore jakarta","top1",d=>/hardcore/i.test(d.title)&&city(d,/jakarta/i)],
 ["jogja","prec",d=>city(d,/yogya|sleman|bantul/i)],["bandung","prec",d=>city(d,/bandung/i)],
 ["konser jakarta","prec",d=>city(d,/jakarta/i)],["konsrt jakrta","prec",d=>city(d,/jakarta/i)],["konser bandung","prec",d=>city(d,/bandung/i)],
 ["konser gratis","prec",d=>ev(d)&&d.price===0],["gratis","prec",d=>ev(d)&&d.price===0],
 ["festival di bawah 100rb","prec",d=>ev(d)&&d.price!=null&&d.price<=1e5],["tiket murah bandung","prec",d=>city(d,/bandung/i)&&d.price!=null&&d.price<=1e5],
 ["gunung pemula","prec",d=>d.diff==="pemula"||/pemula/i.test(d.title)],["gunung 3000 mdpl","prec",d=>d.alt>=2900],["di atas 3000 mdpl","prec",d=>d.alt>=3000],
 ["pendakian desember","prec",d=>d.type==="gunung"&&ov(d,"2026-12-01","2026-12-31")],
 ["akhir pekan ini","prec",d=>ov(d,"2026-11-22","2026-11-22")],["sabtu ini","prec",d=>ov(d,"2026-11-28","2026-11-28")],
 ["bulan depan","prec",d=>ov(d,"2026-12-01","2026-12-31")],["5 desember","prec",d=>ov(d,"2026-12-05","2026-12-05")],
 ["konser bali bulan depan","prec",d=>city(d,/denpasar|badung|bali/i)&&ov(d,"2026-12-01","2026-12-31")],
 ["festival musik akhir tahun","prec",d=>ov(d,"2026-12-01","2026-12-31")],["natal","prec",d=>ov(d,"2026-12-24","2026-12-26")],
 ["event","prec",d=>ev(d)&&!d.past],["tips nonton konser","prec",d=>d.type==="blog"],["checklist packing gunung","top1",d=>d.type==="blog"&&/packing/i.test(d.title)],
 ["coldplay","empty"],["jns fest tangerang","one",T(/jns/i)],["jesus and mary chain","one",T(/jesus and mary chain – jakarta/i)]
];
(async()=>{await SX.load();let tot=0,rows=[];
 for(const [q,mode,fn,k=5] of CASES){const r=SX.search(q,"all").map(wrap);let s=0;
  if(mode==="top1")s=r[0]&&fn(r[0])?1:0;
  else if(mode==="empty")s=r.length===0?1:0;
  else if(mode==="one")s=r.slice(0,10).filter(fn).length===1?1:0;
  else{const t=r.slice(0,k);s=t.length?t.filter(fn).length/t.length:0}
  tot+=s;rows.push([q,mode,s,r.length,r[0]?r[0].title.slice(0,46):"(kosong)"]);}
 if(process.argv.includes("-v"))rows.forEach(x=>console.log((x[2]>=1?"OK  ":x[2]>0?"~   ":"GAGAL")+" "+x[0].padEnd(30)+(x[2]*100|0).toString().padStart(4)+"%  n="+String(x[3]).padEnd(4)+x[4]));
 console.log(`SKOR ${path.basename(path.dirname(path.dirname(eng)))}: ${tot.toFixed(1)} / ${CASES.length}  (${(100*tot/CASES.length).toFixed(0)}%)`);
})();
