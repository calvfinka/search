/* Jawaban ringkas. AI_ENDPOINT terisi -> Worker (Claude, hanya dari hasil teratas); kosong atau gagal -> ringkasan lokal tanpa AI. */
(function(){
const C=window.SX_CONFIG;
const fmt=d=>d?new Date(d+"T00:00:00").toLocaleDateString("id-ID",{day:"numeric",month:"long",year:"numeric"}):"";
const rp=n=>"Rp"+n.toLocaleString("id-ID");
const live=r=>r.filter(x=>(x.type==="event"||x.type==="gunung")&&!x.past);
/* Ringkasan lokal berbasis angka nyata dari hasil: jumlah, rentang tanggal, yang gratis, termurah, kota. */
function local(q,res){
 const ev=live(res);if(!ev.length)return "";
 const top=ev.slice(0,3).map(e=>`${e.title}${e.date?" ("+fmt(e.date)+")":""}${e.city?" di "+e.city:""}`);
 const free=ev.filter(e=>e.price===0).length,priced=ev.filter(e=>e.price>0).sort((a,b)=>a.price-b.price)[0];
 const dates=ev.map(e=>e.date).filter(Boolean).sort();
 let s=`Ada ${ev.length} hasil${dates.length>1?` dari ${fmt(dates[0])} sampai ${fmt(dates[dates.length-1])}`:""}. Teratas: ${top.join("; ")}.`;
 if(free)s+=` ${free} di antaranya gratis.`;
 if(priced&&ev.length>2)s+=` Harga mulai dari ${rp(priced.price)} (${priced.title}).`;
 return s;
}
async function answer(q,res){
 if(!C.AI_ENDPOINT)return {text:local(q,res),ai:false,cites:[]};
 try{
  const ctx=res.slice(0,6).map((r,i)=>({n:i+1,title:r.title,type:r.type,date:r.date,end:r.end,city:r.city,venue:r.venue,
   price:r.price,mdpl:r.alt,level:r.diff,past:r.past,desc:r.desc.slice(0,220),url:r.url}));
  const ac=new AbortController(),to=setTimeout(()=>ac.abort(),8000);
  const r=await fetch(C.AI_ENDPOINT,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({q,ctx,today:new Date().toISOString().slice(0,10)}),signal:ac.signal});
  clearTimeout(to);if(!r.ok)throw 0;const j=await r.json();
  return j.text?{text:j.text,ai:true,cites:ctx}:{text:local(q,res),ai:false,cites:[]};
 }catch(_){return {text:local(q,res),ai:false,cites:[]}}
}
window.SXAnswer={answer};
})();
