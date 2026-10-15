# OceanCore SEO update

## Publish this update

1. Keep a backup of the existing repository.
2. Upload the contents of this folder into the root of `oceancoremarine.github.io` on the `main` branch, including `.github/workflows/seo-pages.yml`, `scripts`, `products`, and the changed assets. Do not upload the outer folder itself.
3. In GitHub repository Settings → Pages → Build and deployment → Source, choose **GitHub Actions**.
4. In Actions, open **Refresh SEO catalogue and deploy Pages** and choose **Run workflow** if it has not already started. Confirm that it finishes successfully.
5. Check the homepage, product details, quote submission and reviews on the live site.

The ZIP already contains 524 prebuilt product pages. The workflow rebuilds pages from the public active Supabase catalogue on pushes to main, manually, and about every six hours. GitHub can delay scheduled runs. After adding, editing or deactivating products, run the workflow manually for a prompt SEO update. Static HTML/share previews can show the last build's data until the next successful deployment; interactive details fetch current data.

New products that do not yet have generated pages use the original dynamic detail link until the next build. Existing `product.html?id=...` links redirect to the generated equivalent once the catalogue loads. Product IDs remain stable in generated URLs.

No Supabase service-role key or GitHub secret is needed: the generator uses the site's existing public publishable key and reads only the active public product catalogue. It does not change database rows.

## Free Google setup after deployment

1. Open https://search.google.com/search-console/ and add the URL-prefix property `https://oceancoremarine.github.io/`.
2. Verify ownership using Google's HTML verification file or supplied meta tag. Only use the exact value supplied for your account.
3. Submit `https://oceancoremarine.github.io/sitemap.xml`.
4. Use URL Inspection for the homepage and a few priority product URLs from `catalogue.html`, then request indexing where appropriate.
5. Test representative product URLs at https://search.google.com/test/rich-results . Products without a price may not qualify for product rich results; do not invent a price or reviews to remove warnings.
6. Monitor indexing and search queries in Search Console. Indexing, position, and rich results are not guaranteed.

## Facebook and Instagram

The website now provides static Open Graph titles, descriptions and images for generated product pages. Share the `products/ID.html` link for the relevant product. If Facebook retains an old preview, use https://developers.facebook.com/tools/debug/ and request another scrape.

This ZIP does not edit Facebook/Instagram profiles or publish posts. On each public business profile, keep the business name/contact details consistent, link to the website, and publish useful product posts with the real product name, brand and part number. Website changes alone do not guarantee discovery in either app's internal search.

Merchant Center free listings require a separate eligibility and policy check, including the supported target country, purchase/quotation flow, pricing and business policies. No feed or account has been submitted in this update.

## Included changes

- Home and catalogue descriptions, canonical URLs, social previews, and homepage Organization data with existing contact/social details.
- 524 HTML product pages with visible product details, unique metadata and Product JSON-LD. Offers are included only for positive published prices; stock, ratings, shipping and business location are not guessed.
- Complete crawlable `catalogue.html`, linked from the home and products pages.
- XML sitemap and robots.txt. Administrative/import utility pages use noindex; robots.txt does not block them from reading that tag. Authentication remains essential: noindex is not access control.
- Existing WebP images used for homepage hero backgrounds.
- Original layout, billing documents, quotation flow, reviews, related items and Top Selling presentation retained.

## Manual rebuild

Run `python3 scripts/build_seo.py` from a machine with Python 3 and access to the public Supabase endpoint. No additional Python packages are required.
