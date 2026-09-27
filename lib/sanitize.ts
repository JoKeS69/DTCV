/** Strip tags and escape HTML so form values cannot inject markup into email bodies. */
export function sanitizeText(input: unknown, maxLength = 4000): string {
  if (typeof input !== "string") return "";
  const withoutTags = input.replace(/<[^>]*>/g, "");
  const collapsed = withoutTags.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
  return escapeHtml(collapsed).slice(0, maxLength).trim();
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
