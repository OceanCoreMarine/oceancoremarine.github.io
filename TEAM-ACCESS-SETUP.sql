-- Run in Supabase SQL Editor after the existing SMART-SETUP.sql.
-- Additive migration. Run this file again safely; do not rerun the older setup afterwards.
begin;
alter table public.admin_users add column if not exists permissions jsonb not null default '[]'::jsonb;
alter table public.admin_users add column if not exists enabled boolean not null default true;
alter table public.admin_users drop constraint if exists oc_team_role_check;
alter table public.admin_users add constraint oc_team_role_check check(role in ('admin','sales','product_editor','custom'));
create or replace function public.oc_permission_keys() returns jsonb language sql immutable set search_path='' as $$
 select '["products","categories","brands","reviews","enquiries","billing","gallery","inventory","bulk_edit","content","reports"]'::jsonb;
$$;
create or replace function public.oc_role_permissions(p_role text,p_permissions jsonb) returns jsonb language sql immutable set search_path='' as $$
 select case p_role when 'admin' then public.oc_permission_keys() when 'sales' then '["enquiries","billing","reports"]'::jsonb when 'product_editor' then '["products","categories","brands","reviews","gallery","inventory","bulk_edit"]'::jsonb when 'custom' then p_permissions else '[]'::jsonb end;
$$;
create or replace function public.oc_has_role(p_roles text[]) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.admin_users where user_id=auth.uid() and enabled and role=any(p_roles));
$$;
create or replace function public.oc_can(p_permission text) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.admin_users where user_id=auth.uid() and enabled and public.oc_role_permissions(role,permissions) ? p_permission);
$$;
create or replace function public.oc_my_role() returns text language sql stable security definer set search_path='' as $$
 select role from public.admin_users where user_id=auth.uid() and enabled;
$$;
create or replace function public.oc_my_access() returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('user_id',user_id,'role',role,'permissions',public.oc_role_permissions(role,permissions),'enabled',enabled) from public.admin_users where user_id=auth.uid() and enabled;
$$;
create or replace function public.oc_set_staff_access(p_user_id uuid,p_permissions jsonb,p_full_admin boolean default false,p_enabled boolean default true) returns void language plpgsql security definer set search_path='' as $$
begin
 -- Serialize team changes, including last-owner protection.
 perform pg_advisory_xact_lock(807328491);
 if not public.oc_has_role(array['admin']) then raise exception 'Administrator access required' using errcode='42501';end if;
 if p_full_admin is null or p_enabled is null or jsonb_typeof(p_permissions) is distinct from 'array' then raise exception 'Invalid permissions';end if;
 if jsonb_array_length(p_permissions)>11 or exists(select 1 from jsonb_array_elements(p_permissions) v where jsonb_typeof(v)<>'string' or not(public.oc_permission_keys() @> jsonb_build_array(v))) then raise exception 'Unknown permission';end if;
 if not exists(select 1 from auth.users where id=p_user_id) then raise exception 'Auth account not found';end if;
 if exists(select 1 from public.admin_users where user_id=p_user_id and role='admin' and enabled) and (not p_full_admin or not p_enabled) and (select count(*) from public.admin_users where role='admin' and enabled)<=1 then raise exception 'At least one enabled administrator must remain';end if;
 insert into public.admin_users(user_id,role,permissions,enabled) values(p_user_id,case when p_full_admin then 'admin' else 'custom' end,p_permissions,p_enabled)
 on conflict(user_id) do update set role=excluded.role,permissions=excluded.permissions,enabled=excluded.enabled;
 insert into public.smart_audit(entity,record_id,action,details,created_by) values('team',p_user_id::text,'access_changed',jsonb_build_object('permissions',p_permissions,'full_admin',p_full_admin,'enabled',p_enabled),auth.uid());
end $$;
-- Compatibility with the old role API, with the same lock and enabled-owner protection.
create or replace function public.oc_set_team_member(p_user_id uuid,p_role text) returns void language plpgsql security definer set search_path='' as $$
begin
 if p_role not in ('admin','sales','product_editor') then raise exception 'Invalid role';end if;
 perform public.oc_set_staff_access(p_user_id,public.oc_role_permissions(p_role,'[]'),p_role='admin',true);
