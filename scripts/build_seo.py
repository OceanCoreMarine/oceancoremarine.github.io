"""Build public product HTML and sitemap using the existing public catalogue only."""
import json, re, urllib.request, html, datetime
from pathlib import Path
from urllib.parse import urlencode
ROOT = Path(__file__).resolve().parents[1]
BASE = 'https://oceancoremarine.github.io/'
config = (ROOT/'assets/js/supabase-client.js').read_text()
API = re.search(r"OCEANCORE_SUPABASE_URL = '([^']+)'", config)[1]
KEY = re.search(r"OCEANCORE_SUPABASE_PUBLISHABLE_KEY = '([^']+)'", config)[1]
def fetch():
    rows=[]
    for offset in range(0,1000000,500):
        query=urlencode({'select':'*,categories(name),brands(name),subcategories(name)','active':'eq.true','order':'id.asc','offset':offset,'limit':500})
        req=urllib.request.Request(API+'/rest/v1/products?'+query,headers={'apikey':KEY})
        with urllib.request.urlopen(req,timeout=60) as response: batch=json.load(response)
        rows.extend(batch)
        if len(batch)<500: return rows
    raise RuntimeError('Catalogue exceeds build limit')
def esc(s): return html.escape(str(s or ''),quote=True)
def ld(data): return '<script type="application/ld+json">'+json.dumps(data,ensure_ascii=False).replace('<','\\u003c')+'</script>'
def metadata(title,description,url,image):
    return f'''<meta name="description" content="{esc(description)}"><link rel="canonical" href="{esc(url)}">
<meta property="og:type" content="website"><meta property="og:site_name" content="OceanCore Marine Spare Parts"><meta property="og:title" content="{esc(title)}"><meta property="og:description" content="{esc(description)}"><meta property="og:url" content="{esc(url)}"><meta property="og:image" content="{esc(image)}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="{esc(title)}"><meta name="twitter:description" content="{esc(description)}"><meta name="twitter:image" content="{esc(image)}">'''
products=fetch()
if not products: raise RuntimeError('Empty catalogue: refusing to replace generated pages')
# Fetch succeeds before any generated files are removed.
out=ROOT/'products';out.mkdir(exist_ok=True)
for old in out.glob('*.html'): old.unlink()
template=(ROOT/'product.html').read_text()
routes={str(p['id']):'products/'+str(p['id'])+'.html' for p in products}
(ROOT/'assets/js/seo-routes.js').write_text('window.ocProductRoutes='+json.dumps(routes)+';\n')
urls=[BASE,BASE+'products.html',BASE+'catalogue.html']
for p in products:
    pid=str(p['id']);name=p['product_name'];url=BASE+routes[pid]
    desc=p.get('detailed_description') or p.get('description') or p.get('short_description') or 'Contact OceanCore for specifications and compatibility details.'
    summary=' '.join(desc.split())[:160]
    image=p.get('image_url') or BASE+'assets/images/oceancore-logo.png'
    title=name+' | OceanCore Marine Spare Parts'
    brand=(p.get('brands') or {}).get('name','')
    schema={'@context':'https://schema.org','@type':'Product','name':name,'description':desc,'image':[image],'url':url}
    if brand: schema['brand']={'@type':'Brand','name':brand}
    if p.get('part_number'): schema['mpn']=str(p['part_number']).strip()
    schema['sku']=pid
    # No invented stock, ratings, shipping, or prices.
    if p.get('price') is not None and float(p['price'])>0:
        schema['offers']={'@type':'Offer','url':url,'price':float(p['price']),'priceCurrency':'AED','seller':{'@type':'Organization','name':'OceanCore Marine Spare Parts'}}
    price='Request price' if p.get('price') is None else 'AED {:,.2f} / unit, excl. VAT'.format(float(p['price']))
    quote=BASE+'index.html?'+urlencode({'product':name,'part':p.get('part_number') or ''})+'#quote'
    body=f'<div class="detail-image"><img src="{esc(image)}" alt="{esc(name)}"></div><div class="detail-copy"><a class="detail-back" href="products.html">← Back to catalogue</a><h1>{esc(name)}</h1><p class="product-price detail-price">{esc(price)}</p><dl><dt>Brand</dt><dd>{esc(brand or "Not specified")}</dd><dt>Part number</dt><dd>{esc(p.get("part_number") or "Not specified")}</dd><dt>Category</dt><dd>{esc((p.get("categories") or {}).get("name"))}</dd></dl><h2>Product details</h2><p class="detail-description" style="white-space:pre-line">{esc(desc)}</p><a class="btn btn-primary" href="{esc(quote)}">Request a Quote</a></div>'
    page=template.replace('<head>','<head><base href="../">',1)
    page=re.sub(r'<title>.*?</title>','<title>'+esc(title)+'</title>',page,count=1)
    page=page.replace('</head>',metadata(title,summary,url,image)+ld(schema)+'</head>',1)
    page=page.replace('<body>','<body data-product-id="'+esc(pid)+'">',1)
    page=page.replace('<div class="empty">Loading product details...</div>',body,1)
    (ROOT/routes[pid]).write_text(page)
    urls.append(url)
# Complete crawlable catalogue, also usable without JavaScript.
links=''.join('<li><a href="'+esc(routes[str(p['id'])])+'">'+esc(p['product_name'])+'</a>'+(' — '+esc(p['part_number']) if p.get('part_number') else '')+'</li>' for p in products)
cat='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Marine Parts Catalogue | OceanCore</title>'+metadata('Marine Parts Catalogue | OceanCore','Browse OceanCore marine spare parts by product name and part number.',BASE+'catalogue.html',BASE+'assets/images/oceancore-logo.png')+'<link rel="stylesheet" href="assets/css/style.css"></head><body><main class="container section"><a href="index.html">OceanCore Home</a><h1>Marine Parts Catalogue</h1><p><a href="products.html">Browse with filters and images</a></p><ul>'+links+'</ul></main></body></html>'
(ROOT/'catalogue.html').write_text(cat)
(ROOT/'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+''.join('<url><loc>'+esc(u)+'</loc></url>' for u in urls)+'</urlset>')
print(f'Built {len(products)} product pages; {len(urls)} sitemap URLs.')
