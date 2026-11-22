(function(){
const C=window.SX_CONFIG,$=id=>document.getElementById(id);
const TABS=[["all","Semua"],["event","Event"],["gunung","Gunung"],["blog","Blog"],["page","Halaman"]];
const LABEL={event:"Event",gunung:"Gunung",blog:"Blog",page:"Halaman"};
let q="",tab="all",shown=0,results=[];
const esc=s=>(s||"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fmt=d=>d?new Date(d+"T00:00:00").toLocaleDateString("id-ID",{day:"numeric",month:"short",year:"numeric"}):"";
function hl(t,qq){let o=esc(t);SX.norm(qq).split(" ").filter(w=>w.length>1).forEach(w=>{o=o.replace(new RegExp("("+w.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+")","ig"),"<mark>$1</mark>")});return o}
function go(query,t){const u=new URL(location.href);u.search="";if(query)u.searchParams.set("q",query);if(t&&t!=="all")u.searchParams.set("tab",t);history.pushState(null,"",u);route()}
async function route(){
 const p=new URLSearchParams(location.search);q=(p.get("q")||"").trim();tab=p.get("tab")||"all";
 const home=!q;$("home").hidden=!home;$("res").hidden=home;$("fSm").hidden=home;
 document.title=q?q+" — GWM Search":"GWM Search — cari konser, festival, gunung, dan blog";
 if(home){$("qBig").focus();return}
 $("qSm").value=q;await SX.load();
 const all=SX.search(q,"all");const cnt={all:all.length};all.forEach(d=>cnt[d.type]=(cnt[d.type]||0)+1);
 $("tabs").innerHTML=TABS.map(([k,l])=>`<button role="tab" data-k="${k}" aria-selected="${k===tab}">${l}<small>${cnt[k]||0}</small></button>`).join("");
 results=tab==="all"?all:all.filter(d=>d.type===tab);shown=0;$("list").innerHTML="";
 $("cnt").textContent=results.length?`${results.length} hasil`:"";
 if(!results.length){$("list").innerHTML=`<li class="empty">Tidak ada hasil untuk “${esc(q)}”. Coba kata lain atau kategori Semua.</li>`;$("ans").hidden=true;$("more").hidden=true;return}
 more();
 const a=$("ans");a.hidden=true;
 if(tab==="all"){const r=await SXAnswer.answer(q,all);if(r.text&&q===new URLSearchParams(location.search).get("q")){a.innerHTML=`<span class="lb">${r.ai?"Jawaban AI":"Ringkasan"}</span><br>${esc(r.text)}`;a.hidden=false}}
}
function more(){
 const n=C.PER_PAGE,slice=results.slice(shown,shown+n);shown+=slice.length;
 $("list").insertAdjacentHTML("beforeend",slice.map(d=>`<li class="it"><div class="th" ${d.img?`style="background-image:url('${esc(d.img)}')"`:'hidden'}></div><div class="bd"><div class="tp">${LABEL[d.type]||""}${d.cat&&d.type!=="page"?" · "+esc(d.cat):""}</div><h3><a href="${esc(d.url)}">${hl(d.title,q)}</a></h3><p>${hl(d.desc,q)}</p><div class="mt">${d.date&&d.type!=="blog"?`<span>${fmt(d.date)}</span>`:""}${d.meta.slice(0,3).map(m=>`<span>${esc(m)}</span>`).join("")}</div></div></li>`).join(""));
 $("more").hidden=shown>=results.length;
}
let sel=-1,tm;
function drawSug(v){const box=$("sugBox");const s=v.length>1?SX.suggest(v):[];sel=-1;
 box.innerHTML=s.map(t=>`<li role="option">${esc(t)}</li>`).join("");box.hidden=!s.length}
$("qBig").addEventListener("input",e=>{clearTimeout(tm);tm=setTimeout(async()=>{await SX.load();drawSug(e.target.value)},120)});
$("qBig").addEventListener("keydown",e=>{
 const li=[...$("sugBox").children];
 if(e.key==="ArrowDown"||e.key==="ArrowUp"){if(!li.length)return;e.preventDefault();sel=(sel+(e.key==="ArrowDown"?1:-1)+li.length)%li.length;li.forEach((x,i)=>x.setAttribute("aria-selected",i===sel));e.target.value=li[sel].textContent}
 else if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();go(e.target.value.trim())}});
$("sugBox").addEventListener("mousedown",e=>{const li=e.target.closest("li");if(li){e.preventDefault();go(li.textContent)}});
document.addEventListener("click",e=>{if(!e.target.closest("#fBig"))$("sugBox").hidden=true});
$("fBig").addEventListener("submit",e=>{e.preventDefault();go($("qBig").value.trim())});
$("fSm").addEventListener("submit",e=>{e.preventDefault();go($("qSm").value.trim())});
$("tabs").addEventListener("click",e=>{const b=e.target.closest("button");if(b)go(q,b.dataset.k)});
$("more").addEventListener("click",more);
$("ideas").innerHTML=C.SUGGEST.map(([k,t])=>`<li><button data-q="${esc(t)}"><em>${esc(k)}:</em>${esc(t)}</button></li>`).join("");
$("ideas").addEventListener("click",e=>{const b=e.target.closest("button");if(b)go(b.dataset.q)});
document.addEventListener("keydown",e=>{if(e.key==="/"&&!/input|textarea/i.test(document.activeElement.tagName)){e.preventDefault();($("home").hidden?$("qSm"):$("qBig")).focus()}});
addEventListener("popstate",route);
route();
})();
