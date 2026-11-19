// Deploy as "manage-team". Uses Supabase's server environment; no secrets in public JS.
const allowedOrigin = 'https://oceancoremarine.github.io';
const keys = ['products','categories','brands','reviews','enquiries','billing','gallery','inventory','bulk_edit','content','reports'];
const cors = {'Access-Control-Allow-Origin':allowedOrigin,'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS','Vary':'Origin','Cache-Control':'no-store'};
export async function handler(req: Request): Promise<Response> {
 const reply = (status:number,body:unknown) => new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json'}});
 if (req.headers.get('origin') && req.headers.get('origin') !== allowedOrigin) return reply(403,{error:'Origin not allowed.'});
 if (req.method==='OPTIONS') return new Response(null,{status:204,headers:cors});
 if (req.method!=='POST') return reply(405,{error:'Use POST.'});
 const url=Deno.env.get('SUPABASE_URL'), anon=Deno.env.get('SUPABASE_ANON_KEY'), secret=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
 if(!url||!anon||!secret)return reply(503,{error:'Server configuration is incomplete.'});
 const authorization=req.headers.get('Authorization')||'';
 if(!/^Bearer \S+$/i.test(authorization))return reply(401,{error:'Sign in again.'});
 const headers={'apikey':anon,'Authorization':authorization,'Content-Type':'application/json'};
 const adminHeaders={'apikey':secret,'Authorization':'Bearer '+secret,'Content-Type':'application/json'};
 try {
  // Auth validates the actual user JWT. The caller's own token checks live database ownership.
  const userResponse=await fetch(url+'/auth/v1/user',{headers});
  if(!userResponse.ok)return reply(401,{error:'Session expired. Sign in again.'});
  const user=await userResponse.json();
  const accessResponse=await fetch(url+'/rest/v1/rpc/oc_my_access',{method:'POST',headers,body:'{}'});
  const access=accessResponse.ok?await accessResponse.json():null;
  if(!user.id||access?.role!=='admin'||!access.enabled)return reply(403,{error:'Administrator access required.'});
  const raw=await req.text();if(raw.length>12000)return reply(413,{error:'Request too large.'});
  let body;try{body=JSON.parse(raw);}catch{return reply(400,{error:'Invalid request.'});}
  if(!body||typeof body!=='object')return reply(400,{error:'Invalid request.'});
  const password=body.password;
  if(typeof password!=='string'||password.length<12||password.length>128)return reply(400,{error:'Use a password between 12 and 128 characters.'});
  if(body.action==='reset_password') {
   const membersResponse=await fetch(url+'/rest/v1/rpc/oc_team_members',{method:'POST',headers,body:'{}'});
   const members=membersResponse.ok?await membersResponse.json():[];
   if(!Array.isArray(members)||!members.some((m: {user_id: string})=>m.user_id===body.user_id)||body.user_id===user.id)return reply(400,{error:'Choose another existing team member. Use your own account settings for your password.'});
   const changed=await fetch(url+'/auth/v1/admin/users/'+encodeURIComponent(body.user_id),{method:'PUT',headers:adminHeaders,body:JSON.stringify({password})});
   return changed.ok?reply(200,{ok:true}):reply(400,{error:'Password could not be updated. Check the project password policy.'});
  }
  if(body.action!=='create')return reply(400,{error:'Unknown action.'});
  const email=typeof body.email==='string'?body.email.trim().toLowerCase():'';
  if(email.length>254||!/^\S+@[^\s@]+\.[^\s@]+$/.test(email))return reply(400,{error:'Enter a valid email.'});
  if(!Array.isArray(body.permissions)||body.permissions.length>keys.length||body.permissions.some((k: unknown)=>typeof k!=='string'||!keys.includes(k))||typeof body.full_admin!=='boolean')return reply(400,{error:'Invalid access selection.'});
  const created=await fetch(url+'/auth/v1/admin/users',{method:'POST',headers:adminHeaders,body:JSON.stringify({email,password,email_confirm:true})});
  if(!created.ok) {
   const err=await created.json().catch(()=>({}));
   const duplicate=['email_exists','user_already_exists'].includes(err.error_code)||/already.*registered|already.*exist/i.test(err.msg||err.message||'');
   return reply(400,{error:duplicate?'This email already exists. Edit its existing Team Access entry; existing accounts are never overwritten.':'Account creation failed. Check the email and project password policy.'});
  }
  const account=await created.json();const id=account.id||account.user?.id;
  if(!id)return reply(502,{error:'Auth did not return an account ID. Check Supabase Authentication before retrying.'});
  const assigned=await fetch(url+'/rest/v1/rpc/oc_set_staff_access',{method:'POST',headers,body:JSON.stringify({p_user_id:id,p_permissions:[...new Set(body.permissions)],p_full_admin:body.full_admin,p_enabled:true})});
  if(!assigned.ok) {
   const removed=await fetch(url+'/auth/v1/admin/users/'+encodeURIComponent(id),{method:'DELETE',headers:adminHeaders});
   return reply(409,{error:removed.ok?'Access could not be saved; the new account was removed. Refresh your admin session and retry.':'Account created without access. Check Supabase Authentication for '+email+' before retrying.',user_id:removed.ok?undefined:id});
  }
  return reply(200,{ok:true,user_id:id,email});
 } catch { return reply(502,{error:'Server connection failed. Check Team Access and Supabase Authentication before retrying.'}); }
}
Deno.serve(handler);
