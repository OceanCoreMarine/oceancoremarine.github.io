document.addEventListener('DOMContentLoaded',async()=>{
const slides=[...document.querySelectorAll('.hero-slide')], dots=[...document.querySelectorAll('.hero-dot')]; let current=0, timer;
function showSlide(i){if(!slides.length)return; current=(i+slides.length)%slides.length; slides.forEach((s,n)=>s.classList.toggle('active',n===current)); dots.forEach((d,n)=>d.classList.toggle('active',n===current));}
function restart(){clearInterval(timer); timer=setInterval(()=>showSlide(current+1),6000);}
if(slides.length){document.querySelector('.hero-prev')?.addEventListener('click',()=>{showSlide(current-1);restart()});document.querySelector('.hero-next')?.addEventListener('click',()=>{showSlide(current+1);restart()});dots.forEach(d=>d.addEventListener('click',()=>{showSlide(Number(d.dataset.slide));restart()}));restart();}
// Mobile navigation
const mobileBtn=document.querySelector('.mobile');
const navLinks=document.querySelector('.links');
if(mobileBtn && navLinks){
  mobileBtn.addEventListener('click',()=>{
    const open=navLinks.classList.toggle('mobile-open');
    mobileBtn.setAttribute('aria-expanded',String(open));
  });
  navLinks.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{
    navLinks.classList.remove('mobile-open');
    mobileBtn.setAttribute('aria-expanded','false');
  }));
}
const sb=window.ocSupabase;const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function cats(){const {data}=await sb.from('categories').select('*').order('name');return data||[]}
async function brands(){const {data}=await sb.from('brands').select('*').order('name');return data||[]}
async function subcategories(){const {data,error}=await sb.from('subcategories').select('*,categories(name)').order('name');return error?[]:(data||[])}
async function products(){const {data,error}=await sb.from('products').select('*,categories(name),brands(name),subcategories(name)').eq('active',true).order('created_at',{ascending:false});return error?[]:(data||[])}
const cs=await cats();const scs=await subcategories();const bs=await brands();const ps=await products();

// All categories below the header; dropdowns support hover, keyboard and tap.
const strip=document.querySelector('#categoryStrip');
if(strip){
 strip.style.setProperty('--category-columns',Math.max(1,Math.ceil(cs.length/4)));
 strip.innerHTML=cs.length?cs.map(c=>`<div class="strip-category"><button type="button" class="strip-toggle" aria-expanded="false" aria-controls="category-sub-${esc(c.id)}">${esc(c.name)} <span aria-hidden="true">▾</span></button><div class="strip-subcategories" id="category-sub-${esc(c.id)}">${scs.filter(x=>String(x.category_id)===String(c.id)).map(x=>`<a href="products.html?category=${encodeURIComponent(c.id)}&subcategory=${encodeURIComponent(x.id)}">${esc(x.name)}</a>`).join('')}<a class="strip-all" href="products.html?category=${encodeURIComponent(c.id)}">View all ${esc(c.name)} products →</a></div></div>`).join(''):'<p>No categories available.</p>';
 const close=()=>strip.querySelectorAll('.strip-category').forEach(item=>{item.classList.remove('open');item.querySelector('button').setAttribute('aria-expanded','false')});
 strip.querySelectorAll('.strip-category').forEach(item=>{
  const button=item.querySelector('button');if((Array.from(strip.children).indexOf(item)+1)%Math.max(1,Math.ceil(cs.length/4))===0)item.classList.add('strip-edge');
  button.addEventListener('click',()=>{const open=!item.classList.contains('open');close();item.classList.toggle('open',open);button.setAttribute('aria-expanded',String(open))});
  item.addEventListener('mouseenter',()=>{close();item.classList.add('open');button.setAttribute('aria-expanded','true')});
  item.addEventListener('mouseleave',()=>{if(!item.contains(document.activeElement)){item.classList.remove('open');button.setAttribute('aria-expanded','false')}});
  item.addEventListener('focusout',e=>{if(!item.contains(e.relatedTarget)){item.classList.remove('open');button.setAttribute('aria-expanded','false')}});
 });
 document.addEventListener('click',e=>{if(!strip.contains(e.target))close()});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'){const active=strip.querySelector('.open button');close();active?.focus()}});
}

