type Env = {
  RESEND_API_KEY: string;
  EMAIL_FROM: string;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const onRequestPost = async (context: any) => {
  try {
    const authHeader = context.request.headers.get("Authorization") || "";
    const accessToken = authHeader.replace("Bearer ", "").trim();

    if (!accessToken) {
      return jsonResponse({ error: "Missing login token" }, 401);
    }

    const userCheck = await fetch(`${context.env.SUPABASE_URL}/auth/v1/user`, {
      headers: {
        apikey: context.env.SUPABASE_ANON_KEY,
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!userCheck.ok) {
      return jsonResponse({ error: "Invalid or expired login session" }, 401);
    }

    const body = await context.request.json<{
      to?: string;
      subject?: string;
      html?: string;
      text?: string;
      documentType?: string;
    }>();

    if (!body.to || !body.subject || (!body.html && !body.text)) {
      return jsonResponse({ error: "Missing email fields" }, 400);
    }

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${context.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: context.env.EMAIL_FROM,
        to: [body.to],
        subject: body.subject,
        html: body.html || body.text || "",
        text: body.text || "",
      }),
    });

    const resendResult = await resendResponse.json();

    if (!resendResponse.ok) {
      return jsonResponse(
        { error: resendResult?.message || "Email provider error", details: resendResult },
        500
      );
    }

    return jsonResponse({ ok: true, id: resendResult.id });
  } catch (error: any) {
    return jsonResponse({ error: error?.message || "Unknown email error" }, 500);
  }
};

export const onRequestGet = async () => {
  return jsonResponse({ ok: true, message: "Aashan ERP email API is running" });
};
