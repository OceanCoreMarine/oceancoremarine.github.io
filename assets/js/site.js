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
const pg=document.querySelector('#products');if(pg){let active='all',activeSub='all',activeBrand='all';let currentPage=1;const pageSize=20;const filters=document.querySelector('#filters'),subFilters=document.querySelector('#subcategoryFilters'),brandFilters=document.querySelector('#brandFilters');filters.innerHTML='<button class="active" data-id="all">All Products</button>'+cs.map(c=>`<button data-id="${c.id}">${esc(c.name)}</button>`).join('');subFilters.innerHTML='<span class="muted">Select a category</span>';if(brandFilters)brandFilters.innerHTML='<button class="active" data-brand="all">All Brands</button>'+bs.map(b=>`<button data-brand="${b.id}">${esc(b.name)}</button>`).join('');

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
const params=new URLSearchParams(location.search),wanted=params.get('category'),wantedSub=params.get('subcategory'),wantedBrand=params.get('brand');
if(wanted){const b=filters.querySelector(`[data-id="${wanted}"]`);if(b)b.click()}
if(wantedSub){const b=subFilters?.querySelector(`[data-sub="${wantedSub}"]`);if(b)b.click()}
if(wantedBrand){const b=brandFilters?.querySelector(`[data-brand="${wantedBrand}"]`);if(b)b.click()}
if(!wanted&&!wantedSub&&!wantedBrand){renderSubfilters();render()}}
document.querySelectorAll('.quote-product').forEach(b=>b.onclick=()=>location.href=`index.html?product=${encodeURIComponent(b.dataset.name)}&part=${encodeURIComponent(b.dataset.part)}#quote`);
const qp=new URLSearchParams(location.search);if(document.querySelector('#quoteProduct')&&qp.get('product')){document.querySelector('#quoteProduct').value=qp.get('product');document.querySelector('#quotePart').value=qp.get('part')||''}
const form=document.querySelector('#quoteForm');if(form)form.onsubmit=async e=>{e.preventDefault();const d=Object.fromEntries(new FormData(form));const {error}=await sb.from('quote_requests').insert([d]);if(error)alert('Unable to submit request. Please try again.');else{alert('Thank you. Your quote request has been submitted.');form.reset()}};
});
