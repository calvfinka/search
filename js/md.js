/* Markdown ringan untuk jawaban AI. Teks di-escape dulu; tautan hanya ke gowithdme.com; [n] menjadi chip sumber. */
(function(){
const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const SAFE=/^https:\/\/gowithdme\.com\/[A-Za-z0-9\-._~\/?=#%&]*$/;
const short=(t,n)=>{t=String(t||"");return t.length>n?t.slice(0,n-1)+"…":t};
function render(text,sources){
 sources=sources||[];
 const prep=s=>String(s).replace(/<br\s*\/?>/gi,"\u0001").replace(/<li[^>]*>/gi,"\u0002\u2022 ").replace(/<\/?[a-z][a-z0-9]*(\s[^>]*)?>/gi,"");
 const fin=h=>h.replace(/[\u0001\u0002]/g,"<br>").replace(/^<br>/,"");
 const inline=s=>fin(esc(prep(s))
  .replace(/\[([^\]]{1,120})\]\((https:\/\/gowithdme\.com\/[A-Za-z0-9\-._~\/?=#%]*)\)/g,'<a href="$2" target="_blank" rel="noopener">$1</a>')
  .replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>")
  .replace(/`([^`]+)`/g,"<code>$1</code>")
  .replace(/\[(\d{1,2})\](?!\()/g,(m,n)=>{
    const s=sources[+n-1];
    return s&&SAFE.test(s.url)?`<a class="cite" href="${esc(s.url)}" target="_blank" rel="noopener" title="${esc(s.title)}"><i>${+n}</i>${esc(short(s.title,22))}</a>`:"";
  }));
 const out=[];let list=null,tbl=false;
 const close=()=>{if(list){out.push("</"+list+">");list=null}if(tbl){out.push("</tbody></table></div>");tbl=false}};
 String(text||"").split("\n").forEach(l=>{
  let m;
  if(/^\s*\|.*\|\s*$/.test(l)){
   const cells=l.trim().replace(/^\||\|$/g,"").split("|").map(c=>c.trim());
   if(cells.every(c=>/^:?-{2,}:?$/.test(c)))return;
   if(list)close();
   const head=!tbl;
   if(head){out.push('<div class="tbl"><table><thead>');tbl=true}
   out.push("<tr>"+cells.map(c=>head?`<th>${inline(c)}</th>`:`<td>${inline(c)}</td>`).join("")+"</tr>");
   if(head)out.push("</thead><tbody>");
   return;
  }
  if(tbl)close();
  if((m=l.match(/^\s*#{1,4}\s+(.*)/))){close();out.push("<h3>"+inline(m[1])+"</h3>")}
  else if((m=l.match(/^\s*[-*•]\s+(.*)/))){if(list!=="ul"){close();out.push("<ul>");list="ul"}out.push("<li>"+inline(m[1])+"</li>")}
  else if((m=l.match(/^\s*\d+[.)]\s+(.*)/))){if(list!=="ol"){close();out.push("<ol>");list="ol"}out.push("<li>"+inline(m[1])+"</li>")}
  else if(!l.trim())close();
  else{close();out.push("<p>"+inline(l)+"</p>")}
 });
 close();
 return out.join("");
}
window.SXMD={render,esc};
})();
