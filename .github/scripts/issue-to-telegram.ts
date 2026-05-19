/**
 * Sends a GitHub issue notification to Telegram.
 * Triggered by the issue-telegram workflow on issues opened/reopened.
 */

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const REPO = process.env.GITHUB_REPOSITORY ?? "Rednegniw/number-flow-react-native";
const EVENT_PATH = process.env.GITHUB_EVENT_PATH;

const SUMMARY_MAX_LENGTH = 600;

interface IssuePayload {
  number: number;
  title: string;
  html_url: string;
  user: { login: string } | null;
  body: string | null;
  labels: { name: string }[];
}

interface IssueEvent {
  action: string;
  issue: IssuePayload;
}

function readEvent(): IssueEvent {
  if (!EVENT_PATH) {
    throw new Error("GITHUB_EVENT_PATH is not set");
  }

  const raw = require("node:fs").readFileSync(EVENT_PATH, "utf-8");
  return JSON.parse(raw) as IssueEvent;
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function summarizeBody(body: string | null): string {
  if (!body?.trim()) return "_No description provided._";

  const normalized = body.replace(/\r\n/g, "\n").trim();
  if (normalized.length <= SUMMARY_MAX_LENGTH) return normalized;

  return `${normalized.slice(0, SUMMARY_MAX_LENGTH).trimEnd()}…`;
}

function formatLabels(labels: { name: string }[]): string {
  if (labels.length === 0) return "none";
  return labels.map((label) => escapeHtml(label.name)).join(", ");
}

function actionLabel(action: string): string {
  if (action === "reopened") return "Issue reopened";
  return "New issue";
}

function buildMessage(event: IssueEvent): string {
  const { action, issue } = event;
  const author = issue.user?.login ?? "unknown";
  const summary = summarizeBody(issue.body);

  return [
    `<b>${escapeHtml(actionLabel(action))}</b>`,
    "",
    `<b>#${issue.number}</b> ${escapeHtml(issue.title)}`,
    "",
    `<b>Repo</b>: ${escapeHtml(REPO)}`,
    `<b>Author</b>: ${escapeHtml(author)}`,
    `<b>Labels</b>: ${formatLabels(issue.labels)}`,
    "",
    "<b>Summary</b>",
    `<pre>${escapeHtml(summary)}</pre>`,
    "",
    `<a href="${escapeHtml(issue.html_url)}">Open on GitHub</a>`,
  ].join("\n");
}

async function sendTelegram(html: string): Promise<void> {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    throw new Error("TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID are required");
  }

  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text: html,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Telegram send failed (${res.status}): ${body}`);
  }
}

async function main() {
  const event = readEvent();

  if (!event.issue) {
    console.log("No issue in event payload, skipping.");
    return;
  }

  const message = buildMessage(event);
  await sendTelegram(message);
  console.log(`Notified Telegram for issue #${event.issue.number}`);
}

main().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
