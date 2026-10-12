# OceanCore Marine Spare Parts — Supabase Admin Website

This package is connected to the OceanCore Supabase project using the **publishable** client key. Do not add a secret/service_role key to the website.

## GitHub Pages deployment
1. Extract this ZIP.
2. Upload the contents of `OceanCore-Final/` to the root of your GitHub repository.
3. Keep `index.html`, `products.html`, `admin.html` and the `assets/` folder at repository root.
4. GitHub Pages will publish the site.

## Admin
Open:
`https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/admin.html`

Sign in with the Supabase Auth user you already created and authorized in `admin_users`.

## Manage
- Products: add/edit/delete, image upload, category, brand, part number, description, featured/active.
- Categories: add/delete.
- Brands: add/delete.
- Quote Requests: view and mark Contacted.

Prices are intentionally omitted. Customers see Request a Quote.

## Supabase
The site expects these tables created in your Supabase project: `categories`, `brands`, `products`, `quote_requests`, and `admin_users`, plus the `product-images` storage bucket and the RLS policies already configured in the setup steps.

## Homepage updates
Run `homepage-features.sql` once in the Supabase SQL Editor. It adds a manual Top Selling flag, a customer review table, and notification status fields for quote requests. Mark products as Featured or Top Selling in the admin product form. Add genuine customer feedback to `customer_reviews` and set `is_published` to `true` when it is ready to display. Reviews can be added or managed by an authorized admin in the Supabase Table Editor.

The homepage has one Categories menu in the header. Hover over Categories to reveal ten category names at a time; scroll the list for the rest, and hover a category name to reveal its sub-categories. Choosing a sub-category opens the product catalogue filtered to that category and sub-category. The header search bar filters the active catalogue. Brand Spotlight cycles through active products with a brand and product image. Add accurate product photos, descriptions, brands, and part numbers in Admin to make those promotions useful.

## Quote notifications (email + WhatsApp)
The notification sender runs on Supabase Edge Functions; it cannot send either notification from a static GitHub Pages page by itself.

1. Deploy `supabase/functions/quote-notification` to the same Supabase project with the Supabase CLI. The included `supabase/config.toml` lets the function validate the public publishable key itself.
2. Add these function secrets in Supabase Dashboard → Edge Functions → Secrets: `RESEND_API_KEY`, `RESEND_FROM_EMAIL` (an address on a domain verified with Resend), `QUOTE_NOTIFICATION_EMAIL` (the inbox to notify), `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_MESSAGES_URL` (the Meta Graph API messages endpoint for your WhatsApp Business phone number), `WHATSAPP_RECIPIENT` (country code and number, digits only), and `WHATSAPP_TEMPLATE_NAME`. Optionally set `WHATSAPP_TEMPLATE_LANGUAGE` (defaults to `en_US`). Keep these secrets out of the website files.
3. Create and get approval for a WhatsApp utility template whose body has five text placeholders, in this order: quote request ID, customer name, product name, part number, customer phone or email. Set the matching template name and language in the function secrets.
4. Publish the website files. The quote form stores the request first and then invokes the function. Its notification status is saved as `sent`, `partial`, or `failed` in `quote_requests.notification_status`.

Email and WhatsApp each need their own verified provider setup and credentials before notifications can be delivered. The admin UI never contains provider secrets.


Hero slideshow: six supplied yacht images are in assets/images and rotate automatically every 6 seconds.


## Brand logos feature
Run the following SQL once in the new Supabase project's SQL Editor before using brand image upload:

```sql
alter table public.brands add column if not exists logo_url text;
```

The existing `product-images` bucket and admin storage policies are reused for brand logos.

## Category band and product details
All categories appear below the public header in four desktop rows. Hover, focus or tap a category to open its subcategories. Product images and names open product.html?id=PRODUCT_ID. Details use the existing product description and related items prioritize matching subcategory, category, then brand. Upload product.html along with index.html, products.html, assets/js/site.js and assets/css/style.css. No database migration is needed for these changes.

Featured Products now randomly rotates up to eight active catalogue products every ten seconds, pausing on hover or keyboard focus. Top Selling shows all active products explicitly marked Top Selling Item in Admin.
