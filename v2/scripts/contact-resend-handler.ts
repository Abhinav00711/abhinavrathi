/**
 * Drop-in Resend handler for the site's contact form.
 *
 * Deploy this as a Cloudflare Worker, a Vercel Edge function, a Lambda
 * URL, or any HTTP-only runtime. The form (`src/components/ContactForm.astro`)
 * POSTs JSON of shape `{ name, email, message, _gotcha }` and expects a
 * 2xx response. The form falls back to a `mailto:` if anything else.
 *
 *   --- Setup --------------------------------------------------------------
 *
 *   1. `npm i resend` in whatever runtime hosts this file.
 *   2. Add secrets:
 *        - `RESEND_API_KEY`   — from the Resend dashboard.
 *        - `CONTACT_TO`       — your destination address (e.g. rathiabhinav01@gmail.com).
 *        - `CONTACT_FROM`     — a verified sender (e.g. site@abhinavrathi.com).
 *        - `ALLOWED_ORIGIN`   — exact site origin for CORS (https://abhinavrathi.com).
 *   3. Deploy the file as a single endpoint, e.g. `/api/contact` or
 *      `https://your-worker.workers.dev/`.
 *   4. In the site, set `PUBLIC_CONTACT_ENDPOINT` in `.env` to that URL.
 *      The form picks it up at build time and POSTs JSON instead of
 *      falling back to `mailto:`.
 *
 *   --- Notes --------------------------------------------------------------
 *
 *   - Honeypot: any submission with a non-empty `_gotcha` is silently
 *     accepted (200) so bots think they won; nothing is sent.
 *   - Rate-limit: not implemented here. Cloudflare has WAF rate rules,
 *     Vercel has middleware. Both are simpler than rolling your own.
 *   - This file is deliberately runtime-agnostic — it exports a `handler`
 *     that takes a Web `Request` and returns a `Response`. Wrap to suit
 *     your platform.
 */

// @ts-expect-error - Resend is installed in the deploy runtime, not in v2/.
import { Resend } from "resend";

interface ContactPayload {
  name?: string;
  email?: string;
  message?: string;
  _gotcha?: string;
}

const ALLOWED_HEADERS = "Content-Type, Accept";

function corsHeaders(origin: string | null, allowed: string): HeadersInit {
  // Allow only the exact configured origin. If unset, allow same-origin via
  // empty Origin (browsers omit Origin on same-origin POST).
  const ok = !origin || !allowed || origin === allowed;
  return {
    "Access-Control-Allow-Origin": ok ? origin || allowed : "null",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": ALLOWED_HEADERS,
    "Vary": "Origin",
  };
}

function htmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function handler(
  req: Request,
  env: {
    RESEND_API_KEY: string;
    CONTACT_TO: string;
    CONTACT_FROM: string;
    ALLOWED_ORIGIN?: string;
  }
): Promise<Response> {
  const origin = req.headers.get("Origin");
  const cors = corsHeaders(origin, env.ALLOWED_ORIGIN ?? "");

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors });
  }
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: cors });
  }

  let body: ContactPayload;
  try {
    body = (await req.json()) as ContactPayload;
  } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...cors },
    });
  }

  // Honeypot — accept silently, send nothing.
  if (body._gotcha) {
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...cors },
    });
  }

  const name = (body.name ?? "").trim();
  const email = (body.email ?? "").trim();
  const message = (body.message ?? "").trim();

  if (!name || !email || !message) {
    return new Response(JSON.stringify({ error: "missing_fields" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...cors },
    });
  }
  // Crude email shape check; full RFC 5322 parsing isn't worth the bytes.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return new Response(JSON.stringify({ error: "invalid_email" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...cors },
    });
  }

  const resend = new Resend(env.RESEND_API_KEY);
  const subject = `Contact form — ${name}`;
  const html = `
    <h2>New contact via abhinav00711.github.io/abhinavrathi</h2>
    <p><strong>From:</strong> ${htmlEscape(name)} &lt;${htmlEscape(email)}&gt;</p>
    <pre style="white-space: pre-wrap; font: 14px/1.5 ui-monospace, monospace;">${htmlEscape(
      message
    )}</pre>
  `;

  try {
    await resend.emails.send({
      from: env.CONTACT_FROM,
      to: env.CONTACT_TO,
      reply_to: email,
      subject,
      html,
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "send_failed" }), {
      status: 502,
      headers: { "Content-Type": "application/json", ...cors },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json", ...cors },
  });
}

// --- Cloudflare Worker shim ------------------------------------------------
// If deploying to a Cloudflare Worker, uncomment the export below and remove
// the `handler` import on the consumer side; CF passes `env` as the second
// argument to `fetch`. For Vercel functions, wrap `handler` in their adapter
// instead — both runtimes support the Web Request/Response API directly.
//
// export default {
//   fetch: (req: Request, env: any) => handler(req, env),
// };