end $$;
create or replace function public.oc_team_members() returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if not public.oc_has_role(array['admin']) then raise exception 'Administrator access required' using errcode='42501';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('user_id',a.user_id,'email',u.email,'role',a.role,'permissions',public.oc_role_permissions(a.role,a.permissions),'enabled',a.enabled) order by u.email) from public.admin_users a join auth.users u on u.id=a.user_id),'[]');
end $$;
revoke all on function public.oc_can(text),public.oc_my_access(),public.oc_permission_keys(),public.oc_role_permissions(text,jsonb),public.oc_set_staff_access(uuid,jsonb,boolean,boolean) from public,anon;
grant execute on function public.oc_can(text),public.oc_my_access(),public.oc_permission_keys(),public.oc_role_permissions(text,jsonb),public.oc_set_staff_access(uuid,jsonb,boolean,boolean) to authenticated;
-- Replace the guards in existing, tested transactional business RPCs.
do $$declare r record; d text; replacement text; old_guard text; begin
 for r in select p.oid,p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('oc_billing_admin','oc_save_quotation','oc_enquiry_to_quotation','oc_save_inventory','oc_bulk_update_products') loop
 d:=pg_get_functiondef(r.oid);
 if r.proname in ('oc_billing_admin','oc_save_quotation') then replacement:='public.oc_can(''billing'')';old_guard:='public.oc_has_role(array[''admin'',''sales''])';
 elsif r.proname='oc_enquiry_to_quotation' then replacement:='(public.oc_can(''enquiries'') and public.oc_can(''billing''))';old_guard:='public.oc_has_role(array[''admin'',''sales''])';
 else replacement:=format('public.oc_can(%L)',case when r.proname='oc_save_inventory' then 'inventory' else 'bulk_edit' end);old_guard:='public.oc_has_role(array[''admin'',''product_editor''])';end if;
 if position(old_guard in d)>0 then execute replace(d,old_guard,replacement);
 elsif position(replacement in d)=0 then raise exception 'Unrecognized RPC guard: %',r.proname;end if;
 end loop;
end $$;
-- Upgrade existing Smart policies. Keep public catalogue/review submission policies intact.
do $$declare r record; key text; qual text; chk text; command text;begin
 for r in select p.*,c.relname,n.nspname from pg_policy p join pg_class c on c.oid=p.polrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','storage') loop
 key:=case r.relname when 'products' then 'products' when 'categories' then 'categories' when 'subcategories' then 'categories' when 'brands' then 'brands' when 'product_reviews' then 'reviews' when 'customer_reviews' then 'reviews' when 'quote_requests' then 'enquiries' when 'site_content' then 'content' when 'product_details' then 'gallery' when 'suppliers' then 'inventory' when 'product_inventory' then 'inventory' when 'smart_metrics' then 'reports' when 'customers' then 'billing' when 'quotations' then 'billing' when 'quotation_items' then 'billing' when 'invoices' then 'billing' when 'invoice_items' then 'billing' when 'billing_settings' then 'billing' when 'delivery_notes' then 'billing' when 'delivery_note_items' then 'billing' when 'billing_audit' then 'billing' when 'objects' then 'gallery' end;
 if key is null then continue;end if;
 qual:=pg_get_expr(r.polqual,r.polrelid);chk:=pg_get_expr(r.polwithcheck,r.polrelid);
 -- Only change named Smart guards. pg_get_expr normalizes ARRAY casts and spacing.
 if r.polname like 'oc_%' and r.polname not like 'oc_company_%' then
 qual:=regexp_replace(qual,'(public\.)?oc_has_role\(ARRAY\[[^]]*\]\)',format('public.oc_can(%L)',key),'g');
 chk:=regexp_replace(chk,'(public\.)?oc_has_role\(ARRAY\[[^]]*\]\)',format('public.oc_can(%L)',key),'g');
 command:=format('alter policy %I on %I.%I',r.polname,r.nspname,r.relname);
 if qual is not null then command:=command||' using ('||qual||')';end if;
 if chk is not null then command:=command||' with check ('||chk||')';end if;
 execute command;
 end if;
 end loop;
