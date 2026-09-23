/**
 * Dev launcher: starts `next dev` and opens the site in the default browser
 * as soon as the server actually responds (no premature "connection refused").
 *
 *   npm run dev          -> next dev + auto-open browser
 *   npm run dev:plain    -> plain `next dev` (no auto-open)
 *
 * The port follows PORT if set, matching what `next dev` listens on.
 */
import { spawn } from "node:child_process";
import { get } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const nextBin = path.join(projectRoot, "node_modules", "next", "dist", "bin", "next");
const port = process.env.PORT || "3000";
const url = `http://localhost:${port}`;

/* Start the dev server with inherited stdio so Next's own output stays visible. */
const server = spawn(process.execPath, [nextBin, "dev"], {
  cwd: projectRoot,
  stdio: "inherit",
  env: process.env,
});

function openBrowser(target) {
  try {
    if (process.platform === "win32") {
      spawn("cmd", ["/c", "start", "", target], { detached: true, stdio: "ignore" }).unref();
    } else if (process.platform === "darwin") {
      spawn("open", [target], { detached: true, stdio: "ignore" }).unref();
    } else {
      spawn("xdg-open", [target], { detached: true, stdio: "ignore" }).unref();
    }
  } catch {
    /* Opening the browser is best-effort only; the server keeps running. */
  }
}

/* Poll the server and open the browser on the first successful response. */
const startedAt = Date.now();
const TIMEOUT_MS = 180_000;
function poll() {
  if (server.exitCode !== null) return; // server died; nothing to open
  const req = get(url, { timeout: 1500 }, (res) => {
    res.resume(); // drain body
    console.log(`\n> Opening ${url} in your browser...\n`);
    openBrowser(url);
  });
  req.on("timeout", () => req.destroy());
  req.on("error", () => {
    if (Date.now() - startedAt < TIMEOUT_MS) setTimeout(poll, 400);
    else console.error(`\n> Gave up waiting for ${url} after 3 minutes (server may have failed to start).\n`);
  });
}
poll();

/* Exit with the dev server's code; Ctrl+C stops both. */
server.on("exit", (code) => process.exit(code ?? 0));
process.on("SIGINT", () => {
  server.kill("SIGINT");
  process.exit(0);
});