const cg=document.querySelector('#categoriesGrid');if(cg)cg.innerHTML=cs.map((c,i)=>`<a class="cat" href="products.html?category=${c.id}"><div class="icon">${['⚓','◈','🛠','✦','◉','⌂','⚡','⌁','⚙','◒','◫','◌','☼','♫','↕','≋','✚','▰','⚓'][i%19]}</div><h3>${esc(c.name)}</h3><p>Marine products and equipment.</p><span>View products →</span></a>`).join('')||'<div class="empty">No categories available.</div>';
const bg=document.querySelector('#brandsGrid');
if(bg){
  bg.innerHTML=bs.map(b=>`<a class="brand-card" href="products.html?brand=${b.id}"><div class="brand-logo-box">${b.logo_url?`<img src="${esc(b.logo_url)}" alt="${esc(b.name)} logo" loading="lazy">`:`<span>${esc((b.name||'BR').slice(0,2).toUpperCase())}</span>`}</div><h3>${esc(b.name)}</h3><span>View products →</span></a>`).join('')||'<div class="empty">No brands available.</div>';
  const carousel=document.querySelector('#brandsCarousel');
  const prev=carousel?.querySelector('.brand-prev'), next=carousel?.querySelector('.brand-next');
  let brandIndex=0;
  const visibleBrands=()=>window.innerWidth<=560?2:(window.innerWidth<=900?3:6);
  const updateBrands=()=>{
    const visible=visibleBrands(), max=Math.max(0,bs.length-visible);
    brandIndex=Math.min(Math.max(brandIndex,0),max);
    bg.style.transform=`translateX(-${brandIndex*(100/visible)}%)`;
    if(prev)prev.disabled=brandIndex<=0;
    if(next)next.disabled=brandIndex>=max;
    if(prev)prev.hidden=bs.length<=visible;
    if(next)next.hidden=bs.length<=visible;
  };
  prev?.addEventListener('click',()=>{brandIndex--;updateBrands();restartBrandAutoSlide()});
  next?.addEventListener('click',()=>{brandIndex++;updateBrands();restartBrandAutoSlide()});
  window.addEventListener('resize',updateBrands);

  // Automatically advance the brand carousel every 4 seconds.
  // Pause while the user is hovering/focusing the carousel, then resume.
  let brandAutoSlideTimer=null;
  let brandAutoPaused=false;
  const autoAdvanceBrands=()=>{
    if(brandAutoPaused || bs.length<=visibleBrands()) return;
    const visible=visibleBrands();
    const max=Math.max(0,bs.length-visible);
    brandIndex = brandIndex >= max ? 0 : brandIndex + 1;
    updateBrands();
  };
  const startBrandAutoSlide=()=>{
    clearInterval(brandAutoSlideTimer);
    brandAutoSlideTimer=setInterval(autoAdvanceBrands,4000);
  };
  const restartBrandAutoSlide=()=>startBrandAutoSlide();
  carousel?.addEventListener('mouseenter',()=>{brandAutoPaused=true});
  carousel?.addEventListener('mouseleave',()=>{brandAutoPaused=false;restartBrandAutoSlide()});
  carousel?.addEventListener('focusin',()=>{brandAutoPaused=true});
  carousel?.addEventListener('focusout',()=>{brandAutoPaused=false;restartBrandAutoSlide()});
  updateBrands();
  startBrandAutoSlide();
}
function bindProductCards(root){root.querySelectorAll('.see-more').forEach(btn=>btn.onclick=()=>{const box=btn.closest('.product-desc');const expanded=box.classList.toggle('expanded');btn.textContent=expanded?'See less':'See more';});root.querySelectorAll('.quote-product').forEach(b=>b.onclick=()=>location.href=`index.html?product=${encodeURIComponent(b.dataset.name)}&part=${encodeURIComponent(b.dataset.part)}#quote`)}
function card(p){const cat=p.categories?.name||'';const subcat=p.subcategories?.name||'';const brand=p.brands?.name||'';const desc=p.short_description||'Marine spare part or equipment.';return `<article class="product"><a class="visual product-link" href="product.html?id=${encodeURIComponent(p.id)}" aria-label="View ${esc(p.product_name)} details">${p.image_url?`<img src="${esc(p.image_url)}" alt="${esc(p.product_name)}" loading="lazy">`:esc((cat||'MAR').slice(0,3).toUpperCase())}</a><div class="body"><div class="product-meta"><span>${esc(cat||'Marine')}</span>${subcat?`<span>› ${esc(subcat)}</span>`:''}</div><h3><a href="product.html?id=${encodeURIComponent(p.id)}">${esc(p.product_name)}</a></h3>${brand?`<p class="product-detail"><b>Brand:</b> ${esc(brand)}</p>`:''}${p.part_number?`<p class="product-detail"><b>Part No:</b> ${esc(p.part_number)}</p>`:''}<p class="product-desc"><span class="desc-text">${esc(desc)}</span><button type="button" class="see-more">See more</button></p><button class="btn btn-primary quote-product" data-name="${esc(p.product_name)}" data-part="${esc(p.part_number||'')}">Request a Quote</button></div></article>`}
const detailRoot=document.querySelector('#productDetail');
if(detailRoot){
 const id=new URLSearchParams(location.search).get('id');const p=ps.find(x=>String(x.id)===id);
 if(!p){detailRoot.innerHTML='<div class="empty"><h1>Product unavailable</h1><p>This product may have been removed or is currently unavailable.</p><a class="btn btn-primary" href="products.html">Browse products</a></div>';document.querySelector('#relatedSection').hidden=true}
 else{
  document.title=`${p.product_name} | OceanCore`;
  detailRoot.innerHTML=`<div class="detail-image">${p.image_url?`<img src="${esc(p.image_url)}" alt="${esc(p.product_name)}">`:'<span>No product image available</span>'}</div><div class="detail-copy"><a class="detail-back" href="products.html?category=${encodeURIComponent(p.category_id||'')}">← Back to catalogue</a><p class="eyebrow">${esc(p.categories?.name||'Marine products')}</p><h1>${esc(p.product_name)}</h1><dl><dt>Brand</dt><dd>${esc(p.brands?.name||'Not specified')}</dd><dt>Part number</dt><dd>${esc(p.part_number||'Not specified')}</dd><dt>Category</dt><dd>${esc(p.categories?.name||'Not specified')}</dd><dt>Sub-category</dt><dd>${esc(p.subcategories?.name||'Not specified')}</dd></dl><h2>Product details</h2><p class="detail-description">${esc(p.description||p.short_description||'Contact OceanCore for specifications and compatibility details.')}</p><a class="btn btn-primary" href="index.html?product=${encodeURIComponent(p.product_name)}&part=${encodeURIComponent(p.part_number||'')}#quote">Request a Quote</a></div>`;
  const same=(a,b)=>a!=null&&b!=null&&String(a)===String(b);
  const score=x=>(same(x.subcategory_id,p.subcategory_id)?4:0)+(same(x.category_id,p.category_id)?2:0)+(same(x.brand_id,p.brand_id)?1:0);
  const related=ps.filter(x=>String(x.id)!==String(p.id)&&score(x)>0).sort((a,b)=>score(b)-score(a)).slice(0,4);
  const relatedRoot=document.querySelector('#relatedProducts');relatedRoot.innerHTML=related.length?related.map(card).join(''):'<div class="empty">No related products available yet.</div>';bindProductCards(relatedRoot);
 }
}
const fg=document.querySelector('#featuredGrid');
if(fg){
 // Cycle through the active catalogue before repeating products.
 const shuffle=items=>{const out=[...items];for(let i=out.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[out[i],out[j]]=[out[j],out[i]]}return out};
 let queue=shuffle(ps),last=[];const count=Math.min(8,ps.length);
 const rotateFeatured=()=>{
  if(!count){fg.innerHTML='<div class="empty">Products will appear here when active products are added.</div>';return}
  const batch=queue.splice(0,count);
  if(batch.length<count){queue=shuffle(ps.filter(p=>!batch.some(x=>String(x.id)===String(p.id))));batch.push(...queue.splice(0,count-batch.length));}
  if(!queue.length)queue=shuffle(ps);
  // Keep an identical order from recurring when the catalogue fits one batch.
  if(batch.length>1&&batch.every((p,i)=>String(p.id)===String(last[i]))){batch.push(batch.shift())}
  last=batch.map(p=>p.id);fg.innerHTML=batch.map(card).join('');bindProductCards(fg);
 };
 rotateFeatured();
 let paused=false;fg.addEventListener('mouseenter',()=>paused=true);fg.addEventListener('mouseleave',()=>paused=false);
 setInterval(()=>{if(!paused&&!document.hidden&&!fg.contains(document.activeElement)&&ps.length>1)rotateFeatured()},10000);
}
const homeSearchInput=document.querySelector('#homeSearchInput'),homeSearchResults=document.querySelector('#homeSearchResults');
if(homeSearchInput&&homeSearchResults){const updateHomeSearch=()=>{const q=homeSearchInput.value.trim().toLowerCase();if(!q){homeSearchResults.hidden=true;homeSearchResults.innerHTML='';return}const matches=ps.filter(p=>[p.product_name,p.part_number,p.short_description,p.categories?.name,p.subcategories?.name,p.brands?.name].join(' ').toLowerCase().includes(q)).slice(0,6);homeSearchResults.innerHTML=matches.length?matches.map(p=>`<a href="product.html?id=${encodeURIComponent(p.id)}"><span><b>${esc(p.product_name)}</b><small>${esc(p.part_number||'')}${p.brands?.name?' · '+esc(p.brands.name):''}</small></span><span>View →</span></a>`).join(''):'<div class="home-search-empty">No matching products found.</div>';homeSearchResults.hidden=false};homeSearchInput.addEventListener('input',updateHomeSearch);document.querySelector('#homeSearchForm')?.addEventListener('submit',e=>{e.preventDefault();const q=homeSearchInput.value.trim();if(q)location.href=`products.html?search=${encodeURIComponent(q)}`});document.addEventListener('click',e=>{if(!e.target.closest('.home-search'))homeSearchResults.hidden=true})}
const adRoot=document.querySelector('#brandAds'),adDots=document.querySelector('#brandAdDots');
if(adRoot){const ads=ps.filter(p=>p.brands&&p.brand_id).slice(0,8);if(!ads.length){adRoot.innerHTML='<div class="empty">Brand product highlights will appear here when active branded products are available.</div>';if(adDots)adDots.innerHTML=''}else{let adIndex=0;const drawAds=()=>{const p=ads[adIndex];adRoot.innerHTML=`<article class="brand-ad-card"><div class="brand-ad-copy"><span class="ad-kicker">${esc(p.brands.name)} · MARINE BRAND SPOTLIGHT</span><h3>${esc(p.product_name)}</h3><p>${esc(p.short_description||'Quality marine products supplied by OceanCore.')}</p><small>${p.part_number?'Part No: '+esc(p.part_number):'&nbsp;'}</small><a class="btn btn-primary" href="products.html?brand=${encodeURIComponent(p.brand_id)}">Explore ${esc(p.brands.name)} products</a></div><div class="brand-ad-image">${p.image_url?`<img src="${esc(p.image_url)}" alt="${esc(p.product_name)}" loading="lazy">`:`<span>${esc(p.brands.name)}</span>`}</div></article>`;if(adDots)adDots.innerHTML=ads.map((_,i)=>`<button type="button" aria-label="Show brand spotlight ${i+1}" class="${i===adIndex?'active':''}" data-ad-index="${i}"></button>`).join('');adDots?.querySelectorAll('button').forEach(b=>b.onclick=()=>{adIndex=Number(b.dataset.adIndex);drawAds()})};drawAds();let adTimer=setInterval(()=>{adIndex=(adIndex+1)%ads.length;drawAds()},5500);adRoot.addEventListener('mouseenter',()=>clearInterval(adTimer));adRoot.addEventListener('mouseleave',()=>{clearInterval(adTimer);adTimer=setInterval(()=>{adIndex=(adIndex+1)%ads.length;drawAds()},5500)})}}
const topSellingRoot=document.querySelector('#topSellingGrid');if(topSellingRoot){const top=ps.filter(p=>p.top_selling);topSellingRoot.innerHTML=top.length?top.map(card).join(''):'<div class="empty">Top selling items will appear here when the admin marks products as top sellers.</div>';bindProductCards(topSellingRoot)}
const reviewRoot=document.querySelector('#reviewGrid');if(reviewRoot){const {data:reviews,error}=await sb.from('customer_reviews').select('customer_name,company_name,review_text,rating').eq('is_published',true).order('created_at',{ascending:false}).limit(6);reviewRoot.innerHTML=!error&&reviews?.length?reviews.map(r=>`<article class="review-card"><div class="review-stars" aria-label="${Number(r.rating)||5} out of 5 stars">${'★'.repeat(Math.min(5,Math.max(1,Number(r.rating)||5)))}</div><p>“${esc(r.review_text)}”</p><b>${esc(r.customer_name)}</b><small>${esc(r.company_name||'')}</small></article>`).join(''):'<div class="empty">Customer reviews will appear here once published.</div>'}const pg=document.querySelector('#products');if(pg){let active='all',activeSub='all',activeBrand='all';let currentPage=1;const pageSize=20;const filters=document.querySelector('#filters'),subFilters=document.querySelector('#subcategoryFilters'),brandFilters=document.querySelector('#brandFilters');filters.innerHTML='<button class="active" data-id="all">All Products</button>'+cs.map(c=>`<button data-id="${c.id}">${esc(c.name)}</button>`).join('');subFilters.innerHTML='<span class="muted">Select a category</span>';if(brandFilters)brandFilters.innerHTML='<button class="active" data-brand="all">All Brands</button>'+bs.map(b=>`<button data-brand="${b.id}">${esc(b.name)}</button>`).join('');

const getFilteredProducts=()=>{const q=(document.querySelector('#search').value||'').trim().toLowerCase();return ps.filter(p=>(active==='all'||String(p.category_id)===active)&&(activeSub==='all'||String(p.subcategory_id)===activeSub)&&(activeBrand==='all'||String(p.brand_id)===activeBrand)&&[p.product_name,p.part_number,p.short_description,p.categories?.name,p.brands?.name].join(' ').toLowerCase().includes(q))};

const renderPagination=(totalPages)=>{
  let nav=document.querySelector('#productPagination');
  if(!nav){nav=document.createElement('div');nav.id='productPagination';nav.className='product-pagination';pg.parentNode.insertBefore(nav,pg.nextSibling)}
  if(totalPages<=1){nav.innerHTML='';nav.style.display='none';return}
  nav.style.display='flex';
  const pages=[];
  const add=p=>pages.push(`<button type="button" class="page-btn${p===currentPage?' active':''}" data-page="${p}">${p}</button>`);
  const dots=()=>pages.push('<span class="page-dots">…</span>');
  pages.push(`<button type="button" class="page-btn page-prev" data-page="${Math.max(1,currentPage-1)}"${currentPage===1?' disabled':''}>Previous</button>`);
  if(totalPages<=7){for(let i=1;i<=totalPages;i++)add(i)}
  else{
    add(1);
    if(currentPage>4)dots();
    const from=Math.max(2,currentPage-1),to=Math.min(totalPages-1,currentPage+1);
    for(let i=from;i<=to;i++)add(i);
    if(currentPage<totalPages-3)dots();
    add(totalPages);
  }
  pages.push(`<button type="button" class="page-btn page-next" data-page="${Math.min(totalPages,currentPage+1)}"${currentPage===totalPages?' disabled':''}>Next</button>`);
  nav.innerHTML=pages.join('');
  nav.querySelectorAll('.page-btn:not(:disabled)').forEach(b=>b.onclick=()=>{currentPage=Number(b.dataset.page);render();window.scrollTo({top:Math.max(0,pg.getBoundingClientRect().top+window.scrollY-110),behavior:'smooth'})});
};

const render=()=>{
  const arr=getFilteredProducts();
  const totalPages=Math.max(1,Math.ceil(arr.length/pageSize));
  if(currentPage>totalPages)currentPage=totalPages;
  const startIndex=(currentPage-1)*pageSize;
  const visible=arr.slice(startIndex,startIndex+pageSize);
  pg.innerHTML=visible.length?visible.map(card).join(''):'<div class="empty">No matching products found.</div>';
  bindProductCards(pg);
  let heading=active==='all'?'All Products':(cs.find(c=>String(c.id)===active)?.name||'Products');
  if(activeSub!=='all')heading+=' · '+(scs.find(x=>String(x.id)===activeSub)?.name||'Sub-category');
  if(activeBrand!=='all')heading+=(heading==='All Products'?'':' · ')+(bs.find(b=>String(b.id)===activeBrand)?.name||'Brand');
  document.querySelector('#title').textContent=heading+` (${arr.length})`;
  renderPagination(totalPages);
};

function renderSubfilters(){const rows=active==='all'?[]:scs.filter(x=>String(x.category_id)===active);subFilters.innerHTML=active==='all'?'<span class="muted">Select a category</span>':'<button class="active" data-sub="all">All '+esc(cs.find(c=>String(c.id)===active)?.name||'')+'</button>'+rows.map(x=>`<button data-sub="${x.id}">${esc(x.name)}</button>`).join('');subFilters.querySelectorAll('button').forEach(b=>b.onclick=()=>{subFilters.querySelectorAll('button').forEach(x=>x.classList.remove('active'));b.classList.add('active');activeSub=b.dataset.sub;currentPage=1;render()})}
filters.querySelectorAll('button').forEach(b=>b.onclick=()=>{filters.querySelectorAll('button').forEach(x=>x.classList.remove('active'));b.classList.add('active');active=b.dataset.id;activeSub='all';currentPage=1;renderSubfilters();render()});
brandFilters?.querySelectorAll('button').forEach(b=>b.onclick=()=>{brandFilters.querySelectorAll('button').forEach(x=>x.classList.remove('active'));b.classList.add('active');activeBrand=b.dataset.brand;currentPage=1;render()});
document.querySelector('#search').oninput=()=>{currentPage=1;render()};
const params=new URLSearchParams(location.search),wanted=params.get('category'),wantedSub=params.get('subcategory'),wantedBrand=params.get('brand');const wantedSearch=params.get('search');if(wantedSearch)document.querySelector('#search').value=wantedSearch;
if(wanted){const b=filters.querySelector(`[data-id="${wanted}"]`);if(b)b.click()}
if(wantedSub){const b=subFilters?.querySelector(`[data-sub="${wantedSub}"]`);if(b)b.click()}
if(wantedBrand){const b=brandFilters?.querySelector(`[data-brand="${wantedBrand}"]`);if(b)b.click()}
if(!wanted&&!wantedSub&&!wantedBrand){renderSubfilters();render()}}
document.querySelectorAll('.quote-product').forEach(b=>b.onclick=()=>location.href=`index.html?product=${encodeURIComponent(b.dataset.name)}&part=${encodeURIComponent(b.dataset.part)}#quote`);
const qp=new URLSearchParams(location.search);if(document.querySelector('#quoteProduct')&&qp.get('product')){document.querySelector('#quoteProduct').value=qp.get('product');document.querySelector('#quotePart').value=qp.get('part')||''}
const form=document.querySelector('#quoteForm');if(form)form.onsubmit=async e=>{e.preventDefault();const d=Object.fromEntries(new FormData(form));const {data:submitted,error}=await sb.from('quote_requests').insert([d]).select('id').single();if(error)alert('Unable to submit request. Please try again.');else{const {data:notifyData,error:notifyError}=await sb.functions.invoke('quote-notification',{body:{quote_request_id:submitted.id}});const sent=notifyData?.channels||{};alert(notifyError||(!sent.email&&!sent.whatsapp)?'Your quote request was received, but email / WhatsApp notification needs setup or troubleshooting.':(!sent.email||!sent.whatsapp)?'Your quote request was submitted. One notification channel did not send.':'Thank you. Your quote request has been submitted.');form.reset()}};
});
