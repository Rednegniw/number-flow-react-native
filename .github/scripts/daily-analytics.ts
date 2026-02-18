/**
 * Daily analytics report for number-flow-react-native.
 * Aggregates npm downloads, GitHub stats, and PostHog docs analytics,
 * then sends a Telegram digest. Runs as a standalone Bun script in CI.
 */

const PACKAGE_NAME = "number-flow-react-native";
const REPO = "Rednegniw/number-flow-react-native";

// ── Environment ──────────────────────────────────────────────────────────────

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID!;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN!;
const POSTHOG_API_KEY = process.env.POSTHOG_PERSONAL_API_KEY;
const POSTHOG_PROJECT_ID = process.env.POSTHOG_PROJECT_ID;
const SNAPSHOT_PATH = process.env.SNAPSHOT_PATH ?? "/tmp/analytics-snapshot.json";

// ── Types ────────────────────────────────────────────────────────────────────

interface NpmData {
  downloadsDay: number;
  downloadsWeek: number;
  downloadsMonth: number;
}

interface GitHubData {
  stars: number;
  forks: number;
  openIssues: number;
  views: number;
  viewsUnique: number;
  clones: number;
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
}

// ── Fetchers ─────────────────────────────────────────────────────────────────

async function fetchNpmData(): Promise<NpmData | null> {
  try {
    const base = "https://api.npmjs.org/downloads/point";
    const [day, week, month] = await Promise.all([
      fetch(`${base}/last-day/${PACKAGE_NAME}`).then((r) => r.json()),
      fetch(`${base}/last-week/${PACKAGE_NAME}`).then((r) => r.json()),
      fetch(`${base}/last-month/${PACKAGE_NAME}`).then((r) => r.json()),
    ]);

    return {
      downloadsDay: day.downloads ?? 0,
      downloadsWeek: week.downloads ?? 0,
      downloadsMonth: month.downloads ?? 0,
    };
  } catch (e) {
    console.error("npm fetch failed:", e);
    return null;
  }
}

async function fetchGitHubData(): Promise<GitHubData | null> {
  try {
    const headers = { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: "application/json" };

    const [repo, views, clones, referrers] = await Promise.all([
      fetch(`https://api.github.com/repos/${REPO}`, { headers }).then((r) => r.json()),
      fetch(`https://api.github.com/repos/${REPO}/traffic/views`, { headers }).then((r) =>
        r.json(),
      ),
      fetch(`https://api.github.com/repos/${REPO}/traffic/clones`, { headers }).then((r) =>
        r.json(),
      ),
      fetch(`https://api.github.com/repos/${REPO}/traffic/popular/referrers`, { headers }).then(
        (r) => r.json(),
      ),
    ]);

    return {
      stars: repo.stargazers_count ?? 0,
      forks: repo.forks_count ?? 0,
      openIssues: repo.open_issues_count ?? 0,
      views: views.count ?? 0,
      viewsUnique: views.uniques ?? 0,
      clones: clones.count ?? 0,
      referrers: (referrers ?? []).slice(0, 5).map((r: Record<string, unknown>) => ({
        name: r.referrer as string,
        count: r.count as number,
        uniques: r.uniques as number,
      })),
    };
  } catch (e) {
    console.error("GitHub fetch failed:", e);
    return null;
  }
}

