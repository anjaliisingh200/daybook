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
import { spawnSync } from "node:child_process";
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
// the demo build has no account at all: empty keys make the website's own code run on its sample data
const supabaseUrl = demo ? "" : (env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/+$/, "");
const supabaseKey = demo ? "" : env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
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

// The stylesheet is the website's own (app/globals.css plus every class its components use), built with Tailwind.
const tailwind = spawnSync(process.execPath, [join(root, "node_modules", "@tailwindcss", "cli", "dist", "index.mjs"), "-i", join(ext, "src", "styles.css"), "-o", join(dist, "panel.css"), ...(watch ? [] : ["--minify"])], { cwd: ext, stdio: "inherit" });
if (tailwind.status !== 0) process.exit(tailwind.status ?? 1);
cpSync(join(ext, "icons"), join(dist, "icons"), { recursive: true });
cpSync(join(ext, "fonts"), join(dist, "fonts"), { recursive: true });

/**
 * The panel runs the website's own screens and store. Two small adapters let that code work outside the website:
 *   the browser Supabase client is the extension's (its login lives in extension storage, not cookies);
 *   "Reconnect Google" opens the website instead of loading a page that does not exist inside an extension.
 */
const adapters = {
  name: "daybook-adapters",
  setup(b) {
    b.onResolve({ filter: /^@\/lib\/supabase\/browser$/ }, () => ({ path: join(ext, "src", "adapters", "supabaseBrowser.ts") }));
    b.onLoad({ filter: /lib[\\/]store[\\/]google\.ts$/ }, (args) => {
      const src = readFileSync(args.path, "utf8");
      const patched = src.replace('window.location.assign("/api/google/connect")', 'window.open(__SITE_URL__ + "/api/google/connect", "_blank")');
      if (patched === src) throw new Error("connectGoogle changed on the website: update extension/build.mjs");
      return { contents: patched, loader: "ts", resolveDir: dirname(args.path) };
    });
  },
};

const options = {
  plugins: [adapters],
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
    // the website's own config reads these two; empty means "no account, sample data", which is what the demo build is
    "process.env.NEXT_PUBLIC_SUPABASE_URL": JSON.stringify(supabaseUrl),
    "process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY": JSON.stringify(supabaseKey),
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
