"""Static category, brand and subcategory navigation for the existing catalogue."""
import html
import json
import math
import re
from pathlib import Path
from urllib.parse import quote, urlencode

PAGE_SIZE = 24
KINDS = {'categories': ('category_id', 'categories', 'Categories'),
         'subcategories': ('subcategory_id', 'subcategories', 'Subcategories'),
         'brands': ('brand_id', 'brands', 'Brands')}

def esc(value):
    return html.escape(str(value if value is not None else ''), quote=True)

def ld(data):
    return '<script type="application/ld+json">' + json.dumps(data, ensure_ascii=False).replace('<', '\\u003c') + '</script>'

def groups_from(products):
    groups = {kind: {} for kind in KINDS}
    for product in products:
        for kind, (field, relation, _) in KINDS.items():
            info = product.get(relation) or {}
            key = product.get(field)
            if key is None or not info.get('name'):
                continue
            group = groups[kind].setdefault(str(key), {'id': str(key), 'name': info['name'].strip(),
                'logo': info.get('logo_url'), 'parent': str(product.get('category_id') or ''), 'products': []})
            group['products'].append(product)
    return groups

def route_maps(groups):
    return {kind: {key: f'{kind}/{quote(key, safe="")}.html' for key in values}
            for kind, values in groups.items()}

def strip_html(groups, maps):
    items = []
    for key, group in sorted(groups['categories'].items(), key=lambda pair: pair[1]['name'].casefold()):
        items.append(f'<a class="discovery-strip-link" href="{esc(maps["categories"][key])}">{esc(group["name"])}</a>')
    return '<div class="container category-strip-grid" id="categoryStrip">' + ''.join(items) + '</div>'

def fill_strip(page, strip):
    return re.sub(r'<div class="container category-strip-grid" id="categoryStrip">.*?</nav>',
                  lambda _: strip + '</nav>', page, count=1, flags=re.S)

def nav_section():
    return ('<section class="section alt discovery-entry" id="catalogueDiscovery"><div class="container">'
            '<div class="section-head"><div><div class="eyebrow">EXPLORE THE CATALOGUE</div>'
            '<h2>Find marine parts by category or brand</h2></div></div>'
            '<div class="discovery-actions"><a class="btn btn-primary" href="categories.html">Shop by Category</a>'
            '<a class="btn btn-primary" href="brands.html">Shop by Brand</a></div></div></section>')

def patch_entry_pages(root, strip):
    for filename in ['index.html', 'products.html']:
        path = root / filename
        page = fill_strip(path.read_text(encoding='utf-8'), strip)
        page = re.sub(r'<section[^>]*id="catalogueDiscovery"[^>]*>.*?</section>', '', page, flags=re.S)
        if filename == 'index.html':
            marker = '<section class="section" id="about">'
            if marker not in page:
                raise ValueError('Homepage About marker missing; refusing to place catalogue navigation incorrectly')
            page = page.replace(marker, nav_section() + '\n' + marker, 1)
        else:
            page = page.replace('<footer class="footer">', nav_section() + '<footer class="footer">', 1)
        path.write_text(page, encoding='utf-8')

def price(product):
    raw = product.get('price')
    try:
        number = float(raw)
        if raw is not None and math.isfinite(number) and number >= 0:
            return f'AED {number:,.2f} / unit, excl. VAT'
    except (ValueError, TypeError):
        pass
    return 'Request price'

def product_card(product, product_routes):
    href = product_routes[str(product['id'])]
    name = product['product_name']
    image = ('<img src="' + esc(product['image_url']) + '" alt="' + esc(name) + '" loading="lazy">'
             if product.get('image_url') else '<span>No image available</span>')
    brand = (product.get('brands') or {}).get('name', '')
    part = product.get('part_number') or ''
    return (f'<article class="product"><a class="visual product-link" href="{esc(href)}">{image}</a>'
            f'<div class="body"><h2 class="discovery-product-name"><a href="{esc(href)}">{esc(name)}</a></h2>'
            f'<p class="product-detail">{esc(brand)}</p>'
            + (f'<p class="product-detail"><b>Part No:</b> {esc(part)}</p>' if part else '')
            + f'<p class="product-price">{esc(price(product))}</p>'
            f'<a class="btn btn-primary" href="{esc(href)}">View product</a></div></article>')

def render_page(template, base, route, title, description, body, schema=None):
    page = template
    page = re.sub(r'<main>.*?</main>', lambda _: '<main>' + body + '</main>', page, count=1, flags=re.S)
    page = re.sub(r'<title>.*?</title>', lambda _: '<title>' + esc(title) + '</title>', page, count=1, flags=re.S)
    # Product template contains no product metadata; each generated document gets its own metadata.
    image = base + 'assets/images/oceancore-logo.png'
    url = base + route
    metadata = (f'<meta name="description" content="{esc(description)}"><link rel="canonical" href="{esc(url)}">'
                f'<meta property="og:type" content="website"><meta property="og:site_name" content="OceanCore Marine Spare Parts">'
                f'<meta property="og:title" content="{esc(title)}"><meta property="og:description" content="{esc(description)}">'
                f'<meta property="og:url" content="{esc(url)}"><meta property="og:image" content="{esc(image)}">'
                '<meta name="twitter:card" content="summary_large_image">')
    if '/' in route:
        page = page.replace('<head>', '<head><base href="../">', 1)
    page = page.replace('</head>', metadata + (ld(schema) if schema else '') + '</head>', 1)
    page = re.sub(r'<script src="assets/js/product-reviews.js"></script>', '', page)
    return page

