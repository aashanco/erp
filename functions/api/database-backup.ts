// Aashan ERP v5.8.0 - Backup & Recovery
// Cloudflare Pages Function. Keeps SUPABASE_SERVICE_ROLE_KEY server-side only.

type Env = {
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
};

const BACKUP_TABLES = [
  'company_settings','number_sequences','gl_accounts','customers','vendors','jobs','quotes','work_orders',
  'invoices','payments','receipts','purchase_invoices','expenses','vendor_payments','journal_entries',
  'gl_transaction_headers','gl_transaction_lines','email_settings','email_templates','print_templates',
  'document_attachments','user_profiles'
];

function corsHeaders(extra: Record<string,string> = {}) {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    ...extra,
  };
}

function json(payload: any, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: corsHeaders({ 'Content-Type': 'application/json' }) });
}

export async function onRequestOptions() { return json({ ok: true }); }

async function requireAdmin(request: Request, env: Env) {
  const url = String(env.SUPABASE_URL || '').replace(/\/$/, '');
  const service = String(env.SUPABASE_SERVICE_ROLE_KEY || '');
  if (!url || !service) throw new Error('Backup server is not configured. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Cloudflare Pages environment variables.');

  const auth = request.headers.get('Authorization') || '';
  if (!auth.startsWith('Bearer ')) throw new Error('Authentication is required.');

  const userRes = await fetch(`${url}/auth/v1/user`, { headers: { apikey: service, Authorization: auth } });
  if (!userRes.ok) throw new Error('Your ERP session could not be verified. Please sign in again.');
  const user: any = await userRes.json();

  const profileRes = await fetch(`${url}/rest/v1/user_profiles?id=eq.${encodeURIComponent(user.id)}&select=id,email,role,active&limit=1`, {
    headers: { apikey: service, Authorization: `Bearer ${service}` }
  });
  const profiles: any[] = profileRes.ok ? await profileRes.json() : [];
  const profile = profiles[0];
  if (!profile || profile.role !== 'Admin' || profile.active === false) throw new Error('Administrator access is required for Backup & Recovery.');
  return { url, service, user, profile };
}

async function getDatabaseSize(url: string, service: string) {
  const r = await fetch(`${url}/rest/v1/rpc/aashan_database_size`, {
    method: 'POST',
    headers: { apikey: service, Authorization: `Bearer ${service}`, 'Content-Type': 'application/json' },
    body: '{}',
  });
  if (!r.ok) return null;
  return r.json();
}

async function getLastBackup(url: string, service: string) {
  const r = await fetch(`${url}/rest/v1/backup_history?select=*&order=created_at.desc&limit=1`, {
    headers: { apikey: service, Authorization: `Bearer ${service}` }
  });
  if (!r.ok) return null;
  const rows: any[] = await r.json();
  return rows[0] || null;
}

async function readAllRows(url: string, service: string, table: string) {
  const all: any[] = [];
  const pageSize = 1000;
  for (let start = 0; ; start += pageSize) {
    const r = await fetch(`${url}/rest/v1/${encodeURIComponent(table)}?select=*`, {
      headers: {
        apikey: service,
        Authorization: `Bearer ${service}`,
        Range: `${start}-${start + pageSize - 1}`,
        'Range-Unit': 'items',
      },
    });
    if (!r.ok) {
      const msg = await r.text();
      throw new Error(`Could not back up ${table}: ${msg || r.statusText}`);
    }
    const rows: any[] = await r.json();
    all.push(...rows);
    if (rows.length < pageSize) break;
  }
  return all;
}

async function writeHistory(url: string, service: string, row: any) {
  await fetch(`${url}/rest/v1/backup_history`, {
    method: 'POST',
    headers: {
      apikey: service,
      Authorization: `Bearer ${service}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(row),
  }).catch(() => null);
}

export async function onRequestGet(context: any) {
  try {
    const env = context.env as Env;
    const { url, service, user } = await requireAdmin(context.request, env);
    const requestUrl = new URL(context.request.url);

    if (requestUrl.searchParams.get('mode') === 'status') {
      const [database, last_backup] = await Promise.all([getDatabaseSize(url, service), getLastBackup(url, service)]);
      return json({ ok: true, database, last_backup, automatic_backup: 'Not enabled in v5.8.0' });
    }

    const createdAt = new Date().toISOString();
    const stamp = createdAt.replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
    const filename = `AashanERP_PROD_${stamp}.json`;
    const tables: Record<string, any[]> = {};
    let rowCount = 0;

    for (const table of BACKUP_TABLES) {
      const rows = await readAllRows(url, service, table);
      tables[table] = rows;
      rowCount += rows.length;
    }

    const database = await getDatabaseSize(url, service);
    const payload = {
      format: 'aashan-erp-backup-v1',
      application: 'Aashan ERP',
      version: '5.8.0',
      created_at: createdAt,
      created_by: user.email || user.id,
      database,
      row_count: rowCount,
      tables,
      notes: 'Database table data and attachment metadata only. Supabase Storage binary files are not embedded in this backup.',
    };
    const body = JSON.stringify(payload, null, 2);
    const sizeBytes = new TextEncoder().encode(body).byteLength;

    await writeHistory(url, service, {
      backup_type: 'manual_download', status: 'Success', file_name: filename,
      size_bytes: sizeBytes, row_count: rowCount, created_by: user.email || user.id,
    });

    return new Response(body, {
      status: 200,
      headers: corsHeaders({
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      }),
    });
  } catch (error: any) {
    return json({ error: error?.message || 'Database backup failed.' }, /Administrator|Authentication|session/.test(error?.message || '') ? 403 : 500);
  }
}
