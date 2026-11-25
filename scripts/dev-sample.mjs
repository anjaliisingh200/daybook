/**
 * Runs the website on its own sample data (no login, nothing saved on a server) on http://localhost:3100,
 * in its own build folder, so it does not disturb the normal dev server on port 3000.
 *
 *   node scripts/dev-sample.mjs
 */
import { spawn } from "node:child_process";
import { join } from "node:path";

const next = join(process.cwd(), "node_modules", "next", "dist", "bin", "next");
const child = spawn(process.execPath, [next, "dev", "-p", "3100"], {
  stdio: "inherit",
  env: { ...process.env, NEXT_PUBLIC_SUPABASE_URL: "", NEXT_PUBLIC_SUPABASE_ANON_KEY: "", NEXT_DIST_DIR: ".next-e2e" },
});
child.on("exit", (code) => process.exit(code ?? 0));
