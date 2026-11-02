// Reelverse app logic: TMDB fetching, filters, infinite scroll, details panel.
// Needs config.js (KEY) and data.js (raw) loaded first.
const API='https://api.themoviedb.org/3',IM='https://image.tmdb.org/t/p/';
const G={T:['Thriller & Mystery','#35e0c6'],R:['Romance & Rom-Com','#ff5c93'],A:['Action','#ff8a3d'],S:['Sci-Fi','#6aa7ff'],H:['Horror','#ff4d4d'],C:['Comedy','#ffd23f'],D:['Drama','#b794f6'],K:['Crime','#9bd14a'],F:['Fantasy','#e879f9'],N:['Animation','#5ee38f'],Y:['Series','#7dd3fc']};
const LC={ml:'Malayalam',ta:'Tamil',te:'Telugu',kn:'Kannada',hi:'Hindi',en:'Hollywood',ko:'Korean',ja:'Japanese',es:'Spanish',fr:'French',tr:'Turkish'};
const LM={m:'ml',t:'ta',u:'te',k:'kn',h:'hi',e:'en',o:'ko',j:'ja'};
const TY={m:['Movies','movie'],s:['Series','tv'],p:['Pakistani dramas','tv'],k:['K-dramas','tv'],c:['My picks','']};
const GM={movie:{T:'53|9648',R:'10749',A:'28',S:'878',H:'27',C:'35',D:'18',K:'80',F:'14',N:'16'},tv:{T:'9648|80',R:'@romance',A:'10759',S:'10765',H:'@horror',C:'35',D:'18',K:'80',F:'10765',N:'16'}};
const RG=['IN','PK','US','GB','AE','CA','AU','KR','SA','SG'];
const $=id=>document.getElementById(id);
const S={ty:'m',g:'*',l:'*',q:'',so:'p',page:0,total:0,busy:false,end:false,err:false,wl:false,tok:0,rg:'IN'};
let sv={},R={},kwc={};
{const r=(navigator.language.split('-')[1]||'').toUpperCase();if(RG.includes(r))S.rg=r}
try{sv=JSON.parse(localStorage.getItem('rv2')||'{}');S.rg=localStorage.getItem('rg')||S.rg}catch(e){}
Object.values(sv).forEach(m=>R[m.key]=m);
const M=raw.split('\n').map((s,i)=>{const[t,y,l,g]=s.split('|'),o={key:'c'+i,t,y,lc:LM[l],g,cur:1,k:g.includes('Y')?'tv':'movie'};R[o.key]=o;return o});
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const hue=t=>{let h=0;for(const c of t)h=(h*31+c.charCodeAt(0))%360;return h};
const ini=t=>t.replace(/[^\w\s]/g,'').split(/\s+/).filter(w=>!/^(the|of|a|and)$/i.test(w)).slice(0,3).map(w=>w[0]).join('').toUpperCase();
const slim=m=>{const{pr,...o}=m;return o};
const cnt=n=>`<b>${n.toLocaleString()}</b> ${n===1?'title':'titles'}`;
async function api(path,p={}){const u=new URL(API+path);u.search=new URLSearchParams({api_key:KEY,language:'en-US',...p});const r=await fetch(u);if(!r.ok)throw new Error(r.status);return r.json()}
async function kw(n){if(!kwc[n]){const d=await api('/search/keyword',{query:n});kwc[n]=d.results[0]?.id}return kwc[n]}
const norm=(x,k)=>{const o={key:k[0]+x.id,id:x.id,k,t:x.title||x.name||'Untitled',y:(x.release_date||x.first_air_date||'').slice(0,4),p:x.poster_path,r:x.vote_average,lc:x.original_language};R[o.key]=o;return o};
function resolve(m){if(m.id)return Promise.resolve();return m.pr||(m.pr=(async()=>{const yk=m.k==='tv'?'first_air_date_year':'year';let x=(await api('/search/'+m.k,{query:m.t,[yk]:m.y})).results[0]||(await api('/search/'+m.k,{query:m.t})).results[0];if(x){m.id=x.id;m.p=x.poster_path;m.r=x.vote_average}})())}
const poster=m=>{const h=hue(m.t);return `<div class="ps" style="background:linear-gradient(160deg,hsl(${h} 70% 40%),hsl(${(h+55)%360} 60% 14%))">${esc(ini(m.t))}${m.p?`<img loading="lazy" alt="" src="${IM}w342${m.p}">`:''}</div>`};
const card=(m,n)=>`<button class="tk" style="--n:${n%20}" data-k="${m.key}" aria-label="${esc(m.t)}">${poster(m)}<i>${m.y||'—'}</i>${m.r?`<span class="rt">★ ${m.r.toFixed(1)}</span>`:''}${sv[m.key]?'<span class="sv">♥</span>':''}<div class="in"><b>${esc(m.t)}</b>${m.g?`<div class="dots">${[...m.g].map(c=>`<u style="background:${G[c][1]}"></u>`).join('')}</div>`:`<small>${LC[m.lc]||''}</small>`}</div></button>`;
const sk=()=>'<div class="sk"></div>'.repeat(14);
const empty=m=>`<div class="empty">${m}</div>`;
/* lazy posters for curated list */
const io=new IntersectionObserver(es=>es.forEach(async e=>{if(!e.isIntersecting)return;io.unobserve(e.target);const m=R[e.target.dataset.k];if(!m||m.p)return;try{await resolve(m);if(m.p){e.target.querySelector('.ps').insertAdjacentHTML('beforeend',`<img alt="" src="${IM}w342${m.p}">`)}}catch(_){}}),{rootMargin:'250px'});
/* filters */
function chips(el,items,cur,fn){el.innerHTML=items.map(([k,n,c])=>`<button class="chip" data-k="${k}" aria-pressed="${k===cur}" ${c?`style="--c:${c}"`:''}>${n}</button>`).join('');el.onclick=e=>{const b=e.target.closest('.chip');if(b)fn(b.dataset.k)}}
function theme(){S.g==='*'?document.documentElement.style.removeProperty('--ac'):document.documentElement.style.setProperty('--ac',G[S.g][1])}
function paint(){
chips($('tb'),Object.entries(TY).map(([k,v])=>[k,v[0]]),S.ty,k=>{S.ty=k;S.g='*';S.l='*';S.wl=false;$('wl').setAttribute('aria-pressed',false);theme();paint();render()});
chips($('gr'),[['*','All genres'],...Object.entries(G).filter(([k])=>k!=='Y'||S.ty==='c').map(([k,v])=>[k,v[0],v[1]])],S.g,k=>{S.g=k;theme();paint();render()});
chips($('lr'),[['*','Every industry'],...Object.entries(LC).map(([k,v])=>[k,v])],S.l,k=>{S.l=k;paint();render()});
$('lr').style.display=(S.ty==='p'||S.ty==='k')?'none':'';$('so').style.display=S.ty==='c'?'none':''}
const local=()=>(S.wl?Object.values(sv):M).filter(m=>(!S.q||m.t.toLowerCase().includes(S.q))&&(S.wl||((S.g==='*'||m.g.includes(S.g))&&(S.l==='*'||m.lc===S.l))));
function render(){
S.tok++;S.page=0;S.end=false;S.busy=false;S.err=false;$('mr').textContent='';
if(S.ty==='c'||S.wl){const a=local();$('cnt').innerHTML=cnt(a.length);$('gd').innerHTML=a.length?a.map(card).join(''):empty(S.wl?'Nothing saved yet. Tap ♥ on any title.':'No match. Try another genre or clear the search.');$('gd').querySelectorAll('.tk').forEach(b=>R[b.dataset.k].p||io.observe(b));return}
$('gd').innerHTML=sk();$('cnt').innerHTML='Loading…';more()}
async function more(){
if(S.ty==='c'||S.wl||S.busy||S.end)return;S.busy=true;const tok=S.tok,k=TY[S.ty][1],tv=k==='tv';$('mr').textContent='Loading more…';
try{
let d,p={page:S.page+1,include_adult:false};
if(S.q){p.query=S.q;d=await api('/search/'+k,p)}
else{const dk=tv?'first_air_date':'primary_release_date';
p.sort_by={p:'popularity.desc',r:'vote_average.desc',n:dk+'.desc'}[S.so];
p['vote_count.gte']=S.so==='r'?(S.ty==='p'?5:S.ty==='k'?40:300):S.so==='n'?(S.ty==='m'?5:1):(S.ty==='m'?10:0);
if(S.so==='n')p[dk+'.lte']=new Date().toISOString().slice(0,10);
if(S.g!=='*'){const v=GM[k][S.g];if(v[0]==='@')p.with_keywords=await kw(v.slice(1));else p.with_genres=v}
if(S.ty==='p')p.with_origin_country='PK';else if(S.ty==='k')p.with_origin_country='KR';else if(S.l!=='*')p.with_original_language=S.l;
d=await api('/discover/'+k,p)}
if(tok!==S.tok)return;
let a=d.results;if(S.q&&(S.ty==='p'||S.ty==='k'))a=a.filter(x=>(x.origin_country||[]).includes(S.ty==='p'?'PK':'KR'));
if(!S.page)$('gd').innerHTML='';
const items=a.map(x=>norm(x,k)),n0=$('gd').children.length;
$('gd').insertAdjacentHTML('beforeend',items.map((m,n)=>card(m,n0+n)).join(''));
S.page++;S.end=S.page>=Math.min(d.total_pages,500);$('cnt').innerHTML=cnt(d.total_results);
if(!$('gd').children.length)$('gd').innerHTML=empty('No titles found. Try another filter or search.');
$('mr').textContent=S.end&&$('gd').querySelector('.tk')?'That’s everything for this filter.':'';
}catch(e){if(tok===S.tok){S.err=true;if($('gd').querySelector('.sk'))$('gd').innerHTML='';$('cnt').textContent='';if(!S.page&&S.ty!=='c'){S.ty='c';S.g='*';S.l='*';theme();paint();render();$('mr').innerHTML='Couldn’t reach TMDB, so you’re seeing My picks. <button class="chip" id="rt">Try live data again</button>';$('rt').onclick=()=>{S.ty='m';paint();render()}}else{$('mr').innerHTML='Couldn’t reach TMDB. <button class="chip" id="rt">Try again</button>';$('rt').onclick=()=>{S.err=false;S.busy=false;render()}}}}
finally{if(tok===S.tok){S.busy=false;if(!S.end&&!S.err&&$('mr').getBoundingClientRect().top<innerHeight+800)setTimeout(more,60)}}}
new IntersectionObserver(e=>{if(e[0].isIntersecting)more()},{rootMargin:'700px'}).observe($('mr'));
/* details */
async function openM(key){
const m=R[key];if(!m)return;$('md').classList.add('on');S.sy=scrollY;document.body.style.top=-S.sy+'px';document.body.classList.add('lock');$('cd').scrollTop=0;
$('cd').innerHTML='<div class="sk" style="aspect-ratio:16/9;border-radius:0"></div><div class="bd"><div class="sk" style="height:120px"></div></div>';
const s=encodeURIComponent(m.t+' '+(m.y||'')),acts=`<h3>Actions</h3><div class="lk"><button id="sb">${sv[key]?'♥ Saved':'♡ Save to watchlist'}</button><button id="sh">Share</button></div>`;
try{await resolve(m)}catch(e){}
let h;
if(!m.id){h=`<div class="bd"><h2>${esc(m.t)}</h2><p class="ov">Couldn’t load details for this one.</p><div class="lk"><a target="_blank" rel="noopener" href="https://www.google.com/search?q=${s}+watch+online">Search Google</a><a target="_blank" rel="noopener" href="https://www.justwatch.com/in/search?q=${encodeURIComponent(m.t)}">JustWatch</a></div>${acts}</div>`}
else try{
const d=await api(`/${m.k}/${m.id}`,{append_to_response:'videos,watch/providers,credits',include_video_language:'en,null,hi,'+(m.lc||'en')});
const v=d.videos.results.filter(x=>x.site==='YouTube'),tr=v.find(x=>x.type==='Trailer'&&x.official)||v.find(x=>x.type==='Trailer')||v.find(x=>x.type==='Teaser')||v[0];const yt=tr?'https://www.youtube.com/watch?v='+tr.key:'https://www.youtube.com/results?search_query='+encodeURIComponent((d.title||d.name)+' '+(d.release_date||d.first_air_date||'').slice(0,4)+' official trailer');
const wp=d['watch/providers'].results[S.rg]||{};
const pv=(a,l)=>a?.length?`<h3>${l}</h3><div class="pv">${a.map(p=>`<span><img src="${IM}w92${p.logo_path}" alt="">${esc(p.provider_name)}</span>`).join('')}</div>`:'';
const rt=d.runtime||(d.episode_run_time||[])[0],sn=d.number_of_seasons;
const tags=[(d.release_date||d.first_air_date||'').slice(0,4),d.vote_average?'★ '+d.vote_average.toFixed(1):'',rt?rt+' min':'',sn?sn+(sn>1?' seasons':' season'):'',...(d.genres||[]).map(g=>g.name)].filter(Boolean);
const bg=d.backdrop_path?`${IM}w780${d.backdrop_path}`:d.poster_path?`${IM}w500${d.poster_path}`:'';
h=`<div class="bk" style="background-image:url(${bg})"><button class="pl" id="pl">▶ ${tr?'Play trailer':'Find trailer'}</button><a class="yt" target="_blank" rel="noopener" href="${yt}">Open on YouTube ↗</a></div><div class="bd"><h2>${esc(d.title||d.name)}</h2>${d.tagline?`<small style="color:var(--mu)">${esc(d.tagline)}</small>`:''}<div class="tags">${tags.map(t=>`<span style="background:#fff">${esc(t)}</span>`).join('')}</div><p class="ov">${esc(d.overview||'No description available yet.')}</p>
${d.credits.cast.length?`<h3>Cast</h3><p>${d.credits.cast.slice(0,8).map(c=>esc(c.name)).join(', ')}</p>`:''}
${pv(wp.flatrate,'Stream on ('+S.rg+')')}${pv(wp.rent,'Rent')}${pv(wp.buy,'Buy')}${wp.flatrate||wp.rent||wp.buy?'':`<h3>Where to watch</h3><p>No streaming info for ${S.rg} yet. Try the search below or change the region at the top.</p>`}
<div class="lk" style="margin-top:12px"><a target="_blank" rel="noopener" href="${wp.link||'https://www.justwatch.com/'+S.rg.toLowerCase()+'/search?q='+encodeURIComponent(m.t)}">Open on JustWatch</a><a target="_blank" rel="noopener" href="https://www.google.com/search?q=${s}+watch+online">Search Google</a></div>${acts}
<p class="note">Streaming data from JustWatch via TMDB. It changes often.</p></div>`;
$('cd').innerHTML=h;
$('pl').onclick=()=>{if(!tr||location.protocol==='file:'){window.open(yt,'_blank','noopener');return}const b=$('pl').parentNode;b.innerHTML=`<iframe src="https://www.youtube-nocookie.com/embed/${tr.key}?autoplay=1&playsinline=1&rel=0" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen title="Trailer"></iframe><a class="yt" target="_blank" rel="noopener" href="${yt}">Not playing? Open on YouTube ↗</a>`}
}catch(e){h=`<div class="bd"><h2>${esc(m.t)}</h2><p class="ov">Couldn’t reach TMDB for details.</p>${acts}</div>`}
if(h&&!$('cd').querySelector('.bk'))$('cd').innerHTML=h;
$('sb').onclick=()=>{if(sv[key])delete sv[key];else sv[key]=slim(m);try{localStorage.setItem('rv2',JSON.stringify(sv))}catch(e){}$('sb').textContent=sv[key]?'♥ Saved':'♡ Save to watchlist';if(S.wl)render();else{const b=document.querySelector(`.tk[data-k="${key}"]`);if(b){const o=b.querySelector('.sv');if(sv[key]&&!o)b.insertAdjacentHTML('afterbegin','<span class="sv">♥</span>');if(!sv[key]&&o)o.remove()}}};
$('sh').onclick=async()=>{const x={title:m.t,text:`Watch “${m.t}” (${m.y||''}). Found on Reelverse.`,url:location.href};try{navigator.share?await navigator.share(x):(await navigator.clipboard.writeText(x.text+' '+x.url),$('sh').textContent='Copied!')}catch(e){}}}
function close(){if(!$('md').classList.contains('on'))return;$('md').classList.remove('on');$('cd').innerHTML='';document.body.classList.remove('lock');document.body.style.top='';scrollTo(0,S.sy||0)}
$('gd').onclick=e=>{const b=e.target.closest('.tk');if(b)openM(b.dataset.k)};
$('cl').onclick=close;$('md').onclick=e=>{if(e.target===$('md'))close()};addEventListener('keydown',e=>{if(e.key==='Escape')close()});
let dt;$('q').oninput=e=>{clearTimeout(dt);dt=setTimeout(()=>{S.q=e.target.value.trim().toLowerCase();render()},350)};
$('so').onchange=e=>{S.so=e.target.value;render()};
$('rg').innerHTML=RG.map(r=>`<option ${r===S.rg?'selected':''}>${r}</option>`).join('');
$('rg').onchange=e=>{S.rg=e.target.value;try{localStorage.setItem('rg',S.rg)}catch(_){}};
$('wl').onclick=()=>{S.wl=!S.wl;$('wl').setAttribute('aria-pressed',S.wl);render()};
$('surp').onclick=()=>{const a=[...document.querySelectorAll('.tk')];if(!a.length)return;const s=$('spin'),pick=()=>a[Math.random()*a.length|0];s.hidden=false;let n=0;const t=setInterval(()=>{s.textContent='🎞️ '+pick().getAttribute('aria-label');if(++n>12){clearInterval(t);const b=pick();s.textContent='🎬 '+b.getAttribute('aria-label');openM(b.dataset.k)}},80)};
const words=['Get a movie.','Get a drama.','Get goosebumps.','Get butterflies.','Get your weekend.'];let wi=0;setInterval(()=>{$('w').textContent=words[++wi%words.length]},3200);
paint();render();
let c=3;const tm=setInterval(()=>{c--;if(c>0)$('num').textContent=c;else{clearInterval(tm);$('ld').classList.add('off')}},650);
