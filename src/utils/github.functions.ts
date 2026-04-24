import { createServerFn } from "@tanstack/react-start";

/**
 * Lightweight GitHub fetch helpers, exposed as server functions so the
 * unauthenticated REST quota (60 req/h per IP) is consumed by the server,
 * not the client. Results are cached in module memory for 1 hour per user.
 */

type Profile = {
  login: string;
  name: string | null;
  bio: string | null;
  avatar_url: string;
  html_url: string;
  public_repos: number;
  followers: number;
  following: number;
  location: string | null;
  blog: string | null;
};

type Repo = {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  fork: boolean;
  archived: boolean;
  pushed_at: string;
};

type ContribDay = { date: string; count: number };

type GithubBundle = {
  ok: boolean;
  error?: string;
  fetchedAt: number;
  profile: Profile | null;
  repos: Repo[];
  totalStars: number;
  contributions: ContribDay[]; // last ~90 days actual; older days = 0
  contributionWindowDays: number;
};

const TTL_MS = 60 * 60 * 1000;
const cache = new Map<string, { at: number; data: GithubBundle }>();

async function gh<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`https://api.github.com${path}`, {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "lovable-portfolio",
      },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/**
 * Scrape the public contributions calendar from github.com.
 * This endpoint is unauthenticated and returns the last ~12 months of
 * contribution data as HTML containing <td data-date="..." data-level="..."> tiles.
 */
async function fetchContributionsHTML(username: string): Promise<ContribDay[] | null> {
  try {
    const res = await fetch(
      `https://github.com/users/${encodeURIComponent(username)}/contributions`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; lovable-portfolio/1.0; +https://lovable.dev)",
          Accept: "text/html",
        },
      },
    );
    if (!res.ok) return null;
    const html = await res.text();
    // GitHub renders one tile per day as either a <td> or <rect> with data-date and data-level.
    // We extract date + level (0..4). Counts are not always present in markup; we approximate
    // using the level as a relative bucket later.
    const re = /data-date="(\d{4}-\d{2}-\d{2})"[^>]*data-level="(\d)"/g;
    const out = new Map<string, number>();
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) !== null) {
      const date = m[1];
      const level = Math.max(0, Math.min(4, parseInt(m[2], 10) || 0));
      // Synthesize a count proportional to the level so existing bucket() math still works.
      // 0 -> 0, 1 -> 2, 2 -> 6, 3 -> 12, 4 -> 24
      const synth = level === 0 ? 0 : Math.round(2 * Math.pow(2, level - 1) + (level - 1));
      out.set(date, synth);
    }
    if (out.size === 0) return null;
    // Build a 365-day window ending today, in chronological order.
    const days: ContribDay[] = [];
    const today = new Date();
    for (let i = 364; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      days.push({ date: key, count: out.get(key) || 0 });
    }
    return days;
  } catch {
    return null;
  }
}

async function buildBundle(username: string): Promise<GithubBundle> {
  const profile = await gh<Profile>(`/users/${username}`);
  const repos =
    (await gh<Repo[]>(
      `/users/${username}/repos?per_page=100&sort=updated`,
    )) || [];
  const ownRepos = repos.filter((r) => !r.fork);
  const totalStars = ownRepos.reduce((s, r) => s + (r.stargazers_count || 0), 0);

  // Prefer the full 12-month calendar scraped from github.com.
  let contributions = await fetchContributionsHTML(username);
  let windowDays = 365;
  if (!contributions) {
    // Fallback: public events (last ~90 days of PushEvents) grouped by date.
    type Event = { type: string; created_at: string; payload?: { commits?: unknown[]; size?: number } };
    const events = (await gh<Event[]>(`/users/${username}/events/public?per_page=100`)) || [];
    const byDay = new Map<string, number>();
    for (const e of events) {
      if (e.type !== "PushEvent") continue;
      const day = (e.created_at || "").slice(0, 10);
      if (!day) continue;
      const n = e.payload?.size ?? e.payload?.commits?.length ?? 0;
      byDay.set(day, (byDay.get(day) || 0) + (n as number));
    }
    const list: ContribDay[] = [];
    const today = new Date();
    for (let i = 363; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      list.push({ date: key, count: byDay.get(key) || 0 });
    }
    contributions = list;
    windowDays = 90;
  }

  return {
    ok: !!profile,
    error: profile ? undefined : "Could not load profile",
    fetchedAt: Date.now(),
    profile,
    repos: ownRepos
      .sort((a, b) => b.stargazers_count - a.stargazers_count || +new Date(b.pushed_at) - +new Date(a.pushed_at))
      .slice(0, 12),
    totalStars,
    contributions,
    contributionWindowDays: windowDays,
  };
}

// Allow-list of usernames that can be fetched. Only the site owner is
// permitted, preventing this endpoint from being abused as an open relay
// against GitHub's unauthenticated rate limit (60 req/h per server IP).
const OWNER_USERNAMES = new Set(
  (process.env.GITHUB_OWNER_USERNAMES || "Farisatif")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean),
);

function assertAllowed(username: string) {
  if (!OWNER_USERNAMES.has(username.toLowerCase())) {
    throw new Error("Username not allowed");
  }
}

export const getGithubBundle = createServerFn({ method: "GET" })
  .inputValidator((input: { username: string }) => {
    if (!input || typeof input.username !== "string") throw new Error("Invalid input");
    if (!/^[A-Za-z0-9-]{1,39}$/.test(input.username)) throw new Error("Invalid username");
    return input;
  })
  .handler(async ({ data }) => {
    assertAllowed(data.username);
    const key = data.username.toLowerCase();
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < TTL_MS) return hit.data;
    const bundle = await buildBundle(data.username);
    cache.set(key, { at: bundle.fetchedAt, data: bundle });
    return bundle;
  });

export const refreshGithubBundle = createServerFn({ method: "POST" })
  .inputValidator((input: { username: string; password: string }) => {
    if (!input || typeof input.username !== "string" || typeof input.password !== "string") {
      throw new Error("Invalid input");
    }
    if (!/^[A-Za-z0-9-]{1,39}$/.test(input.username)) throw new Error("Invalid username");
    if (input.password.length > 200) throw new Error("Invalid input");
    return input;
  })
  .handler(async ({ data }) => {
    // Authenticate via admin password — this endpoint is admin-only (CMS).
    const { verifySettingsPassword } = await import("./settings.functions");
    const auth = await verifySettingsPassword({ data: { password: data.password } });
    if (!auth.ok) throw new Error("Unauthorized");
    assertAllowed(data.username);
    const key = data.username.toLowerCase();
    cache.delete(key);
    const bundle = await buildBundle(data.username);
    cache.set(key, { at: bundle.fetchedAt, data: bundle });
    return bundle;
  });

export type { GithubBundle, Profile as GithubProfile, Repo as GithubRepo, ContribDay };