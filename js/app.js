(function(){
const C=window.SX_CONFIG,$=id=>document.getElementById(id),D=$("drawer");
const TABS=[["ai","AI"],["all","Semua"],["event","Event"],["gunung","Gunung"],["blog","Blog"],["page","Halaman"]];
const LABEL={event:"Event",gunung:"Gunung",blog:"Blog",page:"Halaman"};
let q="",tab="ai",shown=0,results=[],reqId=0;
const esc=s=>(s||"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fmt=d=>d?new Date(d+"T00:00:00").toLocaleDateString("id-ID",{day:"numeric",month:"short",year:"numeric"}):"";
function hl(t,terms){let o=esc(t);terms.filter(w=>w.length>1).forEach(w=>{try{o=o.replace(new RegExp("(?<![\\p{L}\\p{N}])("+w.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+")","giu"),"<mark>$1</mark>")}catch(_){}});return o}

/* ---------- tema ---------- */
function setTheme(t,save){
 const r=document.documentElement;t==="auto"?r.removeAttribute("data-theme"):r.setAttribute("data-theme",t);
 if(save)try{t==="auto"?localStorage.removeItem("sx_theme"):localStorage.setItem("sx_theme",t)}catch(_){}
 document.querySelectorAll("#themeSeg button").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.t===t)));
}
let th="auto";try{th=localStorage.getItem("sx_theme")||"auto"}catch(_){}setTheme(th,false);
$("themeSeg").addEventListener("click",e=>{const b=e.target.closest("button");if(b)setTheme(b.dataset.t,true)});

/* ---------- riwayat (hanya di perangkat) ---------- */
const HK="sx_hist";
const hist=()=>{try{return JSON.parse(localStorage.getItem(HK)||"[]")}catch(_){return []}};
const saveH=a=>{try{localStorage.setItem(HK,JSON.stringify(a.slice(0,30)))}catch(_){}};
const pushH=t=>saveH([t,...hist().filter(x=>x.toLowerCase()!==t.toLowerCase())]);
function drawH(){const h=hist();
 $("hist").innerHTML=h.length?h.map((t,i)=>`<li><button class="hq" type="button" data-q="${esc(t)}">${esc(t)}</button><button class="hx" type="button" data-i="${i}" aria-label="Hapus ${esc(t)} dari riwayat"><svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button></li>`).join(""):`<li class="hn">Belum ada riwayat.</li>`;
 $("clrHist").hidden=!h.length}
$("hist").addEventListener("click",e=>{
 const x=e.target.closest(".hx");if(x){const h=hist();h.splice(+x.dataset.i,1);saveH(h);drawH();return}
 const b=e.target.closest(".hq");if(b){closeD(false);go(b.dataset.q)}});
$("clrHist").addEventListener("click",()=>{saveH([]);drawH()});

/* ---------- bilah samping: fokus terkunci, Esc, geser, scroll terkunci ---------- */
const BG=["top","main","res","fSm","foot"];let lastFocus=null,sx0=0;
const setInert=on=>BG.forEach(id=>{const e=$(id);if(e)on?e.setAttribute("inert",""):e.removeAttribute("inert")});
function openD(){lastFocus=document.activeElement;drawH();setInert(true);
 D.removeAttribute("inert");D.setAttribute("aria-hidden","false");D.classList.add("open");$("scrim").classList.add("on");
 document.body.classList.add("lock");$("menuBtn").setAttribute("aria-expanded","true");$("closeBtn").focus({preventScroll:true})}
function closeD(restore=true){if(!D.classList.contains("open"))return;
 D.classList.remove("open");$("scrim").classList.remove("on");D.setAttribute("aria-hidden","true");D.setAttribute("inert","");
 document.body.classList.remove("lock");$("menuBtn").setAttribute("aria-expanded","false");setInert(false);
 if(restore&&lastFocus&&lastFocus.focus)lastFocus.focus({preventScroll:true})}
$("menuBtn").addEventListener("click",openD);$("closeBtn").addEventListener("click",()=>closeD());$("scrim").addEventListener("click",()=>closeD());
D.addEventListener("keydown",e=>{
 if(e.key==="Escape"){e.preventDefault();closeD();return}
 if(e.key!=="Tab")return;
 const f=[...D.querySelectorAll("button:not([hidden]),a[href]")].filter(x=>x.offsetParent!==null);if(!f.length)return;
 const a=f[0],z=f[f.length-1];
 if(e.shiftKey&&document.activeElement===a){e.preventDefault();z.focus()}else if(!e.shiftKey&&document.activeElement===z){e.preventDefault();a.focus()}});
D.addEventListener("touchstart",e=>{sx0=e.touches[0].clientX},{passive:true});
D.addEventListener("touchend",e=>{if(e.changedTouches[0].clientX-sx0<-60)closeD()},{passive:true});
const fresh=()=>{closeD(false);go("");};
$("newBtn").addEventListener("click",fresh);$("newBtn2").addEventListener("click",fresh);
$("logo").addEventListener("click",e=>{if(e.metaKey||e.ctrlKey||e.shiftKey)return;e.preventDefault();fresh()});

