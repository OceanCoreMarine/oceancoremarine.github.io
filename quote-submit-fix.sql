-- Run once in the SAME Supabase project used by the website.
-- Public callers may submit a quote, but cannot list/read other customers' requests.
begin;
create or replace function public.submit_quote_request(p_request jsonb)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
 v_name text := btrim(p_request->>'customer_name');
 v_email text := btrim(p_request->>'email');
 v_quantity_text text := coalesce(nullif(btrim(p_request->>'quantity'),''),'1');
 v_quantity integer;
 v_id text;
begin
 if jsonb_typeof(p_request) is distinct from 'object' then
  raise exception 'Invalid quotation form' using errcode='22023';
 end if;
 if v_name is null or char_length(v_name) not between 1 and 100 then
  raise exception 'Please enter your name (maximum 100 characters)' using errcode='22023';
 end if;
 if v_email is null or char_length(v_email)>320 or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' then
  raise exception 'Please enter a valid email address' using errcode='22023';
 end if;
 if v_quantity_text !~ '^[0-9]{1,7}$' then
  raise exception 'Quantity must be a positive whole number' using errcode='22023';
 end if;
 v_quantity := v_quantity_text::integer;
 if v_quantity<1 or v_quantity>1000000 then
  raise exception 'Quantity must be between 1 and 1000000' using errcode='22023';
 end if;
 if char_length(coalesce(p_request->>'company_name',''))>160
  or char_length(coalesce(p_request->>'phone',''))>80
  or char_length(coalesce(p_request->>'product_name',''))>500
  or char_length(coalesce(p_request->>'part_number',''))>160
  or char_length(coalesce(p_request->>'message',''))>4000 then
  raise exception 'One or more form fields are too long' using errcode='22023';
 end if;
 insert into public.quote_requests(
  customer_name,company_name,email,phone,product_name,part_number,quantity,message,notification_status
 ) values (
  v_name,nullif(btrim(p_request->>'company_name'),''),v_email,
  nullif(btrim(p_request->>'phone'),''),nullif(btrim(p_request->>'product_name'),''),
  nullif(btrim(p_request->>'part_number'),''),v_quantity,nullif(btrim(p_request->>'message'),''),'pending'
 ) returning id::text into v_id;
 return v_id;
end;
$$;
revoke all on function public.submit_quote_request(jsonb) from public;
grant execute on function public.submit_quote_request(jsonb) to anon, authenticated;
commit;
-- Existing quote_requests policies and RLS stay enabled and unchanged.
