/**
 * Dev launcher: frees the app port, starts `next dev` pinned to that port, and
 * opens the browser only once the server actually answers.
 *
 *   npm run dev          -> next dev on port 3000 + auto-open browser
 *   npm run dev:plain    -> plain `next dev` (no port pinning, no auto-open)
 *   npm run stop         -> stop the server and free the port
 *
 * Why the port pinning: if something is already listening on 3000, `next dev`
 * quietly picks a random free port. The browser then opens localhost:3000 and
 * shows "refused to connect" even though the server is running fine. Freeing
 * the port and passing `-p` makes the address always match.
 *
 * The port follows PORT if set.
 */
import { spawn } from "node:child_process";
import { get } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { devPort, freePort } from "./port-util.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const nextBin = path.join(projectRoot, "node_modules", "next", "dist", "bin", "next");
const port = devPort();
const url = `http://localhost:${port}`;

/* A leftover server from a previous run would steal the port. Clear it first. */
freePort(port, { quiet: true });

/* Start the dev server with inherited stdio so Next's own output stays visible. */
const server = spawn(process.execPath, [nextBin, "dev", "-p", String(port)], {
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
let opened = false;

function poll() {
  if (server.exitCode !== null) return; // server died; nothing to open
  if (opened) return;
  const req = get(url, { timeout: 1500 }, (res) => {
    res.resume(); // drain body
    opened = true;
    console.log(`\n> Vidyamitra is up: ${url}\n> Press Ctrl+C here, or run stop-vidyamitra.bat, to stop it.\n`);
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