/* ---------- rute ---------- */
function go(query,t){const u=new URL(location.href);u.search="";if(query){u.searchParams.set("q",query);pushH(query)}if(t&&t!=="ai")u.searchParams.set("tab",t);
 history.pushState(null,"",u);route()}
async function route(){
 const my=++reqId,p=new URLSearchParams(location.search);q=(p.get("q")||"").trim();tab=p.get("tab")||"ai";if(!TABS.some(x=>x[0]===tab))tab="ai";
 const home=!q;$("main").hidden=!home;$("res").hidden=home;$("fSm").hidden=home;document.body.classList.toggle("in-res",!home);
 document.title=q?q+" — GWM Search":"GWM Search — cari konser, festival, gunung, dan blog";
 window.scrollTo(0,0);
 if(home){$("qBig").value="";$("sugBox").hidden=true;$("qBig").focus({preventScroll:true});return}
 $("qb").textContent=q;$("qSm").value="";
 await SX.load();if(my!==reqId)return;
 const all=SX.search(q,"all"),terms=SX.terms(q),it=SX.intent(q);
 const cnt={all:all.length};all.forEach(d=>cnt[d.type]=(cnt[d.type]||0)+1);
 $("tabs").innerHTML=TABS.map(([k,l])=>`<button role="tab" data-k="${k}" aria-selected="${k===tab}">${l}${k==="ai"?"":`<small>${cnt[k]||0}</small>`}</button>`).join("");
 const isAI=tab==="ai";
 $("ai").hidden=!isAI;["cnt","list"].forEach(id=>$(id).hidden=isAI);$("more").hidden=true;
 if(isAI){$("cnt").textContent="";$("list").innerHTML="";shown=0;return renderAI(my,all)}
 results=tab==="all"?all:all.filter(d=>d.type===tab);shown=0;$("list").innerHTML="";
 const per=it.from?` · ${fmt(it.from)}${it.to&&it.to!==it.from?" – "+fmt(it.to):" dan seterusnya"}, urut tanggal`:"";
 $("cnt").textContent=results.length?`${results.length} hasil${per}`:"";
 if(!results.length){$("list").innerHTML=`<li class="empty">Tidak ada hasil untuk “${esc(q)}”.<br>Coba kata yang lebih umum atau pilih kategori Semua.</li>`;return}
 more(terms);
}

/* ---------- tab AI: jawaban ringkas gaya portal pencarian + sumber + lanjut ke ai.gowithdme.com ---------- */
const I={
 copy:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2.5"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/></svg>',
 share:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15V4M8 8l4-4 4 4M5 13v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5"/></svg>',
 spark:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/></svg>'
};
function chatMode(all){
 const top=all.slice(0,5).map(d=>d.type),g=top.filter(x=>x==="gunung").length,e=top.filter(x=>x==="event").length;
 if(/(gunung|mendaki|pendakian|hiking|open trip)/.test(SX.norm(q))||g>e)return "gunung";
 return e?"konser":"trip";
}
function followUps(all){
 const out=[],top=all.find(d=>d.type==="event"||d.type==="gunung");
 if(top){out.push(top.type==="gunung"?`Persiapan naik ${top.title.slice(0,50)}`:`Tips datang ke ${top.title.slice(0,50)}`);
  if(top.meta[0])out.push(`Event lain di ${top.meta[0]}`)}
 out.push("Cari teman jalan untuk event ini");
 return out.filter(t=>t.toLowerCase()!==q.toLowerCase()).slice(0,3);
}
function srcCard(s,i){
 const city=s.meta&&s.meta[0],when=s.type==="blog"||s.type==="page"?"":fmt(s.date);
 return `<a class="src" href="${esc(s.url)}" target="_blank" rel="noopener"><span class="sn">${i+1}</span>${s.img?`<span class="st" style="background-image:url('${esc(s.img)}')"></span>`:""}<span class="sb"><small>${esc(LABEL[s.type]||"gowithdme.com")}</small><b>${esc(s.title)}</b><em>${esc([when,city].filter(Boolean).join(" · "))}</em></span></a>`;
}
async function renderAI(my,all){
 const box=$("ai");box.setAttribute("aria-busy","true");
 box.innerHTML=`<div class="sk" role="status"><span class="lb">${I.spark}Mencari jawaban…</span><i></i><i></i><i class="s"></i></div>`;
 const r=await SXAnswer.answer(q,all);if(my!==reqId)return;
 box.setAttribute("aria-busy","false");
 const link=(C.AI_CHAT_URL||"https://ai.gowithdme.com/")+"?q="+encodeURIComponent(q)+"&mode="+chatMode(all);
 if(!r.text){
  box.innerHTML=`<div class="a-empty">Belum ada hasil di GoWithDME untuk “${esc(q)}”.</div><div class="acts"><a class="go" href="${esc(link)}" target="_blank" rel="noopener">${I.spark}Tanya GoWithDME AI</a></div>`;
  return;
 }
 const srcs=(r.sources||[]).slice(0,5);
 box.innerHTML=`<div class="md">${SXMD.render(r.text,r.sources)}</div>
  <p class="aln">${r.ai?"Dijawab AI dari data GoWithDME. Bisa keliru, cek sumber resmi sebelum berangkat.":"Ringkasan otomatis dari hasil pencarian (AI sedang tidak tersedia)."}</p>
  ${srcs.length?`<h2 class="sh">Sumber</h2><div class="srcs">${srcs.map(srcCard).join("")}</div>`:""}
  <div class="acts"><button type="button" data-a="copy">${I.copy}<span>Salin</span></button><button type="button" data-a="share">${I.share}<span>Bagikan</span></button><a class="go" href="${esc(link)}" target="_blank" rel="noopener">${I.spark}Lanjutkan di GoWithDME AI</a></div>
  <ul class="fu">${followUps(all).map(t=>`<li><button type="button" data-q="${esc(t)}">${esc(t)}</button></li>`).join("")}</ul>`;
 box.querySelector('[data-a="copy"]').onclick=e=>{const b=e.currentTarget;const done=()=>{b.lastChild.textContent="Tersalin";setTimeout(()=>b.lastChild.textContent="Salin",1500)};
  try{navigator.clipboard.writeText(r.text.replace(/\s*\[\d{1,2}\]/g,"")).then(done,()=>{})}catch(_){}};
 box.querySelector('[data-a="share"]').onclick=async e=>{const b=e.currentTarget,u=location.href;
  try{if(navigator.share){await navigator.share({title:q+" — GWM Search",url:u});return}await navigator.clipboard.writeText(u);b.lastChild.textContent="Tautan tersalin";setTimeout(()=>b.lastChild.textContent="Bagikan",1500)}catch(_){}};
 box.querySelectorAll(".fu button").forEach(b=>b.onclick=()=>go(b.dataset.q));
}
function more(terms){
 terms=terms||SX.terms(q);
 const slice=results.slice(shown,shown+C.PER_PAGE);shown+=slice.length;
 $("list").insertAdjacentHTML("beforeend",slice.map(d=>`<li class="it"><div class="th" ${d.img?`style="background-image:url('${esc(d.img)}')"`:"hidden"}></div><div class="bd"><div class="tp">${LABEL[d.type]||""}${d.cat&&d.type!=="page"?" · "+esc(d.cat):""}</div><h3><a href="${esc(d.url)}">${hl(d.title,terms)}</a></h3><p>${hl(d.desc,terms)}</p><div class="mt">${d.date&&d.type!=="blog"?`<span>${fmt(d.date)}</span>`:""}${d.meta.slice(0,3).map(m=>`<span>${esc(m)}</span>`).join("")}</div></div></li>`).join(""));
 $("more").hidden=shown>=results.length;
}
$("more").addEventListener("click",()=>more());

