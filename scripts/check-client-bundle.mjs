// Separation fence 3: built-output canary check.
// Scans the built front end (apps/web/dist) and fails if any server-only marker
// is present, or if the build output is missing/empty (so it cannot pass vacuously).
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distDir = path.join(root, "apps/web/dist");

// The one place the forbidden markers are listed.
const FORBIDDEN = [
  "__TABLE_FORGE_SERVER_ONLY__", // canary exported from apps/worker/src/canary.ts
  "cloudflare:workers",
  "cloudflare:test",
  "DurableObject",
  "wrangler",
  "@cloudflare/",
  "node_modules/hono",
  "apps/worker/",
  "@table-forge/worker",
];

async function listFiles(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await listFiles(full)));
    else if (entry.isFile()) out.push(full);
  }
  return out;
}

function fail(message) {
  console.error(`check-client-bundle: FAIL: ${message}`);
  process.exit(1);
}

let info;
try {
  info = await stat(distDir);
} catch {
  fail(`${path.relative(root, distDir)} does not exist. Run "pnpm build" first.`);
}
if (!info.isDirectory()) fail(`${path.relative(root, distDir)} is not a directory.`);

const files = await listFiles(distDir);
if (files.length === 0) fail(`${path.relative(root, distDir)} is empty.`);
if (!files.some((f) => path.basename(f) === "index.html")) fail("dist has no index.html; the build looks incomplete.");
if (!files.some((f) => f.endsWith(".js"))) fail("dist has no JavaScript files; the build looks incomplete.");

const hits = [];
for (const file of files) {
  const text = (await readFile(file)).toString("latin1");
  for (const marker of FORBIDDEN) {
    if (text.includes(marker)) hits.push(`${path.relative(root, file)} contains "${marker}"`);
  }
}

if (hits.length > 0) fail(`server-only content found in the client bundle:\n  ${hits.join("\n  ")}`);
console.log(`check-client-bundle: OK (${files.length} files scanned, ${FORBIDDEN.length} markers checked)`);
