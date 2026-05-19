/**
 * Daily analytics report for number-flow-react-native.
 * Aggregates npm downloads, GitHub stats, and PostHog docs analytics,
 * then sends a Telegram digest. Runs as a standalone Bun script in CI.
 *
 * Optional env:
 *   ANALYTICS_GITHUB_TOKEN — PAT with repo scope for traffic endpoints (recommended in CI).
 *   DRY_RUN=1 — print the report to stdout instead of sending Telegram.
 */

const PACKAGE_NAME = "number-flow-react-native";
const REPO = "Rednegniw/number-flow-react-native";
const DOCS_HOST = "number-flow-react-native.awingender.com";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const GITHUB_TOKEN = process.env.ANALYTICS_GITHUB_TOKEN || process.env.GITHUB_TOKEN;
const POSTHOG_API_KEY = process.env.POSTHOG_PERSONAL_API_KEY;
const POSTHOG_PROJECT_ID = process.env.POSTHOG_PROJECT_ID;
const SNAPSHOT_PATH = process.env.SNAPSHOT_PATH ?? "/tmp/analytics-snapshot.json";
const DRY_RUN = process.env.DRY_RUN === "1";

// ── Types ────────────────────────────────────────────────────────────────────

interface NpmData {
  downloadsYesterday: number;
  downloadsWeek: number;
  downloadsMonth: number;
}

interface GitHubRepoData {
  stars: number;
  forks: number;
  openIssues: number;
}

interface GitHubTrafficData {
  views14d: number;
  viewsUnique14d: number;
  viewsYesterday: number;
  viewsUniqueYesterday: number;
  clones14d: number;
  clonesUnique14d: number;
  referrers: { name: string; count: number; uniques: number }[];
}

interface PostHogData {
  pageviews24h: number;
  pageviews7d: number;
  visitors24h: number;
  visitors7d: number;
  topPages: { path: string; views: number }[];
}

interface Snapshot {
  date: string;
  stars: number;
  npmDownloadsMonth: number;
  npmDownloadsWeek: number;
}

// ── HTTP helpers ─────────────────────────────────────────────────────────────

