-- OceanCore quote attachments, follow-up and part identification fields
-- Run once in Supabase SQL Editor before deploying this version.

alter table public.products
  add column if not exists oem_number text,
  add column if not exists model text;

alter table public.quote_requests
  add column if not exists attachment_path text,
  add column if not exists follow_up_at date;
alter table public.quote_requests enable row level security;

drop policy if exists "OceanCore admins update quote workflow" on public.quote_requests;
create policy "OceanCore admins update quote workflow" on public.quote_requests
for update to authenticated using (
  exists (select 1 from public.admin_users a where a.user_id = auth.uid())
) with check (
  exists (select 1 from public.admin_users a where a.user_id = auth.uid())
);

drop policy if exists "OceanCore admins read quote workflow" on public.quote_requests;
create policy "OceanCore admins read quote workflow" on public.quote_requests
for select to authenticated using (
  exists (select 1 from public.admin_users a where a.user_id = auth.uid())
);

-- Customer attachments can contain private information: keep this bucket private.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('quote-attachments', 'quote-attachments', false, 8388608,
        array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do update set
  public = false, file_size_limit = 8388608,
  allowed_mime_types = array['image/jpeg','image/png','image/webp','application/pdf'];

drop policy if exists "Public upload quote attachments" on storage.objects;
create policy "Public upload quote attachments" on storage.objects
for insert to anon, authenticated with check (
  bucket_id = 'quote-attachments'
  and (metadata->>'mimetype') in ('image/jpeg','image/png','image/webp','application/pdf')
);

drop policy if exists "OceanCore admins read quote attachments" on storage.objects;
create policy "OceanCore admins read quote attachments" on storage.objects
for select to authenticated using (
  bucket_id = 'quote-attachments'
  and exists (select 1 from public.admin_users a where a.user_id = auth.uid())
);

drop policy if exists "OceanCore admins delete quote attachments" on storage.objects;
create policy "OceanCore admins delete quote attachments" on storage.objects
for delete to authenticated using (
  bucket_id = 'quote-attachments'
  and exists (select 1 from public.admin_users a where a.user_id = auth.uid())
);

-- Keep the existing public INSERT policy for quote_requests submissions.
