#!/usr/bin/env node
/**
 * Daily ml_debug health summary poster
 *
 * Behavior:
 * - Finds (or creates) an issue titled "Daily Health Check"
 * - Posts a daily comment summarizing ml_debug counts
 * - If Cloudflare API is not configured, posts a friendly notice with setup steps
 *
 * Requirements (CI):
 * - GITHUB_TOKEN (provided by GitHub Actions)
 * - CF_API_TOKEN (optional, Cloudflare API token)
 * - CF_ACCOUNT_ID (optional)
 * - CF_PAGES_PROJECT (optional, default: project-arrowhead)
 * - CF_PAGES_SCRIPT_NAME (optional)
 */

const { env } = process;

const REPO = env.GITHUB_REPOSITORY; // owner/repo
if (!REPO) {
  console.error("GITHUB_REPOSITORY is required");
  process.exit(1);
}
const GITHUB_TOKEN = env.GITHUB_TOKEN;
if (!GITHUB_TOKEN) {
  console.error("GITHUB_TOKEN is required (use Actions token)");
  process.exit(1);
}

const CF_API_TOKEN = env.CF_API_TOKEN || "";
const CF_ACCOUNT_ID = env.CF_ACCOUNT_ID || "";
const CF_PAGES_PROJECT = env.CF_PAGES_PROJECT || "project-arrowhead";
const CF_PAGES_SCRIPT_NAME = env.CF_PAGES_SCRIPT_NAME || "";

const [owner, repo] = REPO.split("/");

async function gh(path, init = {}) {
  const url = `https://api.github.com/repos/${owner}/${repo}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      "Authorization": `Bearer ${GITHUB_TOKEN}`,
      "Accept": "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init.headers || {}),
    },
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`GitHub API ${res.status}: ${t}`);
  }
  return res;
}

async function findOrCreateDailyIssue() {
  // Try to find an open issue with exact title
  const res = await gh(`/issues?state=open&per_page=100`);
  const issues = await res.json();
  let issue = issues.find((i) => i.title === "Daily Health Check");
  if (issue) return issue;
  // Create
  const body = [
    "This issue is used by the scheduled workflow to post a daily ml_debug health summary.",
    "\n",
    "To enable Cloudflare integration, configure repo secrets:",
    "- CF_API_TOKEN",
    "- CF_ACCOUNT_ID",
    "\nOptional vars:",
    "- CF_PAGES_PROJECT (default: project-arrowhead)",
    "- CF_PAGES_SCRIPT_NAME (e.g., pages-worker--<id>-production)",
  ].join("\n");
  const created = await gh(`/issues`, {
    method: "POST",
    body: JSON.stringify({ title: "Daily Health Check", body }),
  }).then((r) => r.json());
  return created;
}

function fmtDate(d) {
  return d.toISOString().slice(0, 10);
}

async function fetchCloudflareSummary() {
  if (!CF_API_TOKEN || !CF_ACCOUNT_ID) {
    return {
      ok: false,
      message: "Cloudflare API not configured (CF_API_TOKEN/CF_ACCOUNT_ID). Posting setup reminder only.",
    };
  }
  // Placeholder: Integrating with Cloudflare log/analytics API is environment-specific.
  // In this first version, just acknowledge configuration and leave a TODO marker.
  return {
    ok: true,
    message: `Cloudflare API configured. Project=${CF_PAGES_PROJECT}${CF_PAGES_SCRIPT_NAME ? `, Script=${CF_PAGES_SCRIPT_NAME}` : ""}.\nTODO: Implement log query to count ml_debug response/error/timeout for yesterday.`,
  };
}

async function run() {
  const issue = await findOrCreateDailyIssue();
  const today = new Date();
  const y = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const dateStr = fmtDate(y);

  const cf = await fetchCloudflareSummary();

  const header = `Daily Health Summary for ${dateStr}`;
  const sections = [];
  if (cf.ok) {
    sections.push(cf.message);
  } else {
    sections.push(cf.message);
    sections.push("\nSetup steps:\n- Add CF_API_TOKEN (scoped for Pages/Analytics)\n- Add CF_ACCOUNT_ID (from your Cloudflare account)\n- Optionally set CF_PAGES_SCRIPT_NAME to your Pages worker script name");
  }

  const body = [
    `### ${header}`,
    "",
    ...sections,
  ].join("\n");

  await gh(`/issues/${issue.number}/comments`, {
    method: "POST",
    body: JSON.stringify({ body }),
  });

  console.log(`Posted daily summary to issue #${issue.number}`);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
