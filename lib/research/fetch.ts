/**
 * Allowlisted source hosts + robots.txt respect for research fetches.
 */

const DEFAULT_ALLOWLIST = [
  "www.fbi.gov",
  "api.fbi.gov",
  "www.justice.gov",
  "www.cia.gov",
  "www.archives.gov",
  "www.congress.gov",
  "www.un.org",
  "www.icc-cpi.int",
  "www.stl-tsl.org",
  "www.reuters.com",
  "apnews.com",
  "www.bbc.com",
  "www.bbc.co.uk",
  "en.wikipedia.org",
];

export function getSourceAllowlist(): string[] {
  const extra = process.env.RESEARCH_SOURCE_ALLOWLIST?.split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return [...new Set([...DEFAULT_ALLOWLIST, ...(extra ?? [])])];
}

export function isUrlAllowlisted(rawUrl: string): boolean {
  try {
    const u = new URL(rawUrl);
    if (u.protocol !== "https:" && u.protocol !== "http:") return false;
    const host = u.hostname.toLowerCase();
    return getSourceAllowlist().some(
      (allowed) => host === allowed || host.endsWith(`.${allowed}`),
    );
  } catch {
    return false;
  }
}

const robotsCache = new Map<string, { fetchedAt: number; disallows: string[] }>();

async function loadRobots(origin: string): Promise<string[]> {
  const cached = robotsCache.get(origin);
  if (cached && Date.now() - cached.fetchedAt < 60 * 60 * 1000) {
    return cached.disallows;
  }
  try {
    const res = await fetch(`${origin}/robots.txt`, {
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) {
      robotsCache.set(origin, { fetchedAt: Date.now(), disallows: [] });
      return [];
    }
    const text = await res.text();
    const disallows: string[] = [];
    let applies = false;
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (/^user-agent:\s*\*/i.test(trimmed)) {
        applies = true;
        continue;
      }
      if (/^user-agent:/i.test(trimmed)) {
        applies = false;
        continue;
      }
      if (applies) {
        const m = trimmed.match(/^disallow:\s*(.*)$/i);
        if (m) disallows.push(m[1].trim());
      }
    }
    robotsCache.set(origin, { fetchedAt: Date.now(), disallows });
    return disallows;
  } catch {
    robotsCache.set(origin, { fetchedAt: Date.now(), disallows: [] });
    return [];
  }
}

export async function isAllowedByRobots(rawUrl: string): Promise<boolean> {
  try {
    const u = new URL(rawUrl);
    const disallows = await loadRobots(u.origin);
    const path = u.pathname || "/";
    for (const rule of disallows) {
      if (!rule) continue; // empty Disallow = allow all
      if (rule === "/") return false;
      if (path.startsWith(rule)) return false;
    }
    return true;
  } catch {
    return false;
  }
}

export async function fetchAllowlistedPage(
  rawUrl: string,
): Promise<{ ok: true; url: string; text: string } | { ok: false; reason: string }> {
  if (!isUrlAllowlisted(rawUrl)) {
    return { ok: false, reason: "host_not_allowlisted" };
  }
  if (!(await isAllowedByRobots(rawUrl))) {
    return { ok: false, reason: "robots_disallow" };
  }
  try {
    const res = await fetch(rawUrl, {
      signal: AbortSignal.timeout(15_000),
      headers: {
        "User-Agent":
          process.env.RESEARCH_USER_AGENT ||
          "DETECTIVE-CASE-NET-ResearchBot/1.0",
        Accept: "text/html,application/xhtml+xml,application/json,text/plain",
      },
      redirect: "follow",
    });
    if (!res.ok) return { ok: false, reason: `http_${res.status}` };
    const finalUrl = res.url;
    if (!isUrlAllowlisted(finalUrl)) {
      return { ok: false, reason: "redirect_not_allowlisted" };
    }
    const text = (await res.text()).slice(0, 120_000);
    return { ok: true, url: finalUrl, text };
  } catch {
    return { ok: false, reason: "fetch_failed" };
  }
}

/**
 * Strip obvious prompt-injection payloads from fetched page text before LLM.
 */
export function sanitizeFetchedText(text: string): string {
  return text
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(
      /(?:ignore|disregard)\s+(?:all\s+)?(?:previous|prior)\s+instructions?/gi,
      "[filtered]",
    )
    .replace(/system\s*:\s*/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 40_000);
}
