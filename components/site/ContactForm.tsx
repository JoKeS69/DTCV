"use client";

import { useState, type FormEvent } from "react";
import { BUDGET_OPTIONS, PROJECT_TYPE_OPTIONS, type ContactErrorResponse } from "@/types/contact";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type FieldErrors = {
  name?: string;
  email?: string;
  budget?: string;
  type?: string;
  message?: string;
};

export function ContactForm() {
  const [errors, setErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState("");
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [status, setStatus] = useState("");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSuccess(false);
    setServerError("");

    const form = e.currentTarget;
    const data = new FormData(form);
    const name = String(data.get("name") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const company = String(data.get("company") ?? "").trim();
    const budget = String(data.get("budget") ?? "");
    const type = String(data.get("type") ?? "");
    const message = String(data.get("message") ?? "").trim();
    const website = String(data.get("website") ?? "");

    const next: FieldErrors = {};
    if (!name) next.name = "Enter your name.";
    if (!EMAIL_PATTERN.test(email)) next.email = "Enter a valid email.";
    if (!budget) next.budget = "Select a budget range.";
    if (!type) next.type = "Select a project type.";
    if (message.length < 10) next.message = "Say a bit more about the project (10+ characters).";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSending(true);
    setStatus("Sending…");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, company, budget, type, message, website }),
      });

      const json = (await res.json()) as ContactErrorResponse | { ok: true };

      if (res.ok && json.ok) {
        setStatus("");
        setSuccess(true);
        form.reset();
        setErrors({});
        return;
      }

      const err = json as ContactErrorResponse;
      if (err.fieldErrors) {
        setErrors({
          name: err.fieldErrors.name,
          email: err.fieldErrors.email,
          budget: err.fieldErrors.budget,
          type: err.fieldErrors.type,
          message: err.fieldErrors.message,
        });
      }
      setServerError(err.error || "Something went wrong. Please try again.");
      setStatus("");
    } catch {
      setServerError("Network error. Check your connection and try again.");
      setStatus("");
    } finally {
      setSending(false);
    }
  }

  return (
    <form className="contact-form" onSubmit={onSubmit} noValidate>
      <div className="hp-field" aria-hidden="true">
        <label htmlFor="website">Website</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>
      <div className="row2">
        <div>
          <label htmlFor="name">Name</label>
          <input id="name" name="name" type="text" required />
          <div className="err-msg">{errors.name}</div>
        </div>
        <div>
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" required />
          <div className="err-msg">{errors.email}</div>
        </div>
      </div>
      <div className="row2">
        <div>
          <label htmlFor="company">Company (optional)</label>
          <input id="company" name="company" type="text" />
        </div>
        <div>
          <label htmlFor="budget">Budget range</label>
          <select id="budget" name="budget" required defaultValue="">
            <option value="">Select a range</option>
            {BUDGET_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
          <div className="err-msg">{errors.budget}</div>
        </div>
      </div>
      <div>
        <label htmlFor="type">Project type</label>
        <select id="type" name="type" required defaultValue="">
          <option value="">Select a type</option>
          {PROJECT_TYPE_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        <div className="err-msg">{errors.type}</div>
      </div>
      <div>
        <label htmlFor="message">Message</label>
        <textarea id="message" name="message" required />
        <div className="err-msg">{errors.message}</div>
      </div>
      {serverError ? <div className="form-error" role="alert">{serverError}</div> : null}
      <div className="submit-row">
        <button type="submit" className="submit-btn" disabled={sending}>
          Send message
        </button>
        <span style={{ fontSize: "0.8rem", color: "var(--text-2)" }}>{status}</span>
      </div>
      <div className={`success-box${success ? " show" : ""}`} role="status">
        Message received. I&apos;ll get back to you as soon as possible.
      </div>
    </form>
  );
}
