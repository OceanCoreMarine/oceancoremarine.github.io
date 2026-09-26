document.addEventListener('DOMContentLoaded',async()=>{
const slides=[...document.querySelectorAll('.hero-slide')], dots=[...document.querySelectorAll('.hero-dot')]; let current=0, timer;
function showSlide(i){if(!slides.length)return; current=(i+slides.length)%slides.length; slides.forEach((s,n)=>s.classList.toggle('active',n===current)); dots.forEach((d,n)=>d.classList.toggle('active',n===current));}
function restart(){clearInterval(timer); if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return; timer=setInterval(()=>showSlide(current+1),6000);}
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
async function products(){let rows=[],start=0;while(true){
  let res=await sb.from('products').select('*,categories(name),brands(name),subcategories(name)').eq('active',true).order('created_at',{ascending:false}).range(start,start+999);
  if(res.error){
    console.warn('Public joined product query failed; using fallback.',res.error);
    res=await sb.from('products').select('*').eq('active',true).order('created_at',{ascending:false}).range(start,start+999);
    if(res.error){console.error('Public products query failed:',res.error);return rows;}
  }
  let data=res.data||[];
  rows=rows.concat(data);
  if(data.length<1000)break;
  start+=1000;
}return rows}
const cs=await cats();const scs=await subcategories();const bs=await brands();const ps=await products();

// Dynamic Categories mega menu (desktop hover, mobile tap)
const categoryWrap=document.querySelector('.nav-category-wrap');
const categoryToggle=document.querySelector('.nav-category-toggle');
const categoryMega=document.querySelector('#categoryMega');
if(categoryWrap && categoryToggle && categoryMega){
  const grouped=cs.map(c=>({category:c,subs:scs.filter(x=>String(x.category_id)===String(c.id))}));
  categoryMega.innerHTML=grouped.length?grouped.map(({category,subs})=>`<div class="mega-category"><div class="mega-category-title"><a href="products.html?category=${category.id}">${esc(category.name)}</a><span>${subs.length?subs.length+' sub-categories':''}</span></div><div class="mega-subcats">${subs.length?subs.map(x=>`<a href="products.html?category=${category.id}&subcategory=${x.id}">${esc(x.name)}</a>`).join(''):'<span class="mega-no-sub">All products</span>'}<a class="mega-view-all" href="products.html?category=${category.id}">View all ${esc(category.name)} →</a></div></div>`).join(''):'<div class="mega-empty">No categories available.</div>';
  const close=()=>{categoryWrap.classList.remove('open');categoryToggle.setAttribute('aria-expanded','false')};
  categoryToggle.addEventListener('click',e=>{e.preventDefault();categoryWrap.classList.toggle('open');categoryToggle.setAttribute('aria-expanded',String(categoryWrap.classList.contains('open')))});
  categoryMega.addEventListener('click',e=>{if(e.target.closest('a') && window.innerWidth<=900)close()});
  document.addEventListener('click',e=>{if(!categoryWrap.contains(e.target))close()});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
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
    if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
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
function card(p){const cat=p.categories?.name||'';const subcat=p.subcategories?.name||'';const brand=p.brands?.name||'';const desc=p.short_description||'Marine spare part or equipment.';return `<article class="product"><div class="visual">${p.image_url?`<img src="${esc(p.image_url)}" alt="${esc(p.product_name)}" loading="lazy">`:esc((cat||'MAR').slice(0,3).toUpperCase())}</div><div class="body"><div class="product-meta"><span>${esc(cat||'Marine')}</span>${subcat?`<span>› ${esc(subcat)}</span>`:''}</div><h3>${esc(p.product_name)}</h3>${brand?`<p class="product-detail"><b>Brand:</b> ${esc(brand)}</p>`:''}${p.part_number?`<p class="product-detail"><b>Part No:</b> ${esc(p.part_number)}</p>`:''}<p class="product-desc"><span class="desc-text">${esc(desc)}</span><button type="button" class="see-more">See more</button></p><button class="btn btn-primary quote-product" data-name="${esc(p.product_name)}" data-part="${esc(p.part_number||'')}">Request a Quote</button></div></article>`}
const fg=document.querySelector('#featuredGrid');if(fg){const f=ps.filter(x=>x.featured).slice(0,8);fg.innerHTML=f.length?f.map(card).join(''):'<div class="empty">Featured products will appear here when the admin marks products as featured.</div>';bindProductCards(fg)}
const pg=document.querySelector('#products');if(pg){let active='all',activeSub='all',activeBrand='all',page=1;const pageSize=12,filters=document.querySelector('#filters'),subFilters=document.querySelector('#subcategoryFilters'),brandFilters=document.querySelector('#brandFilters'),pagination=document.querySelector('#productPagination');filters.innerHTML='<button class="active" data-id="all">All Products</button>'+cs.map(c=>`<button data-id="${c.id}">${esc(c.name)}</button>`).join('');subFilters.innerHTML='<span class="muted">Select a category</span>';if(brandFilters)brandFilters.innerHTML='<button class="active" data-brand="all">All Brands</button>'+bs.map(b=>`<button data-brand="${b.id}">${esc(b.name)}</button>`).join('');const render=()=>{const q=(document.querySelector('#search').value||'').trim().toLowerCase();const arr=ps.filter(p=>(active==='all'||String(p.category_id)===active)&&(activeSub==='all'||String(p.subcategory_id)===activeSub)&&(activeBrand==='all'||String(p.brand_id)===activeBrand)&&[p.product_name,p.part_number,p.short_description,p.categories?.name,p.brands?.name,p.subcategories?.name,p.oem_number,p.model].join(' ').toLowerCase().includes(q));const pages=Math.max(1,Math.ceil(arr.length/pageSize));page=Math.min(page,pages);const shown=arr.slice((page-1)*pageSize,page*pageSize);pg.innerHTML=shown.length?shown.map(card).join(''):'<div class="empty">No matching products found. Try another part number or clear a filter.</div>';bindProductCards(pg);let heading=active==='all'?'All Products':(cs.find(c=>String(c.id)===active)?.name||'Products');if(activeSub!=='all')heading+=' · '+(scs.find(x=>String(x.id)===activeSub)?.name||'Sub-category');if(activeBrand!=='all')heading+=(heading==='All Products'?'':' · ')+(bs.find(b=>String(b.id)===activeBrand)?.name||'Brand');document.querySelector('#title').textContent=heading;const summary=document.querySelector('#resultSummary');summary.textContent=`${arr.length} product${arr.length===1?'':'s'} found${arr.length?` · showing ${(page-1)*pageSize+1}–${Math.min(page*pageSize,arr.length)}`:''}`;pagination.innerHTML=pages>1?`<button type="button" class="page-btn" data-page="${Math.max(1,page-1)}" ${page===1?'disabled':''} aria-label="Previous page">← Previous</button><span aria-current="page">Page ${page} of ${pages}</span><button type="button" class="page-btn" data-page="${Math.min(pages,page+1)}" ${page===pages?'disabled':''} aria-label="Next page">Next →</button>`:'';pagination.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>{page=Number(b.dataset.page);render();document.querySelector('.topbar').scrollIntoView({behavior:'smooth',block:'start'})})};function renderSubfilters(){const rows=active==='all'?[]:scs.filter(x=>String(x.category_id)===active);subFilters.innerHTML=active==='all'?'<span class="muted">Select a category</span>':'<button class="active" data-sub="all">All '+esc(cs.find(c=>String(c.id)===active)?.name||'')+'</button>'+rows.map(x=>`<button data-sub="${x.id}">${esc(x.name)}</button>`).join('');subFilters.querySelectorAll('button').forEach(b=>b.onclick=()=>{subFilters.querySelectorAll('button').forEach(x=>x.classList.remove('active'));b.classList.add('active');activeSub=b.dataset.sub;page=1;render()})}filters.querySelectorAll('button').forEach(b=>b.onclick=()=>{filters.querySelectorAll('button').forEach(x=>x.classList.remove('active'));b.classList.add('active');active=b.dataset.id;activeSub='all';page=1;renderSubfilters();render()});brandFilters?.querySelectorAll('button').forEach(b=>b.onclick=()=>{brandFilters.querySelectorAll('button').forEach(x=>x.classList.remove('active'));b.classList.add('active');activeBrand=b.dataset.brand;page=1;render()});document.querySelector('#search').oninput=()=>{page=1;render()};const params=new URLSearchParams(location.search),wanted=params.get('category'),wantedSub=params.get('subcategory'),wantedBrand=params.get('brand');if(wanted){const b=filters.querySelector(`[data-id="${wanted}"]`);if(b)b.click()}if(wantedSub){const b=subFilters?.querySelector(`[data-sub="${wantedSub}"]`);if(b)b.click()}if(wantedBrand){const b=brandFilters?.querySelector(`[data-brand="${wantedBrand}"]`);if(b)b.click()}if(!wanted&&!wantedSub&&!wantedBrand){renderSubfilters();render()}}
document.querySelectorAll('.quote-product').forEach(b=>b.onclick=()=>location.href=`index.html?product=${encodeURIComponent(b.dataset.name)}&part=${encodeURIComponent(b.dataset.part)}#quote`)};function renderSubfilters(){const rows=active==='all'?[]:scs.filter(x=>String(x.category_id)===active);subFilters.innerHTML=active==='all'?'<span class="muted">Select a category</span>':'<button class="active" data-sub="all">All '+esc(cs.find(c=>String(c.id)===active)?.name||'')+'</button>'+rows.map(x=>`<button data-sub="${x.id}">${esc(x.name)}</button>`).join('');subFilters.querySelectorAll('button').forEach(b=>b.onclick=()=>{subFilters.querySelectorAll('button').forEach(x=>x.classList.remove('active'));b.classList.add('active');activeSub=b.dataset.sub;render()})}filters.querySelectorAll('button').forEach(b=>b.onclick=()=>{filters.querySelectorAll('button').forEach(x=>x.classList.remove('active'));b.classList.add('active');active=b.dataset.id;activeSub='all';renderSubfilters();render()});brandFilters?.querySelectorAll('button').forEach(b=>b.onclick=()=>{brandFilters.querySelectorAll('button').forEach(x=>x.classList.remove('active'));b.classList.add('active');activeBrand=b.dataset.brand;render()});document.querySelector('#search').oninput=render;const params=new URLSearchParams(location.search),wanted=params.get('category'),wantedSub=params.get('subcategory'),wantedBrand=params.get('brand');if(wanted){const b=filters.querySelector(`[data-id="${wanted}"]`);if(b)b.click()}if(wantedSub){const b=subFilters?.querySelector(`[data-sub="${wantedSub}"]`);if(b)b.click()}if(wantedBrand){const b=brandFilters?.querySelector(`[data-brand="${wantedBrand}"]`);if(b)b.click()}if(!wanted&&!wantedSub&&!wantedBrand){renderSubfilters();render()}}
document.querySelectorAll('.quote-product').forEach(b=>b.onclick=()=>location.href=`index.html?product=${encodeURIComponent(b.dataset.name)}&part=${encodeURIComponent(b.dataset.part)}#quote`);
const qp=new URLSearchParams(location.search);if(document.querySelector('#quoteProduct')&&qp.get('product')){document.querySelector('#quoteProduct').value=qp.get('product');document.querySelector('#quotePart').value=qp.get('part')||''}
const form=document.querySelector('#quoteForm');if(form)form.onsubmit=async e=>{e.preventDefault();const button=form.querySelector('[type="submit"]'),result=document.querySelector('#quoteResult'),file=form.querySelector('#quoteAttachment')?.files?.[0];if(file&&(file.size>8*1024*1024||!['image/jpeg','image/png','image/webp','application/pdf'].includes(file.type))){result.textContent='Please attach a JPG, PNG, WebP or PDF file up to 8 MB.';result.className='quote-result error';return}button.disabled=true;button.textContent='Sending…';result.textContent='';try{const formData=new FormData(form),payload={};for(const [k,v] of formData.entries())if(k!=='attachment'&&typeof v==='string')payload[k]=v;payload.quantity=Number(payload.quantity)||1;const attachmentPath=file?`${crypto.randomUUID()}.${file.type==='application/pdf'?'pdf':file.type==='image/png'?'png':file.type==='image/webp'?'webp':'jpg'}`:null;if(attachmentPath)payload.attachment_path=attachmentPath;const {error}=await sb.from('quote_requests').insert([payload]);if(error)throw error;if(file){const up=await sb.storage.from('quote-attachments').upload(attachmentPath,file,{contentType:file.type,upsert:false});if(up.error){result.textContent='Your request was received, but the attachment could not be uploaded. Please email it to marineoceancore@gmail.com with your name.';result.className='quote-result error';form.reset();return}}form.reset();result.textContent='Thank you — your request has been received. OceanCore will follow up using the contact details you provided.';result.className='quote-result success'}catch(err){result.textContent='We could not submit your request. Please try again or contact marineoceancore@gmail.com.';result.className='quote-result error';console.error('Quote submission failed',err)}finally{button.disabled=false;button.textContent='Send Quote Request'}};
});
