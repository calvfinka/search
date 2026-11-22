/* Jawaban ringkas. AI_ENDPOINT terisi -> Worker; kosong -> ringkasan lokal dari hasil teratas. */
(function(){
const C=window.SX_CONFIG;
const fmt=d=>d?new Date(d+"T00:00:00").toLocaleDateString("id-ID",{day:"numeric",month:"long",year:"numeric"}):"";
function local(q,res){
 const ev=res.filter(r=>r.type==="event"||r.type==="gunung").slice(0,4);
 if(!ev.length)return "";
 return `Untuk “${q}”, ada ${ev.length} hasil teratas: `+ev.map(e=>`${e.title}${e.date?" ("+fmt(e.date)+")":""}${e.meta[0]?" di "+e.meta[0]:""}`).join("; ")+".";
}
async function answer(q,res){
 if(!C.AI_ENDPOINT)return {text:local(q,res),ai:false};
 try{
  const ctx=res.slice(0,6).map(r=>({title:r.title,type:r.type,date:r.date,meta:r.meta,desc:r.desc.slice(0,200),url:r.url}));
  const r=await fetch(C.AI_ENDPOINT,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({q,ctx})});
  if(!r.ok)throw 0;const j=await r.json();return {text:j.text||local(q,res),ai:!!j.text};
 }catch(_){return {text:local(q,res),ai:false}}
}
window.SXAnswer={answer};
})();
