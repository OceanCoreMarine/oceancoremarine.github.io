/* Passwords are sent only to the authenticated server function, never stored here. */
(()=>{'use strict';
window.OceanCoreTeam={mount({pane,run,status}){
 const sb=window.ocSupabase,A=window.OceanCoreAccess,E=window.OceanCoreSmartCore.escape;
 let members=[],busy=false;
 const $=s=>document.querySelector(s);
 pane('smartTeam','Team Access',`<p>Create staff accounts and choose their access. Only full administrators can manage the team and company settings.</p><form id="smartTeamForm" class="smart-form"><input name="user_id" type="hidden"><label>Email<input name="email" type="email" autocomplete="off" maxlength="254" required></label><label id="smartTeamPasswordLabel">Password<input name="password" type="password" autocomplete="new-password" minlength="12" maxlength="128" required><small>12–128 characters. Share it with the staff member privately.</small></label><label class="smart-full"><input name="full_admin" type="checkbox"> Full administrator — all access, including Team Access and company settings</label><fieldset class="smart-full smart-permission-fieldset"><legend>Allowed features</legend><div class="smart-team-actions"><button type="button" class="small" id="smartTeamAll">Select all features</button><button type="button" class="small" id="smartTeamNone">Clear selection</button></div><div class="smart-permission-grid">${Object.entries(A.labels).map(([k,v])=>`<label><input type="checkbox" name="permission" value="${k}"><span>${E(v)}</span></label>`).join('')}</div></fieldset><label id="smartTeamEnabledLabel" hidden><input name="enabled" type="checkbox" checked> Account enabled</label><div class="smart-full smart-team-actions"><button class="btn btn-primary" id="smartTeamSave" type="submit">Create staff account</button><button class="small" id="smartTeamNew" type="button" hidden>New staff account</button><button class="small" id="smartTeamResetPassword" type="button" hidden>Set new password</button></div></form><p id="smartTeamNotice" role="status"></p><h3>Team members</h3><div id="smartTeamRows"></div>`);
 const form=$('#smartTeamForm'),notice=$('#smartTeamNotice');
 const say=(message,bad=false)=>{notice.textContent=message;notice.className=bad?'smart-error':'smart-success';status(message,bad);};
 const checkboxes=()=>[...form.querySelectorAll('[name="permission"]')];
 const choices=()=>checkboxes().filter(x=>x.checked).map(x=>x.value);
 function full(){checkboxes().forEach(x=>{x.disabled=form.elements.full_admin.checked;if(x.disabled)x.checked=true;});}
 function fresh(){form.reset();form.elements.user_id.value='';form.elements.email.readOnly=false;form.elements.password.required=true;form.elements.enabled.checked=true;$('#smartTeamSave').textContent='Create staff account';$('#smartTeamEnabledLabel').hidden=true;$('#smartTeamNew').hidden=true;$('#smartTeamResetPassword').hidden=true;notice.textContent='';full();}
 function edit(id){const member=members.find(m=>m.user_id===id);if(!member)return;form.reset();form.elements.user_id.value=id;form.elements.email.value=member.email||'';form.elements.email.readOnly=true;form.elements.password.required=false;form.elements.enabled.checked=member.enabled!==false;form.elements.full_admin.checked=member.role==='admin';checkboxes().forEach(x=>x.checked=(member.permissions||[]).includes(x.value));full();$('#smartTeamSave').textContent='Save access';$('#smartTeamEnabledLabel').hidden=false;$('#smartTeamNew').hidden=false;$('#smartTeamResetPassword').hidden=id===window.ocAdminAccess.user_id;say('Editing '+(member.email||id)+'. Leave the password empty when changing access.');form.scrollIntoView({behavior:'smooth',block:'start'});}
 async function list(){const r=await sb.rpc('oc_team_members');if(r.error)throw Error(r.error.message);members=r.data||[];$('#smartTeamRows').innerHTML='<div class="tablewrap"><table class="table"><thead><tr><th>Email</th><th>Access</th><th>Status</th><th></th></tr></thead><tbody>'+members.map(m=>`<tr><td>${E(m.email||m.user_id)}${m.user_id===window.ocAdminAccess.user_id?' <small>Your account</small>':''}</td><td>${E(m.role==='admin'?'Full administrator':(m.permissions||[]).map(k=>A.labels[k]||k).join(', ')||'No features selected')}</td><td>${m.enabled!==false?'Enabled':'Disabled'}</td><td><button type="button" class="small" data-team-edit="${E(m.user_id)}">Edit access</button></td></tr>`).join('')+'</tbody></table></div>';}
 async function invoke(body){const r=await sb.functions.invoke('manage-team',{body});if(r.error){let server;try{server=await r.error.context?.json();}catch{}throw Error(server?.error||'Team server is unavailable. Deploy the manage-team Edge Function, then sign in again.');}if(!r.data?.ok)throw Error(r.data?.error||'Team request failed.');return r.data;}
 async function working(fn){if(busy)return;busy=true;const buttons=[...form.querySelectorAll('button')];buttons.forEach(b=>b.disabled=true);try{await fn();}catch(e){say(e.message,true);}finally{form.elements.password.value='';busy=false;buttons.forEach(b=>b.disabled=false);}}
 form.elements.full_admin.onchange=full;
 $('#smartTeamAll').onclick=()=>checkboxes().forEach(x=>x.checked=true);
 $('#smartTeamNone').onclick=()=>{form.elements.full_admin.checked=false;full();checkboxes().forEach(x=>x.checked=false);};
 $('#smartTeamNew').onclick=fresh;
 $('#smartTeamRows').onclick=e=>{const b=e.target.closest('[data-team-edit]');if(b&&!busy)edit(b.dataset.teamEdit);};
 form.onsubmit=e=>{e.preventDefault();working(async()=>{
  const id=form.elements.user_id.value;
  if(id){
   if(form.elements.password.value)throw Error('Use Set new password separately, or clear the password to save access.');
   const r=await sb.rpc('oc_set_staff_access',{p_user_id:id,p_permissions:choices(),p_full_admin:form.elements.full_admin.checked,p_enabled:form.elements.enabled.checked});if(r.error)throw Error(r.error.message);
   if(id===window.ocAdminAccess.user_id){location.reload();return;}
   await list();say('Access saved. Disabled accounts cannot use admin features; staff can refresh to see their updated menu.');
  }else{
   if(!form.elements.password.checkValidity())throw Error('Use a password between 12 and 128 characters.');
   const created=await invoke({action:'create',email:form.elements.email.value.trim(),password:form.elements.password.value,permissions:choices(),full_admin:form.elements.full_admin.checked});
   fresh();say('Created '+created.email+'. The staff member can now sign in at /admin.html.');await list();
  }
 });};
 $('#smartTeamResetPassword').onclick=()=>working(async()=>{const password=form.elements.password.value;if(password.length<12||password.length>128)throw Error('Enter the new password (12–128 characters), then click Set new password.');await invoke({action:'reset_password',user_id:form.elements.user_id.value,password});say('New password saved.');});
 fresh();run(list);
}};
})();
