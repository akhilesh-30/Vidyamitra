/**
 * Stop the dev server: find whatever is listening on the app port and stop it.
 *
 *   npm run stop            -> stops the process on the default port (3000)
 *   PORT=3001 npm run stop  -> stops the process on 3001
 *
 * Double-click `stop-vidyamitra.bat` on Windows for the same thing.
 */
import { devPort, freePort, pidsListeningOn } from "./port-util.mjs";

const port = devPort();

console.log(`Looking for Vidyamitra's dev server on port ${port}...`);
const stopped = freePort(port);

if (stopped.length === 0 && pidsListeningOn(port).length === 0) {
  console.log(`Nothing is running on port ${port}. Vidyamitra is already stopped.`);
  process.exit(0);
}

if (stopped.length === 0) {
  console.log(`Port ${port} is still occupied. Close that window and run this again.`);
  process.exit(1);
}

// Give the OS a moment, then confirm the port really is free.
await new Promise((r) => setTimeout(r, 600));
const leftovers = pidsListeningOn(port);
if (leftovers.length) {
  console.log(`Port ${port} is still held by PID ${leftovers.join(", ")}.`);
  process.exit(1);
}

console.log(`Stopped ${stopped.length} process${stopped.length === 1 ? "" : "es"}. Port ${port} is free.`);
process.exit(0);