async function fetchPostHogData(): Promise<PostHogData | null> {
  if (!POSTHOG_API_KEY || !POSTHOG_PROJECT_ID) return null;

  try {
    const url = `https://us.posthog.com/api/projects/${POSTHOG_PROJECT_ID}/query/`;
    const headers = {
      Authorization: `Bearer ${POSTHOG_API_KEY}`,
      "Content-Type": "application/json",
    };

    const statsQuery = `
      SELECT
        countIf(timestamp >= now() - INTERVAL 1 DAY) as pageviews_24h,
        countIf(timestamp >= now() - INTERVAL 7 DAY) as pageviews_7d,
        uniqIf(distinct_id, timestamp >= now() - INTERVAL 1 DAY) as visitors_24h,
        uniqIf(distinct_id, timestamp >= now() - INTERVAL 7 DAY) as visitors_7d
      FROM events
      WHERE event = '$pageview'
    `;

    const topPagesQuery = `
      SELECT
        properties.$current_url as url,
        count() as views
      FROM events
      WHERE event = '$pageview'
        AND timestamp >= now() - INTERVAL 7 DAY
      GROUP BY url
      ORDER BY views DESC
      LIMIT 5
    `;

    const [statsRes, pagesRes] = await Promise.all([
      fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({ query: { kind: "HogQLQuery", query: statsQuery } }),
      }).then((r) => r.json()),
      fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({ query: { kind: "HogQLQuery", query: topPagesQuery } }),
      }).then((r) => r.json()),
    ]);

    const s = statsRes.results?.[0] ?? [0, 0, 0, 0];

    const topPages = (pagesRes.results ?? []).map((row: [string, number]) => {
      const fullUrl = row[0] ?? "";
      const path = fullUrl.replace(/^https?:\/\/[^/]+/, "") || "/";
      return { path, views: row[1] };
    });

    return {
      pageviews24h: s[0],
      pageviews7d: s[1],
      visitors24h: s[2],
      visitors7d: s[3],
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
  gh: GitHubData | null,
  ph: PostHogData | null,
  prev: Snapshot | null,
): string {
  const today = new Date().toISOString().slice(0, 10);
  const lines: string[] = [];

  lines.push(esc("📊 number-flow-react-native"));
  lines.push(esc(`Daily Analytics Report - ${today}`));
  lines.push("");

  // npm
  lines.push(esc("📦 npm Downloads"));
  if (npm) {
    lines.push(`  Today: ${num(npm.downloadsDay)}`);
    lines.push(`  This week: ${num(npm.downloadsWeek)}`);
    lines.push(
      `  This month: ${num(npm.downloadsMonth)}${delta(npm.downloadsMonth, prev?.npmDownloadsMonth)}`,
    );
  } else {
    lines.push(`  ${esc("unavailable")}`);
  }
  lines.push("");

  // GitHub
  lines.push(esc("⭐ GitHub"));
  if (gh) {
    lines.push(`  Stars: ${num(gh.stars)}${delta(gh.stars, prev?.stars)}`);
    lines.push(`  Forks: ${num(gh.forks)}`);
    lines.push(`  Open issues: ${num(gh.openIssues)}`);
    lines.push(`  Views \\(14d\\): ${num(gh.views)} \\(${num(gh.viewsUnique)} unique\\)`);
    lines.push(`  Clones \\(14d\\): ${num(gh.clones)}`);

    if (gh.referrers.length > 0) {
      lines.push(`  Top referrers:`);
      for (const r of gh.referrers) {
        lines.push(`    \\- ${esc(r.name)}: ${num(r.count)} \\(${num(r.uniques)} unique\\)`);
      }
    }
  } else {
    lines.push(`  ${esc("unavailable")}`);
  }
  lines.push("");

  // PostHog
  if (ph) {
    lines.push(esc("📖 Docs Site"));
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
  }

  return lines.join("\n");
}

// ── Telegram ─────────────────────────────────────────────────────────────────

async function sendTelegram(text: string): Promise<void> {
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

  const [npm, gh, ph] = await Promise.all([fetchNpmData(), fetchGitHubData(), fetchPostHogData()]);

  const message = formatMessage(npm, gh, ph, prev);
  await sendTelegram(message);
  console.log("Telegram message sent successfully.");

  // Save snapshot for next run's delta calculations
  const snap: Snapshot = {
    date: new Date().toISOString().slice(0, 10),
    stars: gh?.stars ?? prev?.stars ?? 0,
    npmDownloadsMonth: npm?.downloadsMonth ?? prev?.npmDownloadsMonth ?? 0,
  };
  saveSnapshot(snap);
  console.log("Snapshot saved to", SNAPSHOT_PATH);
}

main().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
