/**
 * Port helpers — find and free the process listening on a TCP port.
 *
 * Vidyamitra runs on a fixed port (3000 by default). When a previous dev
 * server is still holding that port, `next dev` silently falls back to a
 * random port and the browser then opens localhost:3000 and shows
 * "refused to connect". Freeing the port first removes that whole class of
 * confusion.
 */
import { execSync } from "node:child_process";

const IS_WIN = process.platform === "win32";

/** PIDs currently LISTENing on the port (empty array if none). */
export function pidsListeningOn(port) {
  const pids = new Set();
  try {
    if (IS_WIN) {
      const out = execSync("netstat -ano -p tcp", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
      for (const line of out.split(/\r?\n/)) {
        if (!line.includes(`:${port}`)) continue;
        if (!/LISTENING/i.test(line)) continue;
        const parts = line.trim().split(/\s+/);
        const pid = Number(parts[parts.length - 1]);
        if (Number.isInteger(pid) && pid > 0) pids.add(pid);
      }
    } else {
      const out = execSync(`lsof -ti tcp:${port} -sTCP:LISTEN`, {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      });
      for (const raw of out.split(/\s+/)) {
        const pid = Number(raw);
        if (Number.isInteger(pid) && pid > 0) pids.add(pid);
      }
    }
  } catch {
    /* no listener, or the probe tool is unavailable */
  }
  return [...pids];
}

/** Best-effort process name for friendlier messages. */
function label(pid) {
  try {
    if (IS_WIN) {
      const out = execSync(`tasklist /FI "PID eq ${pid}" /FO CSV /NH`, {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      });
      const name = out.split(",")[0]?.replace(/"/g, "").trim();
      return name ? `PID ${pid} (${name})` : `PID ${pid}`;
    }
    return `PID ${pid}`;
  } catch {
    return `PID ${pid}`;
  }
}

function kill(pid) {
  try {
    if (IS_WIN) execSync(`taskkill /PID ${pid} /F /T`, { stdio: "ignore" });
    else process.kill(pid, "SIGTERM");
    return true;
  } catch {
    return false;
  }
}

/**
 * Free the port. Returns the list of PIDs it managed to stop.
 * `quiet` suppresses the normal progress lines (used by the dev launcher).
 */
export function freePort(port, { quiet = false } = {}) {
  const pids = pidsListeningOn(port);
  if (pids.length === 0) {
    if (!quiet) console.log(`Port ${port} is already free.`);
    return [];
  }
  const stopped = [];
  for (const pid of pids) {
    if (pid === process.pid) continue;
    if (!quiet) console.log(`Port ${port} is in use by ${label(pid)} — stopping it.`);
    if (kill(pid)) stopped.push(pid);
    else if (!quiet) console.log(`  Could not stop ${label(pid)}. Close that window, then try again.`);
  }
  return stopped;
}

/** Port from PORT env, otherwise 3000. */
export function devPort() {
  const raw = Number(process.env.PORT);
  return Number.isInteger(raw) && raw > 0 && raw < 65536 ? raw : 3000;
}
