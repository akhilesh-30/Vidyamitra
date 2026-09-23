import fs from "fs";
import path from "path";

const lines = [];
function walk(d, pre = "") {
  let es = [];
  try { es = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
  for (const e of es) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) {
      const kids = fs.readdirSync(p);
      lines.push(`${pre}${e.name}/  (${kids.length} entries)`);
      if (p.includes("app") && !p.includes("api") && !p.includes("node_modules")) walk(p, pre + "  ");
    } else {
      const size = fs.statSync(p).size;
      lines.push(`${pre}${e.name}  ${size}B`);
    }
  }
}
lines.push("=== app tree ===");
walk("app");
lines.push("=== components ===");
try { lines.push(fs.readdirSync("components/student").join(", ")); } catch (e) { lines.push("no components/student: " + e.message); }
lines.push("=== brain.tsx head ===");
try { lines.push(fs.readFileSync("components/three/brain.tsx", "utf8").slice(0, 3000)); } catch (e) { lines.push("ERR " + e.message); }
fs.writeFileSync(".state-report.txt", lines.join("\n"));
console.log("written");
