// Aashan ERP Phase 21.3 - Professional Email Templates + Logo Fix
// File: functions/api/send-email.ts
// Uses Resend REST API. Requires RESEND_API_KEY in Cloudflare variables.

type Env = {
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  NEXT_PUBLIC_SUPABASE_URL?: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
  EMAIL_REPLY_TO?: string;
  EMAIL_BCC?: string;
  LOGO_URL?: string;
  ERP_URL?: string;
};

function jsonResponse(payload: any, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    },
  });
}

function stripHtml(html: string) {
  return String(html || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function money(value: any) {
  const numberValue = Number(value || 0);
  if (!Number.isFinite(numberValue)) return "$0.00";
  return numberValue.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function safe(value: any) {
  return String(value ?? "").replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c] || c));
}

async function verifySupabaseToken(env: Env, token: string) {
  const supabaseUrl = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = env.SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) return { ok: false, error: "Supabase environment variables are missing." };
  if (!token) return { ok: false, error: "Missing login token. Please login again." };

  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    method: "GET",
    headers: { apikey: supabaseKey, Authorization: `Bearer ${token}` },
  });

  if (!response.ok) return { ok: false, error: "Invalid login session. Please login again." };

  const user = await response.json();
  return { ok: true, user };
}

async function logEmail(env: Env, row: any, token: string) {
  const supabaseUrl = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = env.SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey || !token) return;

  try {
    await fetch(`${supabaseUrl}/rest/v1/email_logs`, {
      method: "POST",
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(row),
    });
  } catch {}
}

function brandedShell(env: Env, params: {
  title: string;
  subtitle?: string;
  bodyHtml: string;
  buttonText?: string;
  buttonUrl?: string;
  footerNote?: string;
}) {
  const logoUrl = env.LOGO_URL || "https://erp.aashan.co/aashan-logo.png";
  const erpUrl = env.ERP_URL || "https://erp.aashan.co";

  const button = params.buttonText && params.buttonUrl
    ? `<tr><td align="center" style="padding:22px 0 10px 0;">
        <a href="${safe(params.buttonUrl)}" style="background:#2563eb;color:#ffffff;text-decoration:none;padding:13px 22px;border-radius:10px;font-weight:700;display:inline-block;">
          ${safe(params.buttonText)}
        </a>
      </td></tr>`
    : "";

  return `<!doctype html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8"/>
</head>
<body style="margin:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f1f5f9;padding:28px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 18px 50px rgba(15,23,42,0.12);">
          <tr>
            <td style="background:linear-gradient(135deg,#0f172a,#1d4ed8);padding:24px 28px;color:#ffffff;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="vertical-align:middle;">
                    <img src="${safe(logoUrl)}" width="72" height="72" alt="Aashan & Co LLC" style="display:block;border-radius:14px;background:#ffffff;padding:6px;object-fit:contain;"/>
                  </td>
                  <td style="vertical-align:middle;padding-left:16px;">
                    <div style="font-size:24px;font-weight:800;line-height:1.2;">Aashan & Co LLC</div>
                    <div style="font-size:14px;color:#dbeafe;margin-top:3px;">Field Service & Accounting</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;">
              <h1 style="margin:0 0 6px 0;font-size:26px;line-height:1.25;color:#0f172a;">${safe(params.title)}</h1>
              ${params.subtitle ? `<p style="margin:0 0 22px 0;color:#64748b;font-size:15px;">${safe(params.subtitle)}</p>` : ""}
              ${params.bodyHtml}
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">${button}</table>
            </td>
          </tr>
          <tr>
            <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:18px 28px;color:#475569;font-size:13px;line-height:1.6;">
              <strong>Aashan & Co LLC</strong><br/>
              Phone: (832) 210-4248 &nbsp; | &nbsp; Email: support@aashan.co<br/>
              <a href="${safe(erpUrl)}" style="color:#2563eb;text-decoration:none;">${safe(erpUrl)}</a><br/>
              ${params.footerNote || "Thank you for choosing Aashan & Co LLC."}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function documentSummaryCard(fields: Array<{ label: string; value: any }>) {
  const rows = fields.map((f) => `
    <tr>
      <td style="padding:10px 0;color:#64748b;border-bottom:1px solid #e2e8f0;">${safe(f.label)}</td>
      <td align="right" style="padding:10px 0;color:#0f172a;font-weight:700;border-bottom:1px solid #e2e8f0;">${safe(f.value)}</td>
    </tr>
  `).join("");

  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:10px 16px;margin:16px 0 20px 0;">${rows}</table>`;
}

