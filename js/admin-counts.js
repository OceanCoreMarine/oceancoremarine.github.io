document.addEventListener('DOMContentLoaded',()=>{
 const sb=window.ocSupabase,quoteBadge=document.getElementById('newQuoteCount'),reviewBadge=document.getElementById('pendingReviewCount');if(!quoteBadge||!reviewBadge)return;
 let busy=false,refreshQueued=false,verifiedUser=null,lastQuotes=null,lastReviews=null;
 function show(el,count,label){const n=Number(count)||0;el.textContent=n>99?'99+':String(n);el.hidden=n===0;el.title=`${n} ${label}`;el.setAttribute('aria-label',`${n} ${label}`)}
 function clear(){verifiedUser=null;lastQuotes=null;lastReviews=null;quoteBadge.hidden=true;reviewBadge.hidden=true}
 async function refresh(){if(document.hidden)return;if(busy){refreshQueued=true;return}busy=true;try{
  const {data:{user},error}=await sb.auth.getUser();if(error||!user){clear();return}
  if(verifiedUser!==user.id){const {data:admin,error}=await sb.from('admin_users').select('user_id').eq('user_id',user.id).maybeSingle();if(error||!admin){clear();return}verifiedUser=user.id}
  const results=await Promise.allSettled([
   sb.from('quote_requests').select('id',{count:'exact',head:true}).or('status.is.null,status.neq.Contacted').is('admin_seen_at',null),
   sb.from('product_reviews').select('id',{count:'exact',head:true}).eq('is_published',false).is('admin_seen_at',null)
  ]);
  for(let i=0;i<results.length;i++){const r=results[i];const el=i===0?quoteBadge:reviewBadge;if(r.status!=='fulfilled'||r.value.error){el.title='Count could not be refreshed';continue}const count=r.value.count;if(!Number.isInteger(count))continue;show(el,count,i===0?'unread quote requests':'unread reviews');const previous=i===0?lastQuotes:lastReviews;if((previous===null&&count>0)||(previous!==null&&previous!==count)){const section=document.getElementById(i===0?'quotes':'productReviews');if(section?.classList.contains('active'))document.dispatchEvent(new Event(i===0?'oc:refresh-quotes':'oc:refresh-product-reviews'))}if(i===0)lastQuotes=count;else lastReviews=count}
 }catch{quoteBadge.title='Count could not be refreshed';reviewBadge.title='Count could not be refreshed'}finally{busy=false;if(refreshQueued){refreshQueued=false;setTimeout(refresh,0)}}}
 async function markRead(table,sectionId,event){const section=document.getElementById(sectionId);if(document.hidden||!section?.classList.contains('active')||!verifiedUser)return;const ids=[...new Set((event.detail?.ids||[]).map(String))].filter(id=>/^[a-z0-9-]{1,64}$/i.test(id));if(!ids.length)return;const {error}=await sb.from(table).update({admin_seen_at:new Date().toISOString()}).in('id',ids).is('admin_seen_at',null);if(error){console.warn('Unable to mark items read',{table,code:error.code});return}refresh();}
 document.addEventListener('oc:admin-quotes-read',e=>markRead('quote_requests','quotes',e));
 document.addEventListener('oc:admin-reviews-read',e=>markRead('product_reviews','productReviews',e));
 document.addEventListener('oc:admin-counts-refresh',refresh);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh()});
 sb.auth.onAuthStateChange((event)=>{if(event==='SIGNED_OUT')clear();else setTimeout(refresh,0)});
 refresh();let timer=setInterval(refresh,30000);window.addEventListener('pagehide',()=>clearInterval(timer));window.addEventListener('pageshow',e=>{if(e.persisted){clearInterval(timer);timer=setInterval(refresh,30000);refresh()}});
});
