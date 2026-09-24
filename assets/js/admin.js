document.addEventListener('DOMContentLoaded',()=>{const sb=window.ocSupabase,$=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];let customerData=[], quotationData=[], invoiceData=[], editingQuotationId=null;
const COMPANY={name:'OceanCore Marine Spare Parts',address:'Sharjah Industrial Area 2, DUBAI, UNITED ARAB EMIRATES',phone:'+971564502513',email:'marineoceancore@gmail.com',website:'https://oceancoremarine.github.io/',currency:'AED',vat:5,validity:15,payment:'Cash On Delivery',delivery:'Delivery within 3–7 working days',bank:'ADCB Bank',accountName:'Raibul Alam',accountNumber:'12373479910001',iban:'AE650030012373479910001',swift:'ADCBAEAA060'};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));function notice(t,e=false){const x=$('#msg');x.textContent=t;x.className='msg'+(e?' danger':'');setTimeout(()=>x.classList.add('hidden'),4000)}function loginNotice(t){$('#loginMsg').textContent=t;$('#loginMsg').classList.remove('hidden')}
async function authorized(){const {data:{user}}=await sb.auth.getUser();if(!user)return false;const {data}=await sb.from('admin_users').select('user_id').eq('user_id',user.id).maybeSingle();return !!data}
async function refreshUsage(){
  const set=(id,v)=>{const el=document.querySelector(id);if(el)el.textContent=v};
  set('#uProducts',prodData.length); set('#uCategories',catData.length); set('#uSubcategories',subcatData.length); set('#uBrands',brandData.length);
  let total=0, count=0;
  for(const folder of ['products','brands']){
    let offset=0;
    while(true){
      const {data,error}=await sb.storage.from('product-images').list(folder,{limit:1000,offset,sortBy:{column:'name',order:'asc'}});
      if(error){set('#uStorage','Unavailable');set('#uStoragePct','Storage API');break}
      const rows=(data||[]).filter(x=>x.name && x.metadata && x.metadata.size!=null);
      rows.forEach(x=>{const n=Number(x.metadata.size); if(Number.isFinite(n)) total+=n; count++});
      if(!data || data.length<1000) break; offset+=1000;
    }
  }
  if(total>=0){const mb=total/1024/1024;const pct=(total/(1024*1024*1024))*100;set('#uStorage',mb<1?`${(total/1024).toFixed(1)} KB`:`${mb.toFixed(2)} MB`);set('#uStoragePct',`${pct.toFixed(2)}% of 1 GB`)}
  const {data:db,error:dbErr}=await sb.rpc('get_database_size_bytes');
  if(!dbErr && db!=null){const bytes=Number(db);const mb=bytes/1024/1024;const pct=bytes/(500*1024*1024)*100;set('#uDatabase',`${mb.toFixed(2)} MB`);set('#uDatabasePct',`${pct.toFixed(2)}% of 500 MB`)}else{set('#uDatabase','Not enabled');set('#uDatabasePct','run SQL setup')}
}

async function load(){if(!await authorized()){await sb.auth.signOut();$('#login').classList.remove('hidden');$('#app').classList.add('hidden');loginNotice('This account is not authorized as an OceanCore administrator.');return}$('#login').classList.add('hidden');$('#app').classList.remove('hidden');await Promise.all([categories(),subcategories(),brands(),products(),quotes(),customers(),quotations(),invoices()]);await refreshUsage()}

async function compressImage(file, kind='product') {
  if (!file || !file.type.startsWith('image/')) throw new Error('Please select an image file.');
  const target = 50 * 1024;
  const maxDim = kind === 'logo' ? 700 : 1400;
  const bitmap = await createImageBitmap(file);
  let scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  let width = Math.max(1, Math.round(bitmap.width * scale));
  let height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', {alpha:true});
  const qualities = [0.84,0.72,0.62,0.52,0.42,0.32,0.24,0.18,0.12];
  let best = null;
  for (let pass=0; pass<12; pass++) {
    canvas.width = width; canvas.height = height;
    ctx.clearRect(0,0,width,height);
    ctx.drawImage(bitmap,0,0,width,height);
    for (const q of qualities) {
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', q));
      if (!blob) continue;
      if (!best || blob.size < best.size) best = blob;
      if (blob.size <= target) {
        bitmap.close();
        return new File([blob], `${crypto.randomUUID()}.webp`, {type:'image/webp'});
      }
    }
    width = Math.max(240, Math.round(width * 0.82));
    height = Math.max(240, Math.round(height * 0.82));
    if (width === 240 && height === 240) break;
  }
  bitmap.close();
  if (best && best.size <= target) return new File([best], `${crypto.randomUUID()}.webp`, {type:'image/webp'});
  throw new Error('Could not compress this image below 50 KB. Please choose a simpler image.');
}

