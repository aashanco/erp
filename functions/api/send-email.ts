// Aashan ERP Phase 21.2 - Resend Email Engine
// Cloudflare Pages Function: functions/api/send-email.ts
// Uses Resend REST API. No SMTP and no MailChannels.

type Env = {
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  NEXT_PUBLIC_SUPABASE_URL?: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
  EMAIL_REPLY_TO?: string;
  EMAIL_BCC?: string;
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

async function verifySupabaseToken(env: Env, token: string) {
  const supabaseUrl = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = env.SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return { ok: false, error: "Supabase environment variables are missing." };
  }

  if (!token) {
    return { ok: false, error: "Missing login token. Please login again." };
  }

  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    method: "GET",
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    return { ok: false, error: "Invalid login session. Please login again." };
  }

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
  } catch {
    // Email log failure should not block sending.
  }
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

    if (!env.RESEND_API_KEY) {
      return jsonResponse({ error: "RESEND_API_KEY is missing in Cloudflare variables." }, 500);
    }

    const body = await context.request.json();

    const to = String(body.to || "").trim();
    const subject = String(body.subject || "").trim();
    const html = String(body.html || body.body || "").trim();
    const text = String(body.text || stripHtml(html)).trim();
    const documentType = String(body.documentType || "ERP Document").trim();

    if (!to) return jsonResponse({ error: "Recipient email is missing." }, 400);
    if (!subject) return jsonResponse({ error: "Email subject is missing." }, 400);
    if (!html && !text) return jsonResponse({ error: "Email body is missing." }, 400);

    const toList = to.split(",").map((email: string) => email.trim()).filter(Boolean);
    const bccList = String(env.EMAIL_BCC || "").split(",").map((email: string) => email.trim()).filter(Boolean);

    const resendPayload: any = {
      from: env.EMAIL_FROM || "Aashan & Co LLC <support@aashan.co>",
      to: toList,
      subject,
      html: html || text.replace(/\n/g, "<br />"),
      text: text || stripHtml(html),
    };

    if (env.EMAIL_REPLY_TO) resendPayload.reply_to = env.EMAIL_REPLY_TO;
    if (bccList.length) resendPayload.bcc = bccList;

    const sendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(resendPayload),
    });

    const responseBody = await sendResponse.text();
    let resendResult: any = {};

    try {
      resendResult = responseBody ? JSON.parse(responseBody) : {};
    } catch {
      resendResult = { raw: responseBody };
    }

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

    return jsonResponse({
      ok: true,
      id: resendResult?.id || "",
      message: `${documentType} email sent to ${to}`,
    });
  } catch (error: any) {
    return jsonResponse({ error: error?.message || "Unexpected email error." }, 500);
  }
}
