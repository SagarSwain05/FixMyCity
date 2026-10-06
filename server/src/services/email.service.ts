import { env } from "../config/env";

export function isEmailEnabled() {
  return !!(env.brevo.apiKey && env.brevo.senderEmail);
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export function renderEmail(title: string, message: string, ctaUrl?: string) {
  const cta = ctaUrl
    ? `<p style="margin:24px 0"><a href="${ctaUrl}" style="background:#16a34a;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">View your report</a></p>`
    : "";
  return `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#111">
  <h2 style="color:#16a34a;margin-bottom:4px">FixMyCity</h2>
  <h3 style="margin-top:0">${escapeHtml(title)}</h3>
  <p style="line-height:1.5">${escapeHtml(message)}</p>${cta}
  <p style="font-size:12px;color:#666">You receive this because you reported an issue on FixMyCity. Turn off emails from your profile settings.</p>
</div>`;
}

// Sends a transactional email through Brevo. Never throws: email is best effort.
export async function sendEmail(to: { email: string; name?: string }, subject: string, html: string) {
  if (!isEmailEnabled() || env.isTest) return false;
  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": env.brevo.apiKey, "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        sender: { email: env.brevo.senderEmail, name: env.brevo.senderName },
        to: [to],
        subject,
        htmlContent: html,
      }),
    });
    if (!res.ok) {
      console.error("[email] Brevo responded", res.status, await res.text());
      return false;
    }
    return true;
  } catch (e) {
    console.error("[email] send failed", (e as Error).message);
    return false;
  }
}
