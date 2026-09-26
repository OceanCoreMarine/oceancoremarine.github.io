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


Hero slideshow: six supplied yacht images are in assets/images and rotate automatically every 6 seconds.


## Brand logos feature
Run the following SQL once in the new Supabase project's SQL Editor before using brand image upload:

```sql
alter table public.brands add column if not exists logo_url text;
```

The existing `product-images` bucket and admin storage policies are reused for brand logos.