end $$;
-- A restrictive write guard also constrains older permissive membership policies.
do $$declare t text;k text;op text;begin
 foreach t in array array['products','categories','subcategories','brands','product_reviews','customer_reviews','product_details','site_content','suppliers'] loop
 if to_regclass('public.'||t) is null then continue;end if;
 k:=case t when 'products' then 'products' when 'categories' then 'categories' when 'subcategories' then 'categories' when 'brands' then 'brands' when 'product_reviews' then 'reviews' when 'customer_reviews' then 'reviews' when 'product_details' then 'gallery' when 'site_content' then 'content' else 'inventory' end;
 foreach op in array array['insert','update','delete'] loop
 -- Preserve anonymous/authenticated public review submissions. Their existing validation stays in place.
 if op='insert' and t in ('product_reviews','customer_reviews') then continue;end if;
 execute format('drop policy if exists %I on public.%I','oc_permission_'||op,t);
 if op='insert' then execute format('create policy %I on public.%I as restrictive for insert to authenticated with check(public.oc_can(%L))','oc_permission_'||op,t,k);
 elsif op='update' then execute format('create policy %I on public.%I as restrictive for update to authenticated using(public.oc_can(%L)) with check(public.oc_can(%L))','oc_permission_'||op,t,k,k);
 else execute format('create policy %I on public.%I as restrictive for delete to authenticated using(public.oc_can(%L))','oc_permission_'||op,t,k);end if;
 end loop;end loop;
end $$;
-- Disabled members cannot use a stale JWT against legacy policies or storage writes.
do $$declare t text;op text;begin
 foreach t in array array['products','categories','subcategories','brands','product_reviews','customer_reviews','quote_requests','site_content','product_details','suppliers','product_inventory','customers','quotations','quotation_items','invoices','invoice_items','billing_settings','delivery_notes','delivery_note_items','billing_audit','smart_metrics'] loop
 if to_regclass('public.'||t) is null then continue;end if;
 -- Reads of public catalogue/content remain public; private reads are scoped above.
 foreach op in array array['insert','update','delete'] loop
 if op='insert' and t in ('quote_requests','product_reviews','customer_reviews') then continue;end if;
 execute format('drop policy if exists %I on public.%I','oc_enabled_'||op,t);
 if op='insert' then execute format('create policy %I on public.%I as restrictive for insert to authenticated with check(public.oc_my_role() is not null)','oc_enabled_'||op,t);
 elsif op='update' then execute format('create policy %I on public.%I as restrictive for update to authenticated using(public.oc_my_role() is not null) with check(public.oc_my_role() is not null)','oc_enabled_'||op,t);
 else execute format('create policy %I on public.%I as restrictive for delete to authenticated using(public.oc_my_role() is not null)','oc_enabled_'||op,t);end if;
 end loop;end loop;
end $$;
-- Product editors can upload main images; gallery editors can upload gallery images.
-- Public pending reviews stay available, but a staff login alone never grants moderation.
do $$begin
 if to_regclass('public.product_reviews') is not null then
  execute 'drop policy if exists oc_review_visibility on public.product_reviews';
  execute 'create policy oc_review_visibility on public.product_reviews as restrictive for select to authenticated using(is_published or public.oc_can(''reviews''))';
  execute 'drop policy if exists oc_review_submission on public.product_reviews';
  execute 'create policy oc_review_submission on public.product_reviews as restrictive for insert to authenticated with check(public.oc_can(''reviews'') or (not is_published and source=''customer'' and exists(select 1 from public.products p where p.id=product_id and p.active)))';
 end if;
end $$;
drop policy if exists oc_image_staff_insert on storage.objects;
create policy oc_image_staff_insert on storage.objects as restrictive for insert to authenticated with check(bucket_id<>'product-images' or public.oc_can('products') or public.oc_can('gallery') or public.oc_can('brands'));
drop policy if exists oc_image_staff_update on storage.objects;
create policy oc_image_staff_update on storage.objects as restrictive for update to authenticated using(bucket_id<>'product-images' or public.oc_can('products') or public.oc_can('gallery') or public.oc_can('brands')) with check(bucket_id<>'product-images' or public.oc_can('products') or public.oc_can('gallery') or public.oc_can('brands'));
drop policy if exists oc_image_staff_delete on storage.objects;
create policy oc_image_staff_delete on storage.objects as restrictive for delete to authenticated using(bucket_id<>'product-images' or public.oc_can('products') or public.oc_can('gallery') or public.oc_can('brands'));
notify pgrst,'reload schema';
commit;
