-- Run once in the Supabase SQL Editor before uploading the pricing files.
-- Existing products keep NULL (Request price) until edited in Admin.
alter table public.products
  add column if not exists price numeric(12,2)
  constraint products_price_nonnegative check (price >= 0);
