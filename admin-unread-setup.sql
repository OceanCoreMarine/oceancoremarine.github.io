-- Run once before uploading the unread-count update.
alter table public.quote_requests add column if not exists admin_seen_at timestamptz;
alter table public.product_reviews add column if not exists admin_seen_at timestamptz;
create index if not exists quote_requests_unread_idx on public.quote_requests(admin_seen_at);
create index if not exists product_reviews_unread_idx on public.product_reviews(admin_seen_at,is_published);
-- Customers cannot mark their own new review as already read.
drop policy if exists "Customers submit pending reviews" on public.product_reviews;
create policy "Customers submit pending reviews" on public.product_reviews
 for insert to anon,authenticated with check(
  is_published=false and source='customer' and admin_seen_at is null
  and exists(select 1 from public.products where products.id=product_reviews.product_id and products.active=true)
 );
-- Read markers are updated through existing administrator-only UPDATE policies.
-- Reviews still require explicit approval to become public.