/* ---------- saran ketikan & kirim ---------- */
let sel=-1,tm;
function drawSug(v){const box=$("sugBox"),s=v.length>1?SX.suggest(v):[];sel=-1;box.innerHTML=s.map(t=>`<li role="option">${esc(t)}</li>`).join("");box.hidden=!s.length}
$("qBig").addEventListener("input",e=>{clearTimeout(tm);tm=setTimeout(async()=>{await SX.load();drawSug(e.target.value)},120)});
$("qBig").addEventListener("keydown",e=>{
 const li=[...$("sugBox").children];
 if((e.key==="ArrowDown"||e.key==="ArrowUp")&&li.length&&!$("sugBox").hidden){e.preventDefault();sel=(sel+(e.key==="ArrowDown"?1:-1)+li.length)%li.length;li.forEach((x,i)=>x.setAttribute("aria-selected",i===sel));e.target.value=li[sel].textContent}
 else if(e.key==="Enter"&&!e.shiftKey&&!e.isComposing){e.preventDefault();go(e.target.value.trim())}});
$("sugBox").addEventListener("mousedown",e=>{const li=e.target.closest("li");if(li){e.preventDefault();go(li.textContent)}});
document.addEventListener("click",e=>{if(!e.target.closest("#fBig"))$("sugBox").hidden=true});
$("fBig").addEventListener("submit",e=>{e.preventDefault();const v=$("qBig").value.trim();if(v)go(v)});
$("fSm").addEventListener("submit",e=>{e.preventDefault();const v=$("qSm").value.trim();if(v){go(v);$("qSm").blur()}});
$("tabs").addEventListener("click",e=>{const b=e.target.closest("button");if(b)go(q,b.dataset.k)});
$("ideas").innerHTML=C.SUGGEST.map(([k,t])=>`<li><button type="button" data-q="${esc(t)}"><em>${esc(k)}:</em>${esc(t)}</button></li>`).join("");
$("ideas").addEventListener("click",e=>{const b=e.target.closest("button");if(b)go(b.dataset.q)});
document.addEventListener("keydown",e=>{
 if(e.key==="/"&&!/input|textarea/i.test(document.activeElement.tagName)&&!D.classList.contains("open")){e.preventDefault();($("main").hidden?$("qSm"):$("qBig")).focus()}});
addEventListener("popstate",()=>{closeD(false);route()});
route();
})();
