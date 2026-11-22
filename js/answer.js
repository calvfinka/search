/* Tab AI: jawaban dari Worker AI (mode "search") atau, bila gagal/kosong, ringkasan lokal berupa tabel hasil teratas. */
(function(){
const C=window.SX_CONFIG;
const SAFE=/^https:\/\/gowithdme\.com\/[A-Za-z0-9\-._~\/?=#%&]*$/;
const fmt=d=>d?new Date(d+"T00:00:00").toLocaleDateString("id-ID",{day:"numeric",month:"short",year:"numeric"}):"";
const cell=s=>String(s||"").replace(/[|\n\r]/g," ").trim();
const toSrc=r=>({title:r.title,type:r.type,date:r.date||"",meta:(r.meta||[]).slice(0,3),desc:(r.desc||"").slice(0,220),url:r.url,img:r.img||""});

function local(q,res){
 const top=res.slice(0,5);
 if(!top.length)return {text:"",sources:[],ai:false};
 const rows=top.map((r,i)=>`| ${cell(r.title)} [${i+1}] | ${r.type==="blog"||r.type==="page"?"–":(fmt(r.date)||"–")} | ${cell(r.meta[0])||"–"} |`);
 const text=`Ditemukan **${res.length} hasil** di GoWithDME untuk “${cell(q)}”. Berikut yang paling cocok.\n\n## Hasil teratas\n| Nama | Tanggal | Lokasi |\n|---|---|---|\n${rows.join("\n")}\n\nBuka sumbernya untuk detail tiket dan jadwal resmi.`;
 return {text,sources:top.map(toSrc),ai:false};
}
const ckey=q=>"sx_ai:"+q.toLowerCase().slice(0,120);
function cached(q){try{const c=JSON.parse(sessionStorage.getItem(ckey(q))||"null");if(c&&Date.now()-c.t<C.AI_CACHE_MIN*6e4)return c.v}catch(_){}return null}
function keep(q,v){try{sessionStorage.setItem(ckey(q),JSON.stringify({t:Date.now(),v}))}catch(_){}}

async function answer(q,res){
 const hit=cached(q);if(hit)return hit;
 if(!C.AI_ENDPOINT)return local(q,res);
 const ctx=res.slice(0,6).map(toSrc);
 const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),C.AI_TIMEOUT_MS||25000);
 try{
  const r=await fetch(C.AI_ENDPOINT,{method:"POST",headers:{"Content-Type":"application/json"},signal:ctl.signal,
   body:JSON.stringify({mode:"search",history:[{role:"user",content:q.slice(0,200)}],ctx:ctx.map(({img,...x})=>x)})});
  if(!r.ok)throw 0;
  const j=await r.json();if(!j||!j.text)throw 0;
  // Sumber dipercaya hanya jika tautannya milik gowithdme.com; gambar diambil dari hasil lokal dengan URL yang sama.
  const img=new Map(res.map(x=>[x.url,x.img||""]));
  const sources=(Array.isArray(j.sources)?j.sources:ctx).filter(s=>s&&typeof s.url==="string"&&SAFE.test(s.url))
   .map(s=>({title:String(s.title||""),type:String(s.type||""),date:String(s.date||""),meta:Array.isArray(s.meta)?s.meta.slice(0,3).map(String):[],desc:String(s.desc||""),url:s.url,img:img.get(s.url)||""}));
  const v={text:String(j.text),sources,ai:true};keep(q,v);return v;
 }catch(_){return local(q,res)}
 finally{clearTimeout(timer)}
}
window.SXAnswer={answer};
})();
