/**
 * Check the environment and prove the Supabase project answers.
 *
 *   npm run check:env
 *
 * Prints each required variable as set/missing (never the value), flags the
 * usual mistakes (empty URL, URL with a trailing slash or /rest/v1, keys that
 * are not the right kind), then calls the project's auth health endpoint so you
 * know the URL and publishable key actually work together.
 */
import { existsSync } from "node:fs";

const ENV_FILE = ".env.local";

if (!existsSync(ENV_FILE)) {
  console.error(`No ${ENV_FILE} found. Create it next to package.json.`);
  process.exit(1);
}

try {
  process.loadEnvFile(ENV_FILE);
} catch (err) {
  console.error(`Could not read ${ENV_FILE}: ${err.message}`);
  process.exit(1);
}

const REQUIRED = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"];
const OPTIONAL = ["GROQ_API_KEY", "COUNSELLOR_ACCESS_CODE"];

let problems = [];

function report(name, required) {
  const raw = process.env[name];
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!value) {
    if (required) problems.push(`${name} is missing or empty`);
    console.log(`  ${name.padEnd(32)} ${required ? "MISSING" : "not set (optional)"}`);
    return "";
  }
  console.log(`  ${name.padEnd(32)} set (${value.length} chars)`);
  return value;
}

console.log(`Reading ${ENV_FILE}\n`);
const url = report("NEXT_PUBLIC_SUPABASE_URL", true);
const anon = report("NEXT_PUBLIC_SUPABASE_ANON_KEY", true);
const service = report("SUPABASE_SERVICE_ROLE_KEY", true);
report("GROQ_API_KEY", false);
report("COUNSELLOR_ACCESS_CODE", false);

/* --- shape checks ------------------------------------------------------- */
if (url) {
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(url)) {
    problems.push(
      "NEXT_PUBLIC_SUPABASE_URL should look like https://<project-ref>.supabase.co (no path, no /rest/v1, no trailing slash)"
    );
  }
}
if (anon && !anon.startsWith("sb_publishable_") && !anon.startsWith("eyJ")) {
  problems.push("NEXT_PUBLIC_SUPABASE_ANON_KEY does not look like a Supabase publishable key (sb_publishable_...) or a legacy anon JWT (eyJ...)");
}
if (service && !service.startsWith("sb_secret_") && !service.startsWith("eyJ")) {
  problems.push("SUPABASE_SERVICE_ROLE_KEY does not look like a Supabase secret key (sb_secret_...) or a legacy service JWT (eyJ...)");
}
if (anon && service && anon === service) {
  problems.push("The anon key and the service key are identical — the service key must never reach the browser");
}

/* --- live probe --------------------------------------------------------- */
async function probe() {
  if (!url || !anon) {
    console.log("\nSkipping the live check: the URL and/or publishable key is missing.");
    return;
  }
  const base = url.replace(/\/+$/, "");
  const endpoint = `${base}/auth/v1/health`;
  process.stdout.write(`\nChecking ${endpoint} ... `);
  try {
    const res = await fetch(endpoint, {
      headers: { apikey: anon, Authorization: `Bearer ${anon}` },
      signal: AbortSignal.timeout(12000),
    });
    console.log(`HTTP ${res.status}`);
    if (res.ok) {
      console.log("Supabase answered — the URL and publishable key work together.");
    } else if (res.status === 401 || res.status === 403) {
      problems.push(
        "Supabase rejected the publishable key (401/403). Re-copy it from Project Settings -> API Keys, and check it was not truncated."
      );
    } else if (res.status === 404) {
      problems.push("Supabase returned 404 — the project URL is probably wrong (wrong project ref, or an extra path).");
    } else {
      problems.push(`Supabase answered HTTP ${res.status} — check the project is running and not paused.`);
    }
  } catch (err) {
    console.log("could not connect");
    problems.push(`Could not reach ${endpoint} (${err.name}${err.cause?.code ? `: ${err.cause.code}` : ""}). Check the URL, and that the project is not paused.`);
  }
}

await probe();

/* --- summary ------------------------------------------------------------ */
console.log("");
if (problems.length === 0) {
  console.log("Environment looks good. Restart the dev server so Next picks up any change, then try sign-up.");
  process.exit(0);
}
console.log("Needs attention:");
for (const p of problems) console.log(`  - ${p}`);
console.log("\nEdit .env.local, save, then restart the dev server (stop-vidyamitra.bat, then start-vidyamitra.bat).");
process.exit(1);
