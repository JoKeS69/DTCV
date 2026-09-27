import { NextResponse } from "next/server";
import { Resend } from "resend";
import { buildContactEmailHtml, parseContactBody, validateContact } from "@/lib/contact";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { escapeHtml } from "@/lib/sanitize";
import type { ContactErrorResponse, ContactSuccessResponse } from "@/types/contact";

/**
 * Transactional mail via Resend (preferred over Nodemailer + a Gmail App Password):
 * Gmail SMTP is easy to set up but the sending account can be flagged as spam
 * and App Passwords are tied to a personal inbox. Resend is built for this
 * workload and keeps credentials off a consumer mailbox.
 */
export async function POST(request: Request) {
  const ip = clientIp(request.headers);
  const limited = rateLimit(`contact:${ip}`);
  if (!limited.ok) {
    const body: ContactErrorResponse = {
      ok: false,
      error: "Too many messages from this network. Please wait and try again.",
    };
    return NextResponse.json(body, {
      status: 429,
      headers: { "Retry-After": String(limited.retryAfterSec) },
    });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    const body: ContactErrorResponse = { ok: false, error: "Request body must be JSON." };
    return NextResponse.json(body, { status: 400 });
  }

  const payload = parseContactBody(json);
  if (!payload) {
    const body: ContactErrorResponse = { ok: false, error: "Invalid form payload." };
    return NextResponse.json(body, { status: 400 });
  }

  if (payload.website && payload.website.trim().length > 0) {
    const body: ContactSuccessResponse = { ok: true };
    return NextResponse.json(body, { status: 200 });
  }

  const validated = validateContact(payload);
  if (!validated.ok) {
    return NextResponse.json(validated.response, { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_EMAIL;
  const from = process.env.RESEND_FROM ?? "Portfolio <onboarding@resend.dev>";

  if (!apiKey || !to) {
    const missing = [!apiKey ? "RESEND_API_KEY" : null, !to ? "CONTACT_EMAIL" : null]
      .filter((x): x is string => Boolean(x))
      .join(" and ");
    const body: ContactErrorResponse = {
      ok: false,
      error: `Contact form is not configured. Missing ${missing}.`,
    };
    return NextResponse.json(body, { status: 500 });
  }

  const resend = new Resend(apiKey);
  const subject = `New project inquiry from ${validated.data.name}`;
  const html = buildContactEmailHtml({
    ...validated.data,
    email: escapeHtml(validated.data.email),
  });

  try {
    const { error } = await resend.emails.send({
      from,
      to: [to],
      replyTo: validated.data.email,
      subject,
      html,
    });

    if (error) {
      const body: ContactErrorResponse = {
        ok: false,
        error: "Could not send the message. Please try again in a few minutes.",
      };
      return NextResponse.json(body, { status: 502 });
    }
  } catch {
    const body: ContactErrorResponse = {
      ok: false,
      error: "Could not send the message. Please try again in a few minutes.",
    };
    return NextResponse.json(body, { status: 502 });
  }

  const body: ContactSuccessResponse = { ok: true };
  return NextResponse.json(body, { status: 200 });
}
