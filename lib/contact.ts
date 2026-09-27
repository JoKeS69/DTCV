import {
  BUDGET_OPTIONS,
  PROJECT_TYPE_OPTIONS,
  type ContactErrorResponse,
  type ContactPayload,
} from "@/types/contact";
import { sanitizeText } from "@/lib/sanitize";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type ValidatedContact = {
  name: string;
  email: string;
  company: string;
  budget: (typeof BUDGET_OPTIONS)[number];
  type: (typeof PROJECT_TYPE_OPTIONS)[number];
  message: string;
};

export function parseContactBody(raw: unknown): ContactPayload | null {
  if (!raw || typeof raw !== "object") return null;
  const body = raw as Record<string, unknown>;
  return {
    name: typeof body.name === "string" ? body.name : "",
    email: typeof body.email === "string" ? body.email : "",
    company: typeof body.company === "string" ? body.company : "",
    budget: typeof body.budget === "string" ? body.budget : "",
    type: typeof body.type === "string" ? body.type : "",
    message: typeof body.message === "string" ? body.message : "",
    website: typeof body.website === "string" ? body.website : "",
  };
}

export function validateContact(
  payload: ContactPayload,
): { ok: true; data: ValidatedContact } | { ok: false; response: ContactErrorResponse } {
  const fieldErrors: NonNullable<ContactErrorResponse["fieldErrors"]> = {};

  const name = sanitizeText(payload.name, 120);
  const emailRaw = typeof payload.email === "string" ? payload.email.trim().slice(0, 254) : "";
  const company = sanitizeText(payload.company, 160);
  const budgetRaw = typeof payload.budget === "string" ? payload.budget.trim() : "";
  const typeRaw = typeof payload.type === "string" ? payload.type.trim() : "";
  const message = sanitizeText(payload.message, 5000);

  if (!name) fieldErrors.name = "Enter your name.";
  if (!EMAIL_PATTERN.test(emailRaw)) fieldErrors.email = "Enter a valid email.";
  if (!BUDGET_OPTIONS.includes(budgetRaw as (typeof BUDGET_OPTIONS)[number])) {
    fieldErrors.budget = "Select a budget range.";
  }
  if (!PROJECT_TYPE_OPTIONS.includes(typeRaw as (typeof PROJECT_TYPE_OPTIONS)[number])) {
    fieldErrors.type = "Select a project type.";
  }
  if (message.length < 10) {
    fieldErrors.message = "Say a bit more about the project (10+ characters).";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      ok: false,
      response: {
        ok: false,
        error: "Please fix the highlighted fields and try again.",
        fieldErrors,
      },
    };
  }

  return {
    ok: true,
    data: {
      name,
      email: emailRaw.toLowerCase(),
      company,
      budget: budgetRaw as ValidatedContact["budget"],
      type: typeRaw as ValidatedContact["type"],
      message,
    },
  };
}

export function buildContactEmailHtml(data: ValidatedContact): string {
  const rows: Array<[string, string]> = [
    ["Name", data.name],
    ["Email", data.email],
    ["Company", data.company || "—"],
    ["Budget", data.budget],
    ["Project type", data.type],
    ["Message", data.message.replace(/\n/g, "<br />")],
  ];

  const body = rows
    .map(
      ([label, value]) => `
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid #28282e;color:#94939b;width:140px;vertical-align:top;font-size:13px;">${label}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #28282e;color:#f1f0ee;font-size:14px;">${value}</td>
        </tr>`,
    )
    .join("");

  return `
    <div style="background:#0a0a0c;padding:32px 16px;font-family:Inter,system-ui,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#131316;border:1px solid #28282e;border-radius:12px;overflow:hidden;">
        <tr>
          <td style="padding:20px 24px;border-bottom:1px solid #28282e;">
            <p style="margin:0;color:#c47a4a;font-size:12px;letter-spacing:0.04em;text-transform:uppercase;">New project inquiry</p>
            <h1 style="margin:8px 0 0;color:#f1f0ee;font-size:20px;font-weight:600;">${data.name}</h1>
          </td>
        </tr>
        ${body}
      </table>
    </div>
  `;
}
