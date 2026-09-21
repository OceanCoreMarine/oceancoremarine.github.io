-- OceanCore Admin Dashboard: exact database size helper
-- Run once in Supabase SQL Editor. It reports the total PostgreSQL
-- database size, including PostgreSQL/Supabase overhead, indexes, etc.
create or replace function public.get_database_size_bytes()
returns bigint
language sql
security definer
set search_path = public
as $$
  select pg_database_size(current_database());
$$;

revoke all on function public.get_database_size_bytes() from public;
grant execute on function public.get_database_size_bytes() to authenticated;