function buildProfessionalEmail(env: Env, body: any) {
  const documentType = String(body.documentType || "ERP Document");
  const customer = body.customer || body.customerName || "";
  const documentNo = body.documentNo || body.invoiceNo || body.quoteNo || body.receiptNo || "";
  const amount = body.amount || body.balance || "";
  const dueDate = body.dueDate || "";
  const rawHtml = String(body.html || body.body || "").trim();

  if (documentType.toLowerCase().includes("invoice")) {
    return brandedShell(env, {
      title: "Invoice from Aashan & Co LLC",
      subtitle: customer ? `Hello ${customer}, please find your invoice details below.` : "Please find your invoice details below.",
      bodyHtml: `
        ${documentSummaryCard([
          { label: "Invoice #", value: documentNo || "Invoice" },
          { label: "Amount Due", value: amount ? money(amount) : "Please see invoice" },
          { label: "Due Date", value: dueDate || "Due on receipt" },
        ])}
        <p style="font-size:15px;line-height:1.7;color:#334155;">${rawHtml || "Thank you for choosing Aashan & Co LLC. Please review your invoice and contact us if you have any questions."}</p>
      `,
      buttonText: "Open ERP",
      buttonUrl: env.ERP_URL || "https://erp.aashan.co",
    });
  }

  if (documentType.toLowerCase().includes("quote")) {
    return brandedShell(env, {
      title: "Quote from Aashan & Co LLC",
      subtitle: customer ? `Hello ${customer}, please review your quote details below.` : "Please review your quote details below.",
      bodyHtml: `
        ${documentSummaryCard([
          { label: "Quote #", value: documentNo || "Quote" },
          { label: "Estimated Amount", value: amount ? money(amount) : "Please see quote" },
        ])}
        <p style="font-size:15px;line-height:1.7;color:#334155;">${rawHtml || "Please review the quote and let us know if you would like to proceed."}</p>
      `,
      buttonText: "View Quote",
      buttonUrl: env.ERP_URL || "https://erp.aashan.co",
    });
  }

  if (documentType.toLowerCase().includes("receipt")) {
    return brandedShell(env, {
      title: "Payment Receipt",
      subtitle: customer ? `Hello ${customer}, thank you for your payment.` : "Thank you for your payment.",
      bodyHtml: `
        ${documentSummaryCard([
          { label: "Receipt #", value: documentNo || "Receipt" },
          { label: "Amount Paid", value: amount ? money(amount) : "Payment received" },
        ])}
        <p style="font-size:15px;line-height:1.7;color:#334155;">${rawHtml || "We appreciate your business and the opportunity to serve you."}</p>
        <p style="font-size:15px;line-height:1.7;color:#334155;">If you are happy with our service, please consider leaving us a review.</p>
      `,
      buttonText: "Leave a Review",
      buttonUrl: "https://www.facebook.com/profile.php?id=61584788072935&sk=reviews",
    });
  }

  return brandedShell(env, {
    title: documentType,
    subtitle: "Message from Aashan & Co LLC",
    bodyHtml: `<p style="font-size:15px;line-height:1.7;color:#334155;">${rawHtml || "Thank you for choosing Aashan & Co LLC."}</p>`,
    buttonText: "Open ERP",
    buttonUrl: env.ERP_URL || "https://erp.aashan.co",
  });
}

export async function onRequestOptions() {
  return jsonResponse({ ok: true });
}

export async function onRequestPost(context: any) {
  const env = context.env as Env;

  try {
    const authHeader = context.request.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "").trim();

    const auth = await verifySupabaseToken(env, token);
    if (!auth.ok) return jsonResponse({ error: auth.error }, 401);

    if (!env.RESEND_API_KEY) return jsonResponse({ error: "RESEND_API_KEY is missing in Cloudflare variables." }, 500);

    const body = await context.request.json();
    const to = String(body.to || "").trim();
    const subject = String(body.subject || "").trim();
    const documentType = String(body.documentType || "ERP Document").trim();

    if (!to) return jsonResponse({ error: "Recipient email is missing." }, 400);
    if (!subject) return jsonResponse({ error: "Email subject is missing." }, 400);

    const html = buildProfessionalEmail(env, body);
    const text = String(body.text || stripHtml(html)).trim();

    const toList = to.split(",").map((email: string) => email.trim()).filter(Boolean);
    const bccList = String(env.EMAIL_BCC || "").split(",").map((email: string) => email.trim()).filter(Boolean);

    const resendPayload: any = {
      from: env.EMAIL_FROM || "Aashan & Co LLC <support@aashan.co>",
      to: toList,
      subject,
      html,
      text,
    };

    if (env.EMAIL_REPLY_TO) resendPayload.reply_to = env.EMAIL_REPLY_TO;
    if (bccList.length) resendPayload.bcc = bccList;

    const sendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(resendPayload),
    });

    const responseBody = await sendResponse.text();
    let resendResult: any = {};
    try { resendResult = responseBody ? JSON.parse(responseBody) : {}; } catch { resendResult = { raw: responseBody }; }

    if (!sendResponse.ok) {
      const message = resendResult?.message || resendResult?.error || responseBody || sendResponse.statusText;

      await logEmail(env, {
        to_email: to,
        subject,
        document_type: documentType,
        status: "Failed",
        error_message: String(message).slice(0, 500),
      }, token);

      return jsonResponse({ error: `Email failed: ${message}` }, 500);
    }

    await logEmail(env, {
      to_email: to,
      subject,
      document_type: documentType,
      status: "Sent",
      error_message: "",
    }, token);

    return jsonResponse({ ok: true, id: resendResult?.id || "", message: `${documentType} email sent to ${to}` });
  } catch (error: any) {
    return jsonResponse({ error: error?.message || "Unexpected email error." }, 500);
  }
}
