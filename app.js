
(()=>{
const data=window.DUOMO_DATA||[],meta=window.DUOMO_META||{};
const $=s=>document.querySelector(s);
const els={search:$('#search'),clear:$('#clearSearch'),brand:$('#brandFilter'),type:$('#typeFilter'),stock:$('#stockFilter'),sheet:$('#sheetFilter'),results:$('#results'),empty:$('#empty'),shown:$('#shownCount'),inc:$('#inCount'),outc:$('#outCount'),updated:$('#updated'),dialog:$('#detailDialog'),body:$('#dialogBody'),top:$('#topBtn')};
const fmt=new Intl.NumberFormat('ko-KR');
const text=v=>(v??'').toString();
const escapeHTML=s=>text(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const unique=k=>[...new Set(data.map(x=>text(x[k]).trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ko'));
function fillSelect(el,vals){vals.forEach(v=>{const o=document.createElement('option');o.value=v;o.textContent=v;el.appendChild(o)})}
fillSelect(els.brand,unique('brand'));fillSelect(els.type,unique('type'));fillSelect(els.sheet,unique('sheet'));
els.updated.textContent=`${meta.generated||''} 생성 · ${fmt.format(meta.count||data.length)}개 항목`;
function status(r){if(typeof r.stock==='number'){if(r.stock<=0)return ['out','품절'];if(r.stock<=5)return ['low',`${fmt.format(r.stock)}개`];return ['in',`${fmt.format(r.stock)}개`]}if(r.stockText)return ['unknown',r.stockText];return ['unknown','미표기']}
function money(r){if(typeof r.price==='number')return `${fmt.format(r.price)}원`;return r.priceText||'가격 미표기'}
function searchable(r){return [r.brand,r.type,r.product,r.option,r.code,r.size,r.sheet,r.remarks,r.display].join(' ').toLowerCase()}
function filtered(){const q=els.search.value.trim().toLowerCase(),b=els.brand.value,t=els.type.value,s=els.stock.value,sh=els.sheet.value;return data.filter(r=>{if(q&&!searchable(r).includes(q))return false;if(b&&r.brand!==b)return false;if(t&&r.type!==t)return false;if(sh&&r.sheet!==sh)return false;const st=status(r)[0];if(s==='in'&&!(typeof r.stock==='number'&&r.stock>0))return false;if(s==='low'&&!(typeof r.stock==='number'&&r.stock>0&&r.stock<=5))return false;if(s==='out'&&!(typeof r.stock==='number'&&r.stock<=0))return false;if(s==='unknown'&&typeof r.stock==='number')return false;return true})}
function card(r){const st=status(r),img=r.images&&r.images[0]?`<img loading="lazy" src="${escapeHTML(r.images[0])}" alt="${escapeHTML(r.product)}">`:'<span class="no-image">NO IMAGE</span>';return `<article class="card"><div class="card-image">${img}<span class="sheet-tag">${escapeHTML(r.sheet)}</span></div><div class="card-body"><div class="meta">${escapeHTML(r.brand)}${r.type?' · '+escapeHTML(r.type):''}</div><h2>${escapeHTML(r.product||r.option||'제품명 미표기')}</h2><p class="option">${escapeHTML(r.option||r.size||'')}</p><p class="code">${r.code?'CODE '+escapeHTML(r.code):'&nbsp;'}</p><div class="bottom"><span class="price">${escapeHTML(money(r))}</span><span class="stock ${st[0]}">${escapeHTML(st[1])}</span></div></div><button class="open-detail" data-id="${escapeHTML(r.id)}" aria-label="상세보기"></button></article>`}
function render(){const list=filtered();els.results.innerHTML=list.map(card).join('');els.empty.hidden=list.length>0;els.shown.textContent=fmt.format(list.length);els.inc.textContent=fmt.format(list.filter(r=>typeof r.stock==='number'&&r.stock>0).length);els.outc.textContent=fmt.format(list.filter(r=>typeof r.stock==='number'&&r.stock<=0).length);els.clear.style.display=els.search.value?'block':'none'}
function detail(r){const st=status(r);const imgs=(r.images||[]).length?r.images.map(x=>`<img src="${escapeHTML(x)}" alt="${escapeHTML(r.product)}">`).join(''):'<div class="no-image" style="margin:auto">NO IMAGE</div>';const rows=[['브랜드',r.brand],['유형',r.type],['옵션',r.option],['사이즈',r.size],['제품 코드',r.code],['소비자가',money(r)],['가용 재고',st[1]],['입고 예정',r.arrival],['전시 현황',r.display],['원산지',r.origin]].filter(x=>x[1]);els.body.innerHTML=`<div class="detail-images">${imgs}</div><div class="detail-content"><div class="meta">${escapeHTML(r.brand)}${r.type?' · '+escapeHTML(r.type):''}</div><h2>${escapeHTML(r.product||'제품명 미표기')}</h2><p class="detail-option">${escapeHTML(r.option||'')}</p><dl class="detail-grid">${rows.map(([a,b])=>`<dt>${escapeHTML(a)}</dt><dd class="${a==='가용 재고'?'detail-stock':''}">${escapeHTML(b)}</dd>`).join('')}</dl>${r.remarks?`<div class="detail-note">${escapeHTML(r.remarks)}</div>`:''}<div class="source-note">원본: ${escapeHTML(r.sheet)} 시트 · ${r.row}행</div></div>`;els.dialog.showModal()}
['input','change'].forEach(ev=>{[els.search,els.brand,els.type,els.stock,els.sheet].forEach(el=>el.addEventListener(ev,render))});
els.clear.addEventListener('click',()=>{els.search.value='';els.search.focus();render()});
$('#resetBtn').addEventListener('click',()=>{els.search.value='';els.brand.value='';els.type.value='';els.stock.value='';els.sheet.value='';render()});
els.results.addEventListener('click',e=>{const b=e.target.closest('.open-detail');if(!b)return;const r=data.find(x=>x.id===b.dataset.id);if(r)detail(r)});
$('.dialog-close').addEventListener('click',()=>els.dialog.close());els.dialog.addEventListener('click',e=>{if(e.target===els.dialog)els.dialog.close()});
window.addEventListener('scroll',()=>els.top.classList.toggle('show',scrollY>500));els.top.addEventListener('click',()=>scrollTo({top:0,behavior:'smooth'}));
if('serviceWorker'in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('./sw.js').catch(()=>{});
render();
})();
