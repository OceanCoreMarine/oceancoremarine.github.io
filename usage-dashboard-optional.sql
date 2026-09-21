-- Optional: enable exact database-size reporting in the OceanCore Admin Dashboard.
-- Run this once in the NEW Supabase SQL Editor.

create or replace function public.get_database_size()
returns bigint
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.admin_users where user_id = auth.uid()
  ) then
    raise exception 'Not authorized';
  end if;

  return pg_database_size(current_database());
end;
$$;

revoke all on function public.get_database_size() from public;
grant execute on function public.get_database_size() to authenticated;