async function fetchJson(url: string, init?: RequestInit): Promise<unknown> {
  const res = await fetch(url, init);
  const body: unknown = await res.json();

  if (!res.ok) {
    const message =
      typeof body === "object" && body !== null && "message" in body
        ? String((body as { message: string }).message)
        : res.statusText;
    throw new Error(`${res.status} ${message}`);
  }

  return body;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseReferrers(data: unknown): GitHubTrafficData["referrers"] {
  if (!Array.isArray(data)) return [];

  return data.slice(0, 5).flatMap((entry) => {
    if (!isRecord(entry)) return [];
    const name = entry.referrer;
    const count = entry.count;
    const uniques = entry.uniques;
    if (typeof name !== "string" || typeof count !== "number" || typeof uniques !== "number") {
      return [];
    }
    return [{ name, count, uniques }];
  });
}

function latestTrafficDay(days: unknown): { count: number; uniques: number } | null {
  if (!Array.isArray(days) || days.length === 0) return null;

  const last = days[days.length - 1];
  if (!isRecord(last)) return null;

  const count = last.count;
  const uniques = last.uniques;
  if (typeof count !== "number" || typeof uniques !== "number") return null;

  return { count, uniques };
}

// ── Fetchers ─────────────────────────────────────────────────────────────────

async function fetchNpmData(): Promise<NpmData | null> {
  try {
    const base = "https://api.npmjs.org/downloads/point";
    const [yesterday, week, month] = await Promise.all([
      fetchJson(`${base}/last-day/${PACKAGE_NAME}`),
      fetchJson(`${base}/last-week/${PACKAGE_NAME}`),
      fetchJson(`${base}/last-month/${PACKAGE_NAME}`),
    ]);

    return {
      downloadsYesterday: isRecord(yesterday) ? Number(yesterday.downloads ?? 0) : 0,
      downloadsWeek: isRecord(week) ? Number(week.downloads ?? 0) : 0,
      downloadsMonth: isRecord(month) ? Number(month.downloads ?? 0) : 0,
    };
  } catch (e) {
    console.error("npm fetch failed:", e);
    return null;
  }
}

async function fetchGitHubRepo(): Promise<GitHubRepoData | null> {
  if (!GITHUB_TOKEN) {
    console.error("GitHub token missing");
    return null;
  }

  try {
    const headers = {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    };
    const repo = await fetchJson(`https://api.github.com/repos/${REPO}`, { headers });

    if (!isRecord(repo)) return null;

    return {
      stars: Number(repo.stargazers_count ?? 0),
      forks: Number(repo.forks_count ?? 0),
      openIssues: Number(repo.open_issues_count ?? 0),
    };
  } catch (e) {
    console.error("GitHub repo fetch failed:", e);
    return null;
  }
}

async function fetchGitHubTraffic(): Promise<GitHubTrafficData | null> {
  if (!GITHUB_TOKEN) return null;

  const headers = {
    Authorization: `Bearer ${GITHUB_TOKEN}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  const base = `https://api.github.com/repos/${REPO}/traffic`;

  let viewsBody: unknown;
  let clonesBody: unknown;
  let referrersBody: unknown;

  try {
    viewsBody = await fetchJson(`${base}/views`, { headers });
  } catch (e) {
    console.warn("GitHub views fetch failed:", e);
  }

  try {
    clonesBody = await fetchJson(`${base}/clones`, { headers });
  } catch (e) {
    console.warn("GitHub clones fetch failed:", e);
  }

  try {
    referrersBody = await fetchJson(`${base}/popular/referrers`, { headers });
  } catch (e) {
    console.warn("GitHub referrers fetch failed:", e);
  }

  if (!isRecord(viewsBody) && !isRecord(clonesBody) && parseReferrers(referrersBody).length === 0) {
    console.error(
      "GitHub traffic unavailable. Set ANALYTICS_GITHUB_TOKEN (repo-scoped PAT) in Actions secrets.",
    );
    return null;
  }

  const viewsYesterday = latestTrafficDay(isRecord(viewsBody) ? viewsBody.views : null);
  const clones = isRecord(clonesBody) ? clonesBody : null;

  return {
    views14d: isRecord(viewsBody) ? Number(viewsBody.count ?? 0) : 0,
    viewsUnique14d: isRecord(viewsBody) ? Number(viewsBody.uniques ?? 0) : 0,
    viewsYesterday: viewsYesterday?.count ?? 0,
    viewsUniqueYesterday: viewsYesterday?.uniques ?? 0,
    clones14d: clones ? Number(clones.count ?? 0) : 0,
    clonesUnique14d: clones ? Number(clones.uniques ?? 0) : 0,
    referrers: parseReferrers(referrersBody),
  };
}

function parsePostHogResults(data: unknown): unknown[][] {
  if (!isRecord(data)) return [];

  if (typeof data.detail === "string") {
    console.error("PostHog query error:", data.detail);
    return [];
  }

  if (data.error != null) {
    console.error("PostHog query error:", JSON.stringify(data.error));
    return [];
  }

  const results = data.results;
  if (!Array.isArray(results)) {
    console.error("PostHog response missing results:", JSON.stringify(data));
    return [];
  }

  return results as unknown[][];
}

async function fetchPostHogData(): Promise<PostHogData | null> {
  if (!POSTHOG_API_KEY || !POSTHOG_PROJECT_ID) {
    console.warn("PostHog secrets missing (POSTHOG_PERSONAL_API_KEY, POSTHOG_PROJECT_ID)");
    return null;
  }

  const hostFilter = `
    AND (
      properties.$host = '${DOCS_HOST}'
      OR properties.$current_url LIKE '%${DOCS_HOST}%'
    )
    AND properties.$host NOT IN ('localhost', '127.0.0.1')
  `;

  const statsQuery = `
    SELECT
      countIf(timestamp >= now() - INTERVAL 1 DAY) AS pageviews_24h,
      countIf(timestamp >= now() - INTERVAL 7 DAY) AS pageviews_7d,
      uniqIf(distinct_id, timestamp >= now() - INTERVAL 1 DAY) AS visitors_24h,
      uniqIf(distinct_id, timestamp >= now() - INTERVAL 7 DAY) AS visitors_7d
    FROM events
    WHERE event = '$pageview'
      ${hostFilter}
  `;

  const topPagesQuery = `
    SELECT
      coalesce(nullIf(properties.$pathname, ''), '/') AS path,
      count() AS views
    FROM events
    WHERE event = '$pageview'
      AND timestamp >= now() - INTERVAL 7 DAY
      ${hostFilter}
    GROUP BY path
    ORDER BY views DESC
    LIMIT 5
  `;

  try {
    const url = `https://us.posthog.com/api/projects/${POSTHOG_PROJECT_ID}/query/`;
    const headers = {
      Authorization: `Bearer ${POSTHOG_API_KEY}`,
      "Content-Type": "application/json",
    };
    const bodyFor = (query: string) => JSON.stringify({ query: { kind: "HogQLQuery", query } });

    const [statsRes, pagesRes] = await Promise.all([
      fetchJson(url, { method: "POST", headers, body: bodyFor(statsQuery) }),
      fetchJson(url, { method: "POST", headers, body: bodyFor(topPagesQuery) }),
    ]);

    const statsRows = parsePostHogResults(statsRes);
    const pageRows = parsePostHogResults(pagesRes);

    if (statsRows.length === 0) return null;

    const s = statsRows[0] ?? [];

    const topPages = pageRows.flatMap((row) => {
      const path = row[0];
      const views = row[1];
      if (typeof path !== "string" || typeof views !== "number") return [];
      return [{ path, views }];
    });

    return {
      pageviews24h: Number(s[0] ?? 0),
      pageviews7d: Number(s[1] ?? 0),
      visitors24h: Number(s[2] ?? 0),
      visitors7d: Number(s[3] ?? 0),
      topPages,
    };
  } catch (e) {
    console.error("PostHog fetch failed:", e);
    return null;
  }
}

// ── Snapshot ─────────────────────────────────────────────────────────────────

function loadSnapshot(): Snapshot | null {
  try {
    const text = require("node:fs").readFileSync(SNAPSHOT_PATH, "utf-8");
    return JSON.parse(text) as Snapshot;
  } catch {
    return null;
  }
}

function saveSnapshot(snap: Snapshot): void {
  require("node:fs").writeFileSync(SNAPSHOT_PATH, JSON.stringify(snap, null, 2));
}

// ── Formatting ───────────────────────────────────────────────────────────────

function esc(text: string): string {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, "\\$&");
}

function num(n: number): string {
  return esc(n.toLocaleString("en-US"));
}

function delta(current: number, previous: number | undefined): string {
  if (previous === undefined) return "";
  const diff = current - previous;
  if (diff === 0) return "";
  const sign = diff > 0 ? "+" : "";
  return ` \\(${esc(sign + diff.toLocaleString("en-US"))}\\)`;
}

function formatMessage(
  npm: NpmData | null,
  repo: GitHubRepoData | null,
  traffic: GitHubTrafficData | null,
  ph: PostHogData | null,
  prev: Snapshot | null,
): string {
  const today = new Date().toISOString().slice(0, 10);
  const lines: string[] = [];

  lines.push(esc("📊 number-flow-react-native"));
  lines.push(esc(`Daily Analytics Report - ${today}`));
  lines.push("");

  lines.push(esc("📦 npm Downloads"));
  if (npm) {
    lines.push(`  Yesterday: ${num(npm.downloadsYesterday)}`);
    lines.push(
      `  Last 7 days: ${num(npm.downloadsWeek)}${delta(npm.downloadsWeek, prev?.npmDownloadsWeek)}`,
    );
    lines.push(
      `  Last 30 days: ${num(npm.downloadsMonth)}${delta(npm.downloadsMonth, prev?.npmDownloadsMonth)}`,
    );
  } else {
    lines.push(`  ${esc("unavailable")}`);
  }
  lines.push("");

  lines.push(esc("⭐ GitHub"));
  if (repo) {
    lines.push(`  Stars: ${num(repo.stars)}${delta(repo.stars, prev?.stars)}`);
    lines.push(`  Forks: ${num(repo.forks)}`);
    lines.push(`  Open issues: ${num(repo.openIssues)}`);
  } else {
    lines.push(`  ${esc("repo stats unavailable")}`);
  }

  if (traffic) {
    lines.push(
      `  Views yesterday: ${num(traffic.viewsYesterday)} \\(${num(traffic.viewsUniqueYesterday)} unique\\)`,
    );
    lines.push(
      `  Views \\(14d\\): ${num(traffic.views14d)} \\(${num(traffic.viewsUnique14d)} unique\\)`,
    );
    lines.push(
      `  Clones \\(14d\\): ${num(traffic.clones14d)} \\(${num(traffic.clonesUnique14d)} unique\\)`,
    );

    if (traffic.referrers.length > 0) {
      lines.push(`  Top referrers \\(14d\\):`);
      for (const r of traffic.referrers) {
        lines.push(`    \\- ${esc(r.name)}: ${num(r.count)} \\(${num(r.uniques)} unique\\)`);
      }
    }
  } else if (repo) {
    lines.push(`  ${esc("traffic unavailable (set ANALYTICS_GITHUB_TOKEN)")}`);
  }
  lines.push("");

  lines.push(esc("📖 Docs Site"));
  if (ph) {
    lines.push(`  Page views \\(24h\\): ${num(ph.pageviews24h)}`);
    lines.push(`  Page views \\(7d\\): ${num(ph.pageviews7d)}`);
    lines.push(`  Visitors \\(24h\\): ${num(ph.visitors24h)}`);
    lines.push(`  Visitors \\(7d\\): ${num(ph.visitors7d)}`);

    if (ph.topPages.length > 0) {
      lines.push(`  Top pages \\(7d\\):`);
      for (const p of ph.topPages) {
        lines.push(`    \\- ${esc(p.path)}: ${num(p.views)}`);
      }
    }
  } else {
    lines.push(`  ${esc("unavailable (check PostHog secrets / query)")}`);
  }

  return lines.join("\n");
}

// ── Telegram ─────────────────────────────────────────────────────────────────

async function sendTelegram(text: string): Promise<void> {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    throw new Error("TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID are required");
  }

  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text,
      parse_mode: "MarkdownV2",
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Telegram send failed (${res.status}): ${body}`);
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const prev = loadSnapshot();

  const [npm, repo, traffic, ph] = await Promise.all([
    fetchNpmData(),
    fetchGitHubRepo(),
    fetchGitHubTraffic(),
    fetchPostHogData(),
  ]);

  const message = formatMessage(npm, repo, traffic, ph, prev);

  if (DRY_RUN) {
    console.log(message);
  } else {
    await sendTelegram(message);
    console.log("Telegram message sent successfully.");
  }

  const snap: Snapshot = {
    date: new Date().toISOString().slice(0, 10),
    stars: repo?.stars ?? prev?.stars ?? 0,
    npmDownloadsMonth: npm?.downloadsMonth ?? prev?.npmDownloadsMonth ?? 0,
    npmDownloadsWeek: npm?.downloadsWeek ?? prev?.npmDownloadsWeek ?? 0,
  };
  saveSnapshot(snap);
  console.log("Snapshot saved to", SNAPSHOT_PATH);
}

main().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
