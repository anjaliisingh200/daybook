/**
 * Builds the Chrome extension into extension/dist.
 *
 *   npm run extension            real build (needs the Supabase lines in .env.local)
 *   npm run extension -- --demo  sample data, no login (for screenshots and trying the look)
 *   npm run extension -- --watch rebuilds when a file changes
 *
 * Reads three values from .env.local (names only are ever printed, never values):
 *   NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY  the same two the website uses (public by design)
 *   DAYBOOK_SITE_URL  where Daybook is hosted, for Google events. Not a secret. Defaults to http://localhost:3000.
 */
import { build, context } from "esbuild";
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ext = join(root, "extension");
const args = process.argv.slice(2);
const demo = args.includes("--demo");
const dist = join(ext, demo ? "dist-demo" : "dist");
const watch = args.includes("--watch");

/** Reads KEY=value lines, skipping comments. */
function readEnv(file) {
  const out = {};
  if (!existsSync(file)) return out;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (m && !line.trim().startsWith("#")) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return out;
}

const env = { ...readEnv(join(root, ".env.local")), ...process.env };
const supabaseUrl = (env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/+$/, "");
const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const siteUrl = (env.DAYBOOK_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");

if (!demo && (!supabaseUrl || !supabaseKey)) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local (uncomment the two Supabase lines).");
  process.exit(1);
}
console.log(`Extension build: ${demo ? "DEMO (sample data)" : "real"}`);
console.log(`  Supabase URL: ${supabaseUrl ? "set" : "not set"}, key: ${supabaseKey ? `set (${supabaseKey.length} characters)` : "not set"}`);
console.log(`  Daybook site: ${siteUrl}`);

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });

// manifest
const manifest = JSON.parse(readFileSync(join(ext, "manifest.template.json"), "utf8"));
manifest.host_permissions = [...new Set([supabaseUrl && `${supabaseUrl}/*`, `${siteUrl}/*`].filter(Boolean))];
if (demo) manifest.name = "Daybook (demo)";
writeFileSync(join(dist, "manifest.json"), JSON.stringify(manifest, null, 2));

// static files
cpSync(join(ext, "src", "panel.html"), join(dist, "panel.html"));
cpSync(join(ext, "src", "panel.css"), join(dist, "panel.css"));
cpSync(join(ext, "icons"), join(dist, "icons"), { recursive: true });
cpSync(join(ext, "fonts"), join(dist, "fonts"), { recursive: true });

const options = {
  entryPoints: { panel: join(ext, "src", "panel.tsx"), background: join(ext, "src", "background.ts") },
  outdir: dist,
  bundle: true,
  format: "esm",
  target: "chrome120",
  jsx: "automatic",
  minify: !watch,
  sourcemap: watch ? "inline" : false,
  tsconfig: join(root, "tsconfig.json"),
  define: {
    __SUPABASE_URL__: JSON.stringify(supabaseUrl),
    __SUPABASE_KEY__: JSON.stringify(supabaseKey),
    __SITE_URL__: JSON.stringify(siteUrl),
    __DEMO__: JSON.stringify(demo),
    "process.env.NODE_ENV": JSON.stringify(watch ? "development" : "production"),
  },
  logLevel: "info",
};

if (watch) {
  const ctx = await context(options);
  await ctx.watch();
  console.log("Watching for changes. Press Ctrl+C to stop.");
} else {
  await build(options);
  console.log(`Built ${dist}`);
}
