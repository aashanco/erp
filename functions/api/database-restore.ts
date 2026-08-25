// Aashan ERP v5.8.0 - Safe Merge Recovery
// Re-inserts missing rows and overwrites matching primary keys; does not delete newer rows.

type Env = { SUPABASE_URL?: string; SUPABASE_SERVICE_ROLE_KEY?: string; };
const RESTORE_ORDER = [
  'company_settings','number_sequences','gl_accounts','customers','vendors','email_settings','email_templates','print_templates',
  'jobs','quotes','work_orders','invoices','purchase_invoices','expenses','payments','receipts','vendor_payments','journal_entries',
  'gl_transaction_headers','gl_transaction_lines','document_attachments','user_profiles'
];
function headers(extra: Record<string,string> = {}) { return { 'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type, Authorization','Access-Control-Allow-Methods':'POST, OPTIONS', ...extra }; }
function json(payload:any,status=200){return new Response(JSON.stringify(payload),{status,headers:headers({'Content-Type':'application/json'})});}
export async function onRequestOptions(){return json({ok:true});}

async function requireAdmin(request:Request,env:Env){
  const url=String(env.SUPABASE_URL||'').replace(/\/$/,''); const service=String(env.SUPABASE_SERVICE_ROLE_KEY||'');
  if(!url||!service) throw new Error('Recovery server is not configured. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Cloudflare Pages environment variables.');
  const auth=request.headers.get('Authorization')||''; if(!auth.startsWith('Bearer ')) throw new Error('Authentication is required.');
  const ur=await fetch(`${url}/auth/v1/user`,{headers:{apikey:service,Authorization:auth}}); if(!ur.ok) throw new Error('Your ERP session could not be verified.');
  const user:any=await ur.json();
  const pr=await fetch(`${url}/rest/v1/user_profiles?id=eq.${encodeURIComponent(user.id)}&select=id,email,role,active&limit=1`,{headers:{apikey:service,Authorization:`Bearer ${service}`}});
  const ps:any[]=pr.ok?await pr.json():[]; if(!ps[0]||ps[0].role!=='Admin'||ps[0].active===false) throw new Error('Administrator access is required for recovery.');
  return {url,service,user};
}

async function upsertChunk(url:string,service:string,table:string,rows:any[]){
  const r=await fetch(`${url}/rest/v1/${encodeURIComponent(table)}`,{method:'POST',headers:{apikey:service,Authorization:`Bearer ${service}`,'Content-Type':'application/json',Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(rows)});
  if(!r.ok){const msg=await r.text();throw new Error(`Recovery stopped at ${table}: ${msg||r.statusText}`);}
}

export async function onRequestPost(context:any){
  try{
    const {url,service,user}=await requireAdmin(context.request,context.env as Env);
    const payload:any=await context.request.json();
    if(payload?.format!=='aashan-erp-backup-v1'||!payload?.tables) return json({error:'This is not a valid Aashan ERP v5.8.0 backup file.'},400);
    let restored=0; const restoredTables:any={};
    for(const table of RESTORE_ORDER){
      const rows=Array.isArray(payload.tables[table])?payload.tables[table]:[];
      for(let i=0;i<rows.length;i+=200) await upsertChunk(url,service,table,rows.slice(i,i+200));
      restored+=rows.length; restoredTables[table]=rows.length;
    }
    await fetch(`${url}/rest/v1/backup_history`,{method:'POST',headers:{apikey:service,Authorization:`Bearer ${service}`,'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify({backup_type:'safe_merge_recovery',status:'Success',file_name:`Recovery from ${payload.created_at||'backup'}`,size_bytes:0,row_count:restored,created_by:user.email||user.id})}).catch(()=>null);
    return json({ok:true,rows_restored:restored,tables:restoredTables,mode:'safe_merge'});
  }catch(error:any){return json({error:error?.message||'Recovery failed.'},500);}
}