def build(root, base, products, product_routes, template, groups, maps):
    """Return extra sitemap URLs. All discovery documents are rebuilt every deployment."""
    urls = []
    for kind in KINDS:
        directory = root / kind
        directory.mkdir(exist_ok=True)
        for old in directory.glob('*.html'):
            old.unlink()

    def write(route, title, description, body, schema=None):
        (root / route).write_text(render_page(template, base, route, title, description, body, schema), encoding='utf-8')
        urls.append(base + route)

    def breadcrumbs(items):
        bits = []
        for index, (name, href) in enumerate(items):
            bits.append('<li>' + (f'<a href="{esc(href)}">{esc(name)}</a>' if href else
                                  f'<span aria-current="page">{esc(name)}</span>') + '</li>')
        return '<nav class="product-breadcrumbs" aria-label="Breadcrumb"><ol>' + ''.join(bits) + '</ol></nav>'

    def group_link(kind, group):
        logo = (f'<img src="{esc(group["logo"])}" alt="{esc(group["name"])} logo" loading="lazy">'
                if kind == 'brands' and group.get('logo') else '')
        return (f'<a class="discovery-group-card" href="{esc(maps[kind][group["id"]])}">{logo}'
                f'<strong>{esc(group["name"])}</strong><span>{len(group["products"])} products →</span></a>')

    for kind in ['categories', 'brands']:
        label = KINDS[kind][2]
        cards = ''.join(group_link(kind, group) for group in sorted(groups[kind].values(), key=lambda g: g['name'].casefold()))
        body = '<section class="section"><div class="container">' + breadcrumbs([('Home', 'index.html'), (label, None)])
        body += f'<h1>Marine Parts {label}</h1><p>Browse {label.lower()} with products currently listed in the OceanCore catalogue.</p>'
        body += '<div class="discovery-group-grid">' + cards + '</div></div></section>'
        write(kind + '.html', f'Marine Parts {label} | OceanCore', f'Browse OceanCore marine parts by {label.lower()}. View product details, part numbers and quotation options.', body)

    for kind, values in groups.items():
        field, relation, label = KINDS[kind]
        for key, group in values.items():
            items = sorted(group['products'], key=lambda p: (p['product_name'].casefold(), str(p['id'])))
            count = math.ceil(len(items) / PAGE_SIZE)
            for page_number in range(1, count + 1):
                route = maps[kind][key] if page_number == 1 else maps[kind][key].replace('.html', f'-page-{page_number}.html')
                suffix = '' if page_number == 1 else f' — Page {page_number}'
                crumb = [('Home', 'index.html'), (label, kind + '.html')] if kind != 'subcategories' else [('Home', 'index.html'), ('Categories', 'categories.html')]
                parent = groups['categories'].get(group['parent'])
                if kind == 'subcategories' and parent:
                    crumb.append((parent['name'], maps['categories'][parent['id']]))
                crumb.append((group['name'] + suffix, None))
                body = '<section class="section"><div class="container">' + breadcrumbs(crumb)
                logo = (f'<img class="discovery-heading-logo" src="{esc(group["logo"])}" alt="{esc(group["name"])} logo">'
                        if kind == 'brands' and group.get('logo') else '')
                body += f'<div class="discovery-heading"><h1>{esc(group["name"])}{esc(suffix)}</h1>{logo}</div>'
                body += f'<p>{len(items)} products listed. View specifications, part numbers and quotation options below.</p>'
                filter_query = {'brand' if kind == 'brands' else 'category': key if kind != 'subcategories' else group['parent']}
                if kind == 'subcategories':
                    filter_query['subcategory'] = key
                body += f'<p><a class="detail-back" href="products.html?{esc(urlencode(filter_query))}">Search and filter these products →</a></p>'
                if kind == 'categories':
                    children = [g for g in groups['subcategories'].values() if g['parent'] == key]
                    if children:
                        body += '<nav class="discovery-subcategories" aria-label="Subcategories">' + ''.join(
                            f'<a href="{esc(maps["subcategories"][g["id"]])}">{esc(g["name"])}</a>' for g in sorted(children, key=lambda g: g['name'].casefold())) + '</nav>'
                batch = items[(page_number-1)*PAGE_SIZE:page_number*PAGE_SIZE]
                body += '<div class="products discovery-products">' + ''.join(product_card(p, product_routes) for p in batch) + '</div>'
                if count > 1:
                    nav = []
                    for number in range(1, count+1):
                        dest = maps[kind][key] if number == 1 else maps[kind][key].replace('.html', f'-page-{number}.html')
                        nav.append(f'<a href="{esc(dest)}"' + (' aria-current="page"' if number == page_number else '') + f'>{number}</a>')
                    body += '<nav class="discovery-pagination" aria-label="Product pages">' + ''.join(nav) + '</nav>'
                body += '</div></section>'
                schema = {'@context': 'https://schema.org', '@type': 'CollectionPage', 'name': group['name'] + suffix,
                          'url': base + route, 'mainEntity': {'@type': 'ItemList', 'itemListElement': [
                              {'@type': 'ListItem', 'position': i + (page_number-1)*PAGE_SIZE + 1, 'url': base + product_routes[str(p['id'])], 'name': p['product_name']}
                              for i, p in enumerate(batch)]}}
                write(route, group['name'] + suffix + ' | OceanCore Marine Parts',
                      f'Browse {group["name"]} at OceanCore. Product specifications, part numbers, listed AED prices and quotation requests.' + (f' Page {page_number}.' if page_number > 1 else ''), body, schema)
    strip = strip_html(groups, maps)
    patch_entry_pages(root, strip)
    return urls
