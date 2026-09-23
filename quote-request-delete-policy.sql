-- Allow authorized OceanCore admins to permanently delete quote requests.
-- Existing quote requests are not modified by this policy.

alter table public.quote_requests enable row level security;

drop policy if exists "Admins delete quote requests" on public.quote_requests;

create policy "Admins delete quote requests"
on public.quote_requests
for delete
to authenticated
using (
  exists (
    select 1
    from public.admin_users a
    where a.user_id = auth.uid()
  )
);
