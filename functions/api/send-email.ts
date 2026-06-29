// Aashan ERP - Business Email Engine
// Cloudflare Pages Function: functions/api/send-email.ts

type Env = {
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
  EMAIL_REPLY_TO?: string;
  EMAIL_BCC?: string;
};

function jsonResponse(payload: any, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
    },
  });
}

export async function onRequestOptions() {
  return jsonResponse({ ok: true });
}

function htmlShell(body: string, viewUrl: string, documentType: string) {
  const button = viewUrl
    ? `<div style="text-align:center;margin:28px 0;"><a href="${viewUrl}" style="background:#2563eb;color:white;text-decoration:none;padding:13px 22px;border-radius:9px;font-weight:800;display:inline-block;">View ${documentType}</a></div>`
    : '';

  return `
  <div style="background:#eef2f7;padding:26px;font-family:Arial,sans-serif;color:#0f172a;">
    <div style="max-width:680px;margin:0 auto;background:white;border-radius:18px;overflow:hidden;">
      <div style="background:linear-gradient(135deg,#0f172a,#2563eb);padding:24px 30px;color:white;">
        <h1 style="margin:0;font-size:26px;">Aashan & Co LLC</h1>
        <p style="margin:6px 0 0;">Field Service & Accounting</p>
      </div>
      <div style="padding:28px 30px;font-size:15px;line-height:1.65;">
        ${body}
        ${button}
      </div>
      <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:18px 30px;color:#475569;font-size:13px;">
        Aashan & Co LLC<br/>
        Phone: (832) 210-4248 &nbsp; | &nbsp; Email: support@aashan.co<br/>
        www.aashan.co
      </div>
    </div>
  </div>`;
}

export async function onRequestPost(context: any) {
  const env = context.env as Env;

  try {
    const body = await context.request.json();

    const to = String(body.to || '').trim();
    const subject = String(body.subject || '').trim();
    const text = String(body.text || '').trim();
    const rawHtml = String(body.html || text.replace(/\n/g, '<br />')).trim();
    const documentType = String(body.documentType || 'Document').trim();
    const viewUrl = String(body.viewUrl || body.view_url || '').trim();

    if (!to) return jsonResponse({ error: 'Recipient email is missing.' }, 400);
    if (!subject) return jsonResponse({ error: 'Email subject is missing.' }, 400);
    if (!rawHtml && !text) return jsonResponse({ error: 'Email body is missing.' }, 400);

    if (!env.RESEND_API_KEY) {
      return jsonResponse({ error: 'RESEND_API_KEY is missing in Cloudflare environment variables.' }, 500);
    }

    const html = htmlShell(rawHtml, viewUrl, documentType);

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: env.EMAIL_FROM || 'Aashan & Co LLC <support@aashan.co>',
        to: [to],
        subject,
        html,
        text,
        reply_to: env.EMAIL_REPLY_TO || 'support@aashan.co',
        bcc: env.EMAIL_BCC ? env.EMAIL_BCC.split(',').map((e) => e.trim()).filter(Boolean) : undefined,
      }),
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      return jsonResponse({ error: result?.message || result?.error || 'Email failed to send.' }, 500);
    }

    return jsonResponse({ ok: true, message: `${documentType} email sent to ${to}`, id: result.id });
  } catch (error: any) {
    return jsonResponse({ error: error?.message || 'Unexpected email error.' }, 500);
  }
}
