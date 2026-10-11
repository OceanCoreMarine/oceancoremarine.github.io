import { withSupabase } from "npm:@supabase/server@1";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

export default {
  fetch: withSupabase({ auth: "publishable" }, async (req, ctx) => {
    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

    let quoteRequestId: string;
    try {
      const body = await req.json();
      quoteRequestId = String(body?.quote_request_id ?? "");
      if (!/^[a-z0-9-]{1,64}$/i.test(quoteRequestId)) {
        return json({ error: "A valid quote request id is required" }, 400);
      }
    } catch {
      return json({ error: "Invalid request body" }, 400);
    }

    const admin = ctx.supabaseAdmin;
    const { data: quote } = await admin
      .from("quote_requests")
      .select("id,customer_name,company_name,email,phone,product_name,part_number,quantity,message,notification_status")
      .eq("id", quoteRequestId)
      .maybeSingle();
    if (!quote) return json({ error: "Quote request not found" }, 404);
    if (quote.notification_status !== "pending") {
      return json({ ok: true, duplicate: true, status: quote.notification_status });
    }

    const { data: claimed, error: claimError } = await admin
      .from("quote_requests")
      .update({ notification_status: "processing" })
      .eq("id", quoteRequestId)
      .eq("notification_status", "pending")
      .select("id")
      .maybeSingle();
    if (claimError) return json({ error: "Could not claim notification" }, 500);
    if (!claimed) return json({ ok: true, duplicate: true, status: "processing" });

    const lines = [
      `New OceanCore quote request #${quote.id}`,
      `Name: ${quote.customer_name || "—"}`,
      `Company: ${quote.company_name || "—"}`,
      `Email: ${quote.email || "—"}`,
      `Phone / WhatsApp: ${quote.phone || "—"}`,
      `Product: ${quote.product_name || "—"}`,
      `Part number: ${quote.part_number || "—"}`,
      `Quantity: ${quote.quantity || "—"}`,
      `Message: ${quote.message || "—"}`,
    ];
    const text = lines.join("\n");
    const channels: Record<string, boolean> = { email: false, whatsapp: false };

    const emailKey = Deno.env.get("RESEND_API_KEY");
    const emailFrom = Deno.env.get("RESEND_FROM_EMAIL");
    const emailTo = Deno.env.get("QUOTE_NOTIFICATION_EMAIL");
    if (emailKey && emailFrom && emailTo) {
      try {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${emailKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ from: emailFrom, to: [emailTo], subject: `New quote request #${quote.id}`, text }),
        });
        channels.email = response.ok;
      } catch {
        channels.email = false;
      }
    }

    const waToken = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
    const waUrl = Deno.env.get("WHATSAPP_MESSAGES_URL");
    const waRecipient = Deno.env.get("WHATSAPP_RECIPIENT");
    const waTemplate = Deno.env.get("WHATSAPP_TEMPLATE_NAME");
    if (waToken && waUrl && waRecipient && waTemplate) {
      try {
        const response = await fetch(waUrl, {
          method: "POST",
          headers: { Authorization: `Bearer ${waToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: waRecipient,
            type: "template",
            template: {
              name: waTemplate,
              language: { code: Deno.env.get("WHATSAPP_TEMPLATE_LANGUAGE") || "en_US" },
              components: [{
                type: "body",
                parameters: [
                  { type: "text", text: String(quote.id) },
                  { type: "text", text: String(quote.customer_name || "Customer") },
                  { type: "text", text: String(quote.product_name || "Not specified") },
                  { type: "text", text: String(quote.part_number || "Not specified") },
                  { type: "text", text: String(quote.phone || quote.email || "Not provided") },
                ],
              }],
            },
          }),
        });
        channels.whatsapp = response.ok;
      } catch {
        channels.whatsapp = false;
      }
    }

    const sent = channels.email || channels.whatsapp;
    await admin.from("quote_requests").update({
      notification_status: channels.email && channels.whatsapp ? "sent" : sent ? "partial" : "failed",
      notification_sent_at: sent ? new Date().toISOString() : null,
    }).eq("id", quoteRequestId);

    return json({ ok: sent, channels, status: channels.email && channels.whatsapp ? "sent" : sent ? "partial" : "failed" });
  }),
};
