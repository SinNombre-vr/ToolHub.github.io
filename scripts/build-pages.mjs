import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), "..");
const OUT = path.join(ROOT, "dist");

const EXCLUDED_ROOT = new Set([
  ".git",
  ".github",
  ".env",
  ".env.local",
  ".env.production",
  "node_modules",
  "dist",
  "scripts",
  "supabase",
  "server.js",
  "package.json",
  "package-lock.json",
  "DEPLOY_GITHUB_PAGES.md",
  "DEPLOY_CLOUDFLARE_PAGES.md",
  "README.md",
  "README.txt"
]);

const TEXT_EXTENSIONS = new Set([
  ".html", ".css", ".js", ".json", ".txt", ".xml", ".svg", ".webmanifest"
]);

const LEGACY_ORIGIN = /https:\/\/sinnombre-vr\.github\.io\/ToolHub\.github\.io/gi;
let rewrittenLegacyUrls = 0;

async function copyEntry(source, destination, rootName) {
  const info = await stat(source);

  if (info.isDirectory()) {
    await mkdir(destination, { recursive: true });
    const entries = await readdir(source);
    for (const entry of entries) {
      await copyEntry(path.join(source, entry), path.join(destination, entry), rootName);
    }
    return;
  }

  const ext = path.extname(source).toLowerCase();
  if (TEXT_EXTENSIONS.has(ext)) {
    let content = await readFile(source, "utf8");
    const matches = content.match(LEGACY_ORIGIN);
    if (matches?.length) {
      rewrittenLegacyUrls += matches.length;
      content = content.replace(LEGACY_ORIGIN, "");
    }
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, content, "utf8");
    return;
  }

  await mkdir(path.dirname(destination), { recursive: true });
  await cp(source, destination);
}

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });

for (const entry of await readdir(ROOT)) {
  if (EXCLUDED_ROOT.has(entry)) continue;
  await copyEntry(path.join(ROOT, entry), path.join(OUT, entry), entry);
}

for (const required of [
  "index.html",
  "styles.css",
  "script.js",
  "profile.html",
  "biblioteca-assets.html"
]) {
  try {
    await stat(path.join(OUT, required));
  } catch {
    throw new Error(`Cloudflare build: falta el archivo público obligatorio ${required}`);
  }
}

console.log(`ToolHub Pages listo en dist/. URLs legacy reescritas: ${rewrittenLegacyUrls}`);