$('#loginForm').onsubmit=async e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.target));const {error}=await sb.auth.signInWithPassword({email:d.email,password:d.password});if(error)return loginNotice(error.message);load()};$('#logout').onclick=async()=>{await sb.auth.signOut();location.reload()};$$('.adminnav button').forEach(b=>b.onclick=()=>{$$('.adminnav button').forEach(x=>x.classList.remove('active'));b.classList.add('active');$$('.tab').forEach(x=>x.classList.remove('active'));$('#'+b.dataset.tab).classList.add('active')});
let catData=[],subcatData=[],brandData=[],prodData=[];async function categories(){const {data,error}=await sb.from('categories').select('*').order('name');if(error)return notice(error.message,true);catData=data||[];const opts=catData.map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join('');$('#catSelect').innerHTML=opts;$('#subcatCategory').innerHTML=opts;$('#categoryTable').innerHTML=catData.map(c=>`<tr><td>${esc(c.name)}</td><td><button class="small danger" data-delcat="${c.id}">Delete</button></td></tr>`).join('');$$('[data-delcat]').forEach(b=>b.onclick=async()=>{if(!confirm('Delete this category?'))return;const {error}=await sb.from('categories').delete().eq('id',b.dataset.delcat);if(error)notice(error.message,true);else{notice('Category deleted');categories();products();setTimeout(refreshUsage,150)}})}
async function subcategories(){const {data,error}=await sb.from('subcategories').select('*,categories(name)').order('name');if(error)return notice(error.message,true);subcatData=data||[];$('#subcategoryTable').innerHTML=subcatData.map(x=>`<tr><td>${esc(x.categories?.name||'')}</td><td><b>${esc(x.name)}</b></td><td><div class="actions"><button class="small" data-editsub="${x.id}">Edit</button><button class="small danger" data-delsub="${x.id}">Delete</button></div></td></tr>`).join('');$$('[data-editsub]').forEach(b=>b.onclick=()=>editSubcategory(b.dataset.editsub));$$('[data-delsub]').forEach(b=>b.onclick=async()=>{if(!confirm('Delete this sub-category?'))return;const {error}=await sb.from('subcategories').delete().eq('id',b.dataset.delsub);if(error)notice(error.message,true);else{notice('Sub-category deleted');subcategories();products()}});populateSubcategories($('#catSelect').value)}
function populateSubcategories(categoryId,selected=''){const el=$('#subcatSelect');if(!el)return;const rows=subcatData.filter(x=>String(x.category_id)===String(categoryId));el.innerHTML='<option value="">No sub-category</option>'+rows.map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join('');if(selected)el.value=selected}
function editSubcategory(id){const x=subcatData.find(v=>String(v.id)===String(id)),f=$('#subcategoryForm');if(!x)return;f.id.value=x.id;f.category_id.value=x.category_id;f.name.value=x.name;f.description.value=x.description||'';$('#stitle').textContent='Edit Sub-category';$('#cancelSubcategory').classList.remove('hidden');document.querySelector('[data-tab="categories"]').click();scrollTo({top:0,behavior:'smooth'})}
function resetSubcategory(){const f=$('#subcategoryForm');f.reset();f.id.value='';$('#stitle').textContent='Add Sub-category';$('#cancelSubcategory').classList.add('hidden')}
$('#cancelSubcategory').onclick=resetSubcategory;
$('#subcategoryForm').onsubmit=async e=>{e.preventDefault();const f=e.target,d=Object.fromEntries(new FormData(f));const payload={category_id:Number(d.category_id),name:d.name,description:d.description||null};const res=d.id?await sb.from('subcategories').update(payload).eq('id',d.id):await sb.from('subcategories').insert([payload]);if(res.error)return notice(res.error.message,true);notice(d.id?'Sub-category updated':'Sub-category added');resetSubcategory();subcategories();setTimeout(refreshUsage,150)};
async function brands(){const {data,error}=await sb.from('brands').select('*').order('name');if(error)return notice(error.message,true);brandData=data||[];$('#brandSelect').innerHTML='<option value="">No brand</option>'+brandData.map(b=>`<option value="${b.id}">${esc(b.name)}</option>`).join('');$('#brandTable').innerHTML=brandData.map(b=>`<tr><td>${b.logo_url?`<img class="brand-thumb" src="${esc(b.logo_url)}" alt="${esc(b.name)} logo">`:'—'}</td><td><b>${esc(b.name)}</b></td><td><div class="actions"><button class="small" data-editbrand="${b.id}">Edit</button><button class="small danger" data-delbrand="${b.id}">Delete</button></div></td></tr>`).join('');$$('[data-editbrand]').forEach(b=>b.onclick=()=>editBrand(b.dataset.editbrand));$$('[data-delbrand]').forEach(b=>b.onclick=async()=>{if(!confirm('Delete this brand?'))return;const {error}=await sb.from('brands').delete().eq('id',b.dataset.delbrand);if(error)notice(error.message,true);else{notice('Brand deleted');brands();products()}})}
async function products(){const {data,error}=await sb.from('products').select('*,categories(name),brands(name)').order('created_at',{ascending:false});if(error)return notice(error.message,true);prodData=data||[];refreshQuotationProductSelects();$('#productTable').innerHTML=prodData.map(p=>`<tr><td>${p.image_url?`<img class="thumb" src="${esc(p.image_url)}">`:'—'}</td><td><b>${esc(p.product_name)}</b><br>${p.active?'Active':'Inactive'}${p.featured?' · Featured':''}</td><td>${esc(p.categories?.name||'')}</td><td>${esc(p.brands?.name||'')}</td><td>${esc(p.part_number||'')}</td><td><div class="actions"><button class="small" data-edit="${p.id}">Edit</button><button class="small danger" data-del="${p.id}">Delete</button></div></td></tr>`).join('');$$('[data-edit]').forEach(b=>b.onclick=()=>edit(b.dataset.edit));$$('[data-del]').forEach(b=>b.onclick=()=>delProduct(b.dataset.del))}
function edit(id){const p=prodData.find(x=>String(x.id)===String(id)),f=$('#productForm');if(!p)return;f.id.value=p.id;f.product_name.value=p.product_name;f.category_id.value=p.category_id;populateSubcategories(p.category_id,p.subcategory_id||'');f.brand_id.value=p.brand_id||'';f.part_number.value=p.part_number||'';f.short_description.value=p.short_description||'';f.featured.checked=!!p.featured;f.active.checked=!!p.active;$('#ptitle').textContent='Edit Product';$('#cancel').classList.remove('hidden');scrollTo({top:0,behavior:'smooth'})}$('#cancel').onclick=reset;function reset(){const f=$('#productForm');f.reset();f.id.value='';f.active.checked=true;$('#ptitle').textContent='Add Product';$('#cancel').classList.add('hidden')}
async function delProduct(id){if(!confirm('Delete this product?'))return;const {error}=await sb.from('products').delete().eq('id',id);if(error)notice(error.message,true);else{notice('Product deleted');products();setTimeout(refreshUsage,150)}}
$('#productForm').onsubmit=async e=>{e.preventDefault();const f=e.target,d=Object.fromEntries(new FormData(f));let imageUrl=null;if(d.id){imageUrl=prodData.find(p=>String(p.id)===String(d.id))?.image_url||null}const file=f.image.files[0];if(file){let optimized;try{optimized=await compressImage(file,'product')}catch(err){return notice(err.message,true)}const path=`products/${optimized.name}`;const up=await sb.storage.from('product-images').upload(path,optimized,{contentType:optimized.type,upsert:false});if(up.error)return notice(up.error.message,true);imageUrl=sb.storage.from('product-images').getPublicUrl(path).data.publicUrl;notice(`Product image optimized to ${(optimized.size/1024).toFixed(1)} KB`)}const payload={product_name:d.product_name,category_id:Number(d.category_id),subcategory_id:d.subcategory_id?Number(d.subcategory_id):null,brand_id:d.brand_id?Number(d.brand_id):null,part_number:d.part_number||null,short_description:d.short_description||null,image_url:imageUrl,featured:f.featured.checked,active:f.active.checked,updated_at:new Date().toISOString()};let res=d.id?await sb.from('products').update(payload).eq('id',d.id):await sb.from('products').insert([payload]);if(res.error)return notice(res.error.message,true);notice(d.id?'Product updated':'Product added');reset();products();setTimeout(refreshUsage,150)};
function editBrand(id){const b=brandData.find(x=>String(x.id)===String(id)),f=$('#brandForm');if(!b)return;f.id.value=b.id;f.name.value=b.name;$('#btitle').textContent='Edit Brand';$('#cancelBrand').classList.remove('hidden');$('#brandPreview').innerHTML=b.logo_url?`<div style="font-size:11px;font-weight:800;margin-bottom:6px">Current Logo</div><img class="brand-preview" src="${esc(b.logo_url)}" alt="${esc(b.name)} logo">`:'';document.querySelector('[data-tab="brands"]').click();scrollTo({top:0,behavior:'smooth'})}function resetBrand(){const f=$('#brandForm');f.reset();f.id.value='';$('#btitle').textContent='Add Brand';$('#cancelBrand').classList.add('hidden');$('#brandPreview').innerHTML=''}$('#cancelBrand').onclick=resetBrand;$('#brandForm').onsubmit=async e=>{e.preventDefault();const f=e.target,d=Object.fromEntries(new FormData(f));let logoUrl=null;if(d.id){logoUrl=brandData.find(b=>String(b.id)===String(d.id))?.logo_url||null}const file=f.logo.files[0];if(file){let optimized;try{optimized=await compressImage(file,'logo')}catch(err){return notice(err.message,true)}const path=`brands/${optimized.name}`;const up=await sb.storage.from('product-images').upload(path,optimized,{contentType:optimized.type,upsert:false});if(up.error)return notice(up.error.message,true);logoUrl=sb.storage.from('product-images').getPublicUrl(path).data.publicUrl;notice(`Brand logo optimized to ${(optimized.size/1024).toFixed(1)} KB`)}const payload={name:d.name,logo_url:logoUrl};const res=d.id?await sb.from('brands').update(payload).eq('id',d.id):await sb.from('brands').insert([payload]);if(res.error)return notice(res.error.message,true);notice(d.id?'Brand updated':'Brand added');resetBrand();brands();setTimeout(refreshUsage,150)};
$('#categoryForm').onsubmit=async e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.target)),{error}=await sb.from('categories').insert([{name:d.name,description:d.description||null}]);if(error)notice(error.message,true);else{notice('Category added');e.target.reset();categories();setTimeout(refreshUsage,150)}};
async function quotes(){const {data,error}=await sb.from('quote_requests').select('*').order('created_at',{ascending:false});if(error)return notice(error.message,true);$('#quoteTable').innerHTML=(data||[]).map(q=>`<tr><td>${new Date(q.created_at).toLocaleString()}</td><td><b>${esc(q.customer_name)}</b><br>${esc(q.company_name||'')}</td><td>${esc(q.email)}<br>${esc(q.phone||'')}</td><td>${esc(q.product_name||'')}<br>${esc(q.part_number||'')}</td><td>${esc(q.message||'')}</td><td>${esc(q.status||'New')}</td><td><div class="actions"><button class="small" data-contact="${q.id}">Mark Contacted</button><button class="small danger" data-delquote="${q.id}">Delete</button></div></td></tr>`).join('');$$('[data-contact]').forEach(b=>b.onclick=async()=>{const {error}=await sb.from('quote_requests').update({status:'Contacted'}).eq('id',b.dataset.contact);if(error)notice(error.message,true);else{notice('Quote request marked as contacted');quotes()}});$$('[data-delquote]').forEach(b=>b.onclick=async()=>{if(!confirm('Delete this quote request permanently? This cannot be undone.'))return;const {error}=await sb.from('quote_requests').delete().eq('id',b.dataset.delquote);if(error)return notice(error.message,true);notice('Quote request deleted');quotes()})}
$('#catSelect').addEventListener('change',e=>populateSubcategories(e.target.value));load();
// ---------------- Quotation / Invoice module ----------------
function billSwitch(name){$$('[data-billtab]').forEach(b=>b.classList.toggle('active',b.dataset.billtab===name));$$('.billpane').forEach(x=>x.classList.add('hidden'));$('#bill-'+name).classList.remove('hidden');if(name==='customers')customers();if(name==='quotations')quotations();if(name==='invoices')invoices()}
$$('[data-billtab]').forEach(b=>b.onclick=()=>billSwitch(b.dataset.billtab));
function fmt(n){return `${COMPANY.currency} ${Number(n||0).toFixed(2)}`}
function customerOpts(selected=''){return '<option value="">Select customer</option>'+customerData.map(c=>`<option value="${c.id}" ${String(c.id)===String(selected)?'selected':''}>${esc(c.company_name||c.contact_name)} — ${esc(c.contact_name)}</option>`).join('')}
async function customers(){const {data,error}=await sb.from('customers').select('*').order('created_at',{ascending:false});if(error)return notice(error.message,true);customerData=data||[];const q=$('#qCustomer');if(q)q.innerHTML=customerOpts(q.value);const t=$('#customerTable');if(t)t.innerHTML=customerData.map(c=>`<tr><td>${esc(c.company_name||'')}</td><td>${esc(c.contact_name)}</td><td>${esc(c.email||'')}</td><td>${esc(c.phone||'')}</td><td><button class="small" data-editcustomer="${c.id}">Edit</button> <button class="small danger" data-delcustomer="${c.id}">Delete</button></td></tr>`).join('');$$('[data-editcustomer]').forEach(b=>b.onclick=()=>editCustomer(b.dataset.editcustomer));$$('[data-delcustomer]').forEach(b=>b.onclick=async()=>{if(!confirm('Delete this customer?'))return;const r=await sb.from('customers').delete().eq('id',b.dataset.delcustomer);if(r.error)notice(r.error.message,true);else{notice('Customer deleted');customers()}})}
function editCustomer(id){const c=customerData.find(x=>String(x.id)===String(id)),f=$('#customerForm');if(!c)return;Object.keys(c).forEach(k=>{if(f[k])f[k].value=c[k]||''});$('#cancelCustomer').classList.remove('hidden');scrollTo({top:0,behavior:'smooth'})}
function resetCustomer(){const f=$('#customerForm');f.reset();f.id.value='';$('#cancelCustomer').classList.add('hidden')}
$('#cancelCustomer').onclick=resetCustomer;
$('#customerForm').onsubmit=async e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.target));const payload={company_name:d.company_name||null,contact_name:d.contact_name,email:d.email||null,phone:d.phone||null,address:d.address||null,country:d.country||null,notes:d.notes||null,updated_at:new Date().toISOString()};const r=d.id?await sb.from('customers').update(payload).eq('id',d.id):await sb.from('customers').insert([payload]);if(r.error)return notice(r.error.message,true);notice(d.id?'Customer updated':'Customer added');resetCustomer();customers()};
function productList(){return prodData.filter(p=>p.active!==false)}
function productOpts(selected=''){const list=productList();return '<option value="">Select product</option>'+list.map(p=>`<option value="${p.id}" data-part="${esc(p.part_number||'')}" data-name="${esc(p.product_name)}" ${String(p.id)===String(selected)?'selected':''}>${esc(p.product_name)}${p.part_number?' — '+esc(p.part_number):''}${p.brands?.name?' — '+esc(p.brands.name):''}</option>`).join('')}
function productSearchText(p){return `${p.product_name||''}${p.part_number?' — '+p.part_number:''}${p.brands?.name?' — '+p.brands.name:''}`.trim()}
function productSearchOptions(){return productList().map(p=>`<option value="${esc(productSearchText(p))}"></option>`).join('')}
function refreshQuotationProductSelects(){
  $$('#qItems .item-row, #invoiceItems .item-row').forEach(row=>{
    const sel=row.querySelector('.item-product');
    const search=row.querySelector('.item-product-search');
    const current=sel?.value||'';
    if(sel){sel.innerHTML=productOpts(current);sel.value=current;}
    if(search&&current){
      const p=productList().find(x=>String(x.id)===String(current));
      if(p){search.value=productSearchText(p);row.querySelector('.item-part').value=p.part_number||'';}
    }
  });
}
function addItem(kind='q',item={}){
  const body=$(kind==='q'?'#qItems':'#invoiceItems');
  if(!body)return;
  const tr=document.createElement('tr');
  tr.className='item-row';
  const selected=productList().find(p=>String(p.id)===String(item.product_id||''));
  const selectedText=selected?productSearchText(selected):'';
  tr.innerHTML=`<td class="product-search-cell"><div class="product-picker"><div class="product-search-wrap"><input class="item-product-search" type="search" placeholder="Search name / part no. / brand" value="${esc(selectedText)}" autocomplete="off"><button type="button" class="product-clear" title="Clear product" aria-label="Clear product">×</button></div><div class="product-results hidden"></div></div><select class="item-product" style="display:none">${productOpts(item.product_id||'')}</select></td><td><input class="item-part" value="${esc(item.part_number||selected?.part_number||'')}" readonly></td><td><input class="item-qty" type="number" min="0.01" step="0.01" value="${item.quantity||1}"></td><td><input class="item-price" type="number" min="0" step="0.01" value="${item.unit_price||0}"></td><td><input class="item-discount" type="number" min="0" step="0.01" value="${item.discount||0}"></td><td class="item-total">${fmt(item.line_total||0)}</td><td><button type="button" class="small danger remove-item">×</button></td>`;
  body.appendChild(tr);
  const sel=tr.querySelector('.item-product');
  const search=tr.querySelector('.item-product-search');
  const results=tr.querySelector('.product-results');
  const clearBtn=tr.querySelector('.product-clear');
  const part=tr.querySelector('.item-part');
  function closeOtherResults(){
    $$('#qItems .product-results, #invoiceItems .product-results').forEach(el=>{
      if(el!==results){el.classList.add('hidden');el.innerHTML='';el.style.left='';el.style.top='';el.style.width='';}
    });
  }
  function chooseProduct(p){
    if(!p)return;
    closeOtherResults();
    sel.value=String(p.id);
    part.value=p.part_number||'';
    search.value=productSearchText(p);
    results.classList.add('hidden');
    results.innerHTML='';
    results.style.left='';results.style.top='';results.style.width='';
    calcQuotation();
  }
  function clearProduct(){
    sel.value='';
    part.value='';
    search.value='';
    results.innerHTML='';
    results.classList.add('hidden');
    results.style.left='';results.style.top='';results.style.width='';
    calcQuotation();
    search.focus();
  }
  function positionResults(){
    if(results.classList.contains('hidden')) return;
    const rect=search.getBoundingClientRect();
    results.style.left=rect.left+'px';
    results.style.top=(rect.bottom+4)+'px';
    results.style.width=rect.width+'px';
  }
  function showResults(){
    closeOtherResults();
    const value=(search.value||'').trim().toLowerCase();
    const products=productList();
    const matches=value?products.filter(p=>[p.product_name,p.part_number,p.brands?.name].some(v=>String(v||'').toLowerCase().includes(value))):products;
    results.innerHTML=matches.slice(0,12).map(p=>`<button type="button" class="product-result" data-product-id="${p.id}"><b>${esc(p.product_name||'')}</b><span>${esc(p.part_number||'')}${p.brands?.name?' · '+esc(p.brands.name):''}</span></button>`).join('');
    results.classList.remove('hidden');
    positionResults();
    if(matches.length){
      results.querySelectorAll('.product-result').forEach(btn=>btn.addEventListener('mousedown',e=>{e.preventDefault();const p=productList().find(x=>String(x.id)===String(btn.dataset.productId));chooseProduct(p)}));
    }else{
      results.innerHTML='<div class="product-no-result">No matching product</div>';
    }
  }
  search.addEventListener('focus',showResults);
  const onResize=()=>positionResults();
  const onScroll=()=>positionResults();
  window.addEventListener('resize',onResize);
  window.addEventListener('scroll',onScroll,true);
  search.addEventListener('input',()=>{
    if(sel.value){sel.value='';part.value='';}
    showResults();
    calcQuotation();
  });
  search.addEventListener('keydown',e=>{if(e.key==='Escape')results.classList.add('hidden');});
  search.addEventListener('change',()=>{
    const value=search.value.trim().toLowerCase();
    const p=productList().find(x=>productSearchText(x).toLowerCase()===value);
    if(p)chooseProduct(p);
  });
  clearBtn.onclick=()=>{closeOtherResults();clearProduct()};
  sel.onchange=()=>{const p=productList().find(x=>String(x.id)===String(sel.value));if(p)chooseProduct(p);else clearProduct()};
  tr.querySelectorAll('input:not(.item-product-search)').forEach(x=>x.oninput=calcQuotation);
  tr.querySelector('.remove-item').onclick=()=>{
    results.classList.add('hidden');
    results.innerHTML='';
    window.removeEventListener('resize',onResize);
    window.removeEventListener('scroll',onScroll,true);
    tr.remove();
    calcQuotation();
  };
}
function calcQuotation(){let sub=0,disc=0;$$('#qItems .item-row').forEach(r=>{const q=Number(r.querySelector('.item-qty').value)||0,p=Number(r.querySelector('.item-price').value)||0,d=Number(r.querySelector('.item-discount').value)||0;const total=Math.max(0,q*p-d);r.querySelector('.item-total').textContent=fmt(total);sub+=q*p;disc+=d});const other=Number($('#qOther')?.value)||0;const taxable=Math.max(0,sub-disc+other),vat=taxable*COMPANY.vat/100,grand=taxable+vat;$('#qSubtotal').textContent=fmt(sub);$('#qDiscount').textContent=fmt(disc);$('#qVat').textContent=fmt(vat);$('#qGrand').textContent=fmt(grand);return{sub,disc,other,vat,grand}}
$('#addQItem').onclick=()=>addItem('q');$('#qOther').oninput=calcQuotation;addItem('q');
function qItems(){return $$('#qItems .item-row').map(r=>{const o=r.querySelector('.item-product').selectedOptions[0];const q=Number(r.querySelector('.item-qty').value)||0,p=Number(r.querySelector('.item-price').value)||0,d=Number(r.querySelector('.item-discount').value)||0;return{product_id:o?.value?Number(o.value):null,product_name:o?.dataset.name||'',part_number:o?.dataset.part||null,brand_name:prodData.find(x=>String(x.id)===String(o?.value))?.brands?.name||null,quantity:q,unit_price:p,discount:d,line_total:Math.max(0,q*p-d)}})}
function customerName(id){const c=customerData.find(x=>String(x.id)===String(id));return c?.company_name||c?.contact_name||'—'}
async function quotations(){const {data,error}=await sb.from('quotations').select('*,customers(company_name,contact_name)').order('created_at',{ascending:false});if(error)return notice(error.message,true);quotationData=data||[];const t=$('#quotationTable');if(t)t.innerHTML=quotationData.map(q=>`<tr><td><b>${esc(q.quotation_number)}</b></td><td>${esc(q.customers?.company_name||q.customers?.contact_name||'')}</td><td>${esc(q.quotation_date)}</td><td>${fmt(q.grand_total)}</td><td><span class="status">${esc(q.status)}</span></td><td><button class="small" data-editq="${q.id}">Edit</button> <button class="small" data-printq="${q.id}">Print / PDF</button> <button class="small" data-invoiceq="${q.id}">Convert to Invoice</button> <button class="small danger" data-delq="${q.id}">Delete</button></td></tr>`).join('');$$('[data-editq]').forEach(b=>b.onclick=()=>startQuotationEdit(b.dataset.editq));$$('[data-printq]').forEach(b=>b.onclick=()=>printDocument('quotation',b.dataset.printq));$$('[data-invoiceq]').forEach(b=>b.onclick=()=>convertInvoice(b.dataset.invoiceq));$$('[data-delq]').forEach(b=>b.onclick=()=>deleteQuotation(b.dataset.delq))}
async function startQuotationEdit(id){
  const q=quotationData.find(x=>String(x.id)===String(id));
  if(!q)return notice('Quotation not found.',true);
  editingQuotationId=q.id;

  $('#qCustomer').value=String(q.customer_id);
  $('#qDate').value=q.quotation_date||'';
  $('#qValid').value=q.valid_until||'';
  $('#qOther').value=Number(q.other_charges||0);
  const notes=$('#quotationForm textarea[name="notes"]'); if(notes)notes.value=q.notes||'';

  const {data:items,error}=await sb.from('quotation_items').select('*').eq('quotation_id',q.id).order('id',{ascending:true});
  if(error){editingQuotationId=null;return notice(error.message,true);}
  $('#qItems').innerHTML='';
  (items&&items.length?items:[{}]).forEach(item=>addItem('q',item));
  refreshQuotationProductSelects();
  calcQuotation();

  const h=$('#quotationForm')?.closest('.box')?.querySelector('h2');
  if(h)h.textContent=`Edit Quotation — ${q.quotation_number}`;
  const submit=$('#quotationForm')?.querySelector('button[type="submit"]');
  if(submit)submit.textContent='Save Changes';

  let cancel=$('#cancelQuotationEdit');
  if(!cancel){
    cancel=document.createElement('button');
    cancel.type='button';
    cancel.id='cancelQuotationEdit';
    cancel.className='small';
    cancel.textContent='Cancel Edit';
    submit?.parentElement?.appendChild(cancel);
    cancel.onclick=cancelQuotationEdit;
  }
  cancel.classList.remove('hidden');

  document.getElementById('bill-quotations')?.scrollIntoView({behavior:'smooth',block:'start'});
}
function cancelQuotationEdit(){
  editingQuotationId=null;
  const f=$('#quotationForm'); if(!f)return;
  f.reset();
  $('#qDate').value=new Date().toISOString().slice(0,10);
  $('#qValid').value=new Date(Date.now()+COMPANY.validity*86400000).toISOString().slice(0,10);
  $('#qItems').innerHTML='';addItem('q');calcQuotation();
  const h=f.closest('.box')?.querySelector('h2'); if(h)h.textContent='Create Quotation';
  const submit=f.querySelector('button[type="submit"]'); if(submit)submit.textContent='Create Quotation';
  $('#cancelQuotationEdit')?.classList.add('hidden');
}
async function deleteQuotation(id){const q=quotationData.find(x=>String(x.id)===String(id));if(!q)return;if(!confirm(`Delete quotation ${q.quotation_number}? This will also delete its quotation items. Any invoice created from it will NOT be deleted.`))return;const ir=await sb.from('quotation_items').delete().eq('quotation_id',id);if(ir.error)return notice(ir.error.message,true);const {error}=await sb.from('quotations').delete().eq('id',id);if(error)return notice(error.message,true);if(String(editingQuotationId)===String(id))cancelQuotationEdit();notice(`Quotation ${q.quotation_number} deleted`);await quotations()}
$('#quotationForm').onsubmit=async e=>{
  e.preventDefault();
  const d=Object.fromEntries(new FormData(e.target)),items=qItems();
  if(!items.length||!items[0].product_name)return notice('Add at least one product.',true);
  const totals=calcQuotation();

  if(editingQuotationId){
    const existing=quotationData.find(x=>String(x.id)===String(editingQuotationId));
    if(!existing)return notice('Quotation not found.',true);

    const r=await sb.from('quotations').update({
      customer_id:Number(d.customer_id),
      quotation_date:d.quotation_date||existing.quotation_date,
      valid_until:d.valid_until||existing.valid_until,
      subtotal:totals.sub,
      discount:totals.disc,
      other_charges:totals.other,
      vat_rate:COMPANY.vat,
      vat_amount:totals.vat,
      grand_total:totals.grand,
      payment_type:COMPANY.payment,
      delivery_terms:COMPANY.delivery,
      notes:d.notes||null
    }).eq('id',editingQuotationId);
    if(r.error)return notice(r.error.message,true);

    const del=await sb.from('quotation_items').delete().eq('quotation_id',editingQuotationId);
    if(del.error)return notice(del.error.message,true);
    const ir=await sb.from('quotation_items').insert(items.map(x=>({...x,quotation_id:editingQuotationId})));
    if(ir.error)return notice(ir.error.message,true);

    notice(`Quotation ${existing.quotation_number} updated`);
    editingQuotationId=null;
    e.target.reset();
    $('#qDate').value=new Date().toISOString().slice(0,10);
    $('#qValid').value=new Date(Date.now()+COMPANY.validity*86400000).toISOString().slice(0,10);
    $('#qItems').innerHTML='';addItem('q');calcQuotation();
    const h=e.target.closest('.box')?.querySelector('h2'); if(h)h.textContent='Create Quotation';
    const submit=e.target.querySelector('button[type="submit"]'); if(submit)submit.textContent='Create Quotation';
    const cancel=$('#cancelQuotationEdit'); if(cancel)cancel.classList.add('hidden');
    await quotations();
    return;
  }

  const num=await sb.rpc('next_quotation_number');
  if(num.error)return notice(num.error.message,true);
  const r=await sb.from('quotations').insert([{
    quotation_number:num.data,customer_id:Number(d.customer_id),
    quotation_date:d.quotation_date||new Date().toISOString().slice(0,10),
    valid_until:d.valid_until,subtotal:totals.sub,discount:totals.disc,
    other_charges:totals.other,vat_rate:COMPANY.vat,vat_amount:totals.vat,
    grand_total:totals.grand,payment_type:COMPANY.payment,
    delivery_terms:COMPANY.delivery,notes:d.notes||null,
    created_by:(await sb.auth.getUser()).data.user?.id||null
  }]).select().single();
  if(r.error)return notice(r.error.message,true);
  const ir=await sb.from('quotation_items').insert(items.map(x=>({...x,quotation_id:r.data.id})));
  if(ir.error)return notice(ir.error.message,true);
  notice('Quotation created');e.target.reset();
  $('#qDate').value=new Date().toISOString().slice(0,10);
  $('#qValid').value=new Date(Date.now()+COMPANY.validity*86400000).toISOString().slice(0,10);
  $('#qItems').innerHTML='';addItem('q');calcQuotation();quotations()
};
async function convertInvoice(qid){const q=quotationData.find(x=>String(x.id)===String(qid));if(!q)return;const {data:items,error}=await sb.from('quotation_items').select('*').eq('quotation_id',qid);if(error)return notice(error.message,true);const num=await sb.rpc('next_invoice_number');if(num.error)return notice(num.error.message,true);const r=await sb.from('invoices').insert([{invoice_number:num.data,quotation_id:q.id,customer_id:q.customer_id,invoice_date:new Date().toISOString().slice(0,10),currency:'AED',subtotal:q.subtotal,discount:q.discount,other_charges:q.other_charges,vat_rate:q.vat_rate,vat_amount:q.vat_amount,grand_total:q.grand_total,payment_type:COMPANY.payment,delivery_terms:COMPANY.delivery,notes:q.notes,created_by:(await sb.auth.getUser()).data.user?.id||null}]).select().single();if(r.error)return notice(r.error.message,true);const ir=await sb.from('invoice_items').insert((items||[]).map(x=>({invoice_id:r.data.id,product_id:x.product_id,product_name:x.product_name,part_number:x.part_number,brand_name:x.brand_name,quantity:x.quantity,unit_price:x.unit_price,discount:x.discount,line_total:x.line_total})));if(ir.error)return notice(ir.error.message,true);await sb.from('quotations').update({status:'Accepted'}).eq('id',q.id);notice(`Invoice ${num.data} created`);invoices();quotations()}
async function invoices(){const {data,error}=await sb.from('invoices').select('*,customers(company_name,contact_name)').order('created_at',{ascending:false});if(error)return notice(error.message,true);invoiceData=data||[];const t=$('#invoiceTable');if(t)t.innerHTML=invoiceData.map(i=>`<tr><td><b>${esc(i.invoice_number)}</b></td><td>${esc(i.customers?.company_name||i.customers?.contact_name||'')}</td><td>${esc(i.invoice_date)}</td><td>${fmt(i.grand_total)}</td><td><span class="status">${esc(i.payment_status)}</span></td><td><button class="small" data-printi="${i.id}">Print / PDF</button> <button class="small danger" data-deli="${i.id}">Delete</button></td></tr>`).join('');$$('[data-printi]').forEach(b=>b.onclick=()=>printDocument('invoice',b.dataset.printi));$$('[data-deli]').forEach(b=>b.onclick=()=>deleteInvoice(b.dataset.deli))}
async function deleteInvoice(id){const i=invoiceData.find(x=>String(x.id)===String(id));if(!i)return;if(!confirm(`Delete invoice ${i.invoice_number}? This will also delete its invoice items.`))return;const {error}=await sb.from('invoices').delete().eq('id',id);if(error)return notice(error.message,true);notice(`Invoice ${i.invoice_number} deleted`);await invoices()}
async function printDocument(type,id){
  const data=type==='quotation'?quotationData.find(x=>String(x.id)===String(id)):invoiceData.find(x=>String(x.id)===String(id));
  if(!data)return;
  const table=type==='quotation'?'quotation_items':'invoice_items';
  const {data:items,error}=await sb.from(table).select('*').eq(type==='quotation'?'quotation_id':'invoice_id',id);
  if(error)return notice(error.message,true);
  const c=customerData.find(x=>String(x.id)===String(data.customer_id))||{};
  const rows=(items||[]).map(x=>`<tr><td>${esc(x.product_name)}</td><td>${esc(x.part_number||'')}</td><td>${x.quantity}</td><td>${fmt(x.unit_price)}</td><td>${fmt(x.line_total)}</td></tr>`).join('');
  const title=type==='quotation'?'QUOTATION':'INVOICE';
  const num=type==='quotation'?data.quotation_number:data.invoice_number;

  let logoSrc='';
  try{
    const r=await fetch('assets/images/oceancore-logo.png',{cache:'no-store'});
    if(r.ok){
      const blob=await r.blob();
      logoSrc=await new Promise(resolve=>{
        const fr=new FileReader();
        fr.onload=()=>resolve(fr.result);
        fr.onerror=()=>resolve('');
        fr.readAsDataURL(blob);
      });
    }
  }catch(e){console.warn('Logo could not be embedded',e)}

  const logoHtml=logoSrc
    ? `<img src="${logoSrc}" alt="OceanCore Marine Spare Parts" class="doc-logo">`
    : `<div class="logo-fallback">${esc(COMPANY.name)}</div>`;

  const html=`<!doctype html><html><head><meta charset="utf-8"><title>${title} ${num}</title>
  <style>
  @page{size:A4;margin:16mm}
  body{font-family:Arial,sans-serif;color:#142b3a;margin:0}
  .no-print{margin-bottom:20px}
  .top{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #0b4f68;padding-bottom:18px;gap:25px}
  .brand{display:flex;align-items:center;gap:16px;min-width:0}.doc-logo{max-width:190px;max-height:75px;object-fit:contain;display:block}.logo-fallback{font-size:20px;font-weight:bold;color:#0b4f68}
  h1{margin:0;color:#0b4f68;font-size:18px}h2{font-size:18px;margin:0 0 5px}
  .muted{color:#657784;font-size:12px;line-height:1.55}.grid{display:grid;grid-template-columns:1fr 1fr;gap:25px;margin:24px 0}
  .grid div{border:1px solid #dbe5ea;padding:14px;border-radius:8px}
  table{width:100%;border-collapse:collapse;margin-top:20px}th,td{border-bottom:1px solid #dbe5ea;padding:9px;text-align:left;font-size:12px}th{background:#eef5f8}
  .tot{margin-left:auto;width:300px;margin-top:18px}.tot div{display:flex;justify-content:space-between;padding:6px;border-bottom:1px solid #eee}.grand{font-size:17px;font-weight:bold}
  .foot{margin-top:35px;font-size:11px;color:#5f7079}.sig{margin-top:25px;border:1px dashed #9aaeb8;padding:16px;height:70px}
  button{padding:8px 12px}@media print{.no-print{display:none!important}.doc-logo{print-color-adjust:exact;-webkit-print-color-adjust:exact}}
  </style></head><body>
  <div class="no-print"><button onclick="window.print()">Print / Save as PDF</button></div>
  <div class="top"><div class="brand">${logoHtml}<div><h1>${esc(COMPANY.name)}</h1><div class="muted">${esc(COMPANY.address)}<br>${esc(COMPANY.phone)} · ${esc(COMPANY.email)}<br>${esc(COMPANY.website)}</div></div></div>
  <div style="text-align:right"><h2>${title}</h2><b>${esc(num)}</b><div class="muted">Date: ${esc(data.quotation_date||data.invoice_date)}${type==='quotation'?'<br>Valid Until: '+esc(data.valid_until):''}</div></div></div>
  <div class="grid"><div><b>Customer</b><br>${esc(c.company_name||'')}<br>${esc(c.contact_name||'')}<br>${esc(c.address||'')}<br>${esc(c.phone||'')}<br>${esc(c.email||'')}</div>
  <div><b>Terms</b><br>Currency: AED<br>VAT: 5%<br>Payment: ${esc(COMPANY.payment)}<br>Delivery: ${esc(COMPANY.delivery)}</div></div>
  <table><thead><tr><th>Product</th><th>Part No.</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead><tbody>${rows}</tbody></table>
  <div class="tot"><div><span>Subtotal</span><b>${fmt(data.subtotal)}</b></div><div><span>Discount</span><b>${fmt(data.discount)}</b></div><div><span>Other Charges</span><b>${fmt(data.other_charges)}</b></div><div><span>VAT (5%)</span><b>${fmt(data.vat_amount)}</b></div><div class="grand"><span>Grand Total</span><b>${fmt(data.grand_total)}</b></div></div>
  <div style="margin-top:25px"><b>Bank Details</b><div class="muted">${esc(COMPANY.bank)} · A/C Name: ${esc(COMPANY.accountName)} · A/C No: ${esc(COMPANY.accountNumber)}<br>IBAN: ${esc(COMPANY.iban)} · SWIFT: ${esc(COMPANY.swift)} · Currency: AED</div></div>
  <div class="sig"><b>Customer Acceptance / Signature</b><br><br>Customer Name: __________________________ &nbsp;&nbsp; Date: __________________</div>
  <div class="foot">This is a Computer Generated Document. No Signature Required.</div></body></html>`;
  const w=window.open('','_blank');
  if(!w)return notice('Please allow pop-ups to print the document.',true);
  w.document.open();w.document.write(html);w.document.close();
};
});
