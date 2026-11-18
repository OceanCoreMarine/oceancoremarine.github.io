"""Read only public content/details. No staff inventory, costs or customer data."""
import html,json,re,urllib.error,urllib.request
from urllib.parse import urlencode,urlsplit

def esc(v):return html.escape(str(v if v is not None else ''),quote=True)
def safe_url(value):
    if not value:return ''
    u=urlsplit(str(value))
    return str(value) if u.scheme=='https' and u.netloc and not u.username and not u.password else ''
def load(api,key):
    def fetch(table,select,order):
        out=[]
        for offset in range(0,100000,500):
            req=urllib.request.Request(api+'/rest/v1/'+table+'?'+urlencode({'select':select,'order':order,'limit':500,'offset':offset}),headers={'apikey':key})
            try:
                with urllib.request.urlopen(req,timeout=20) as r:rows=json.load(r)
            except (urllib.error.URLError,TimeoutError) as e:
                print('Smart content unavailable for this build; existing catalogue remains available ('+table+').')
                return []
            out.extend(rows)
            if len(rows)<500:return out
        raise RuntimeError('Smart detail catalogue exceeds build limit')
    content=fetch('site_content','key,content','key.asc')
    details=fetch('product_details','*','product_id.asc')
    return next((r['content'] for r in content if r['key']=='website'),{}),{str(r['product_id']):r for r in details}

def enrich_product(body,p,d):
    details='<div class="smart-product-extra"><p class="smart-stock">'+esc(d.get('stock_status') or 'Request availability')
    if d.get('lead_time_days') is not None:details+=' · Lead time: '+esc(d['lead_time_days'])+' days'
    details+='</p>'
    specs=d.get('specifications') or {}
    if isinstance(specs,dict) and specs:
        details+='<h2>Specifications</h2><table class="smart-spec-table"><tbody>'+''.join('<tr><th>'+esc(k)+'</th><td>'+esc(v)+'</td></tr>' for k,v in specs.items())+'</tbody></table>'
    pdf=safe_url(d.get('datasheet_url'))
    if pdf:details+='<p><a href="'+esc(pdf)+'" target="_blank" rel="noopener">Download datasheet (PDF)</a></p>'
    details+='</div>'
    at=body.rfind('</div>');body=body[:at]+details+body[at:]
    gallery=d.get('gallery') if isinstance(d.get('gallery'),list) else []
    images=list(dict.fromkeys(filter(None,[safe_url(p.get('image_url'))]+[safe_url(u) for u in gallery])))
    if len(images)>1:
        thumbs='<div class="smart-gallery-thumbs">'+''.join('<a href="'+esc(u)+'" target="_blank" rel="noopener"><img src="'+esc(u)+'" alt="'+esc(p['product_name'])+' — image '+str(i+1)+'" loading="lazy"></a>' for i,u in enumerate(images))+'</div>'
        body=re.sub(r'(<div class="detail-image">.*?)(</div>)',lambda m:m[1].replace('class="detail-image"','class="detail-image smart-gallery"')+thumbs+m[2],body,count=1,flags=re.S)
    return body

def apply_contact(page,c):
    phone=str(c.get('phone') or '')
    if re.fullmatch(r'\+?[0-9]{7,15}',phone):
        page=page.replace('https://wa.me/971564502513','https://wa.me/'+phone.lstrip('+')).replace('+971564502513',esc(phone))
    email=str(c.get('email') or '')
    if re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+',email):page=page.replace('marineoceancore@gmail.com',esc(email))
    for key,old in [('facebook','https://www.facebook.com/oceancoremarine'),('instagram','https://www.instagram.com/oceancoremarine/')]:
        new=safe_url(c.get(key))
        if new:page=page.replace(old,esc(new))
    return page

def apply_home(root,c,routes):
    path=root/'index.html';page=apply_contact(path.read_text(),c)
    if c.get('hero_title'):page=re.sub(r'(<h1>).*?(</h1>)',lambda m:m[1]+esc(c['hero_title'])+m[2],page,count=1,flags=re.S)
    page=re.sub(r'<p id="smartHeroText">.*?</p>','',page,flags=re.S)
    if c.get('hero_text'):page=page.replace('</h1>','</h1><p id="smartHeroText">'+esc(c['hero_text'])+'</p>',1)
    if c.get('about_text'):
        page=re.sub(r'(<section[^>]*id="about"[^>]*>.*?<p[^>]*>).*?(</p>)',lambda m:m[1]+esc(c['about_text'])+m[2],page,count=1,flags=re.S)
    image=safe_url(c.get('hero_image'))
    if image:page=re.sub(r"(<div class=\"hero-slide active\" style=\")background-image:.*?(\"></div>)",lambda m:m[1]+"background-image:url('"+esc(image).replace("'",'%27')+"')"+m[2],page,count=1)
    page=re.sub(r'<section id="smartAnnouncement".*?</section>','',page,flags=re.S)
    if c.get('banner_enabled') and c.get('banner_title'):
        route=routes.get(str(c.get('banner_product_id')))
        banner='<section id="smartAnnouncement" class="smart-announcement"><div class="container"><strong>'+esc(c['banner_title'])+'</strong>'
        if c.get('banner_text'):banner+='<p>'+esc(c['banner_text'])+'</p>'
        if route:banner+='<a class="btn btn-primary" href="'+esc(route)+'">View product</a>'
        banner+='</div></section>'
        page=page.replace('<section class="hero',banner+'<section class="hero',1)
    path.write_text(page)
