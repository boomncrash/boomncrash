import { execSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));

function netlifyBin() {
  try {
    return join(dirname(require.resolve("netlify-cli/package.json")), "bin/run.js");
  } catch {
    return "netlify";
  }
}

if (process.env.NETLIFY_DB_URL || process.env.DATABASE_URL) {
  console.log("Applying database migrations...");
  execSync(`node "${netlifyBin()}" database migrations apply`, { stdio: "inherit" });
} else {
  console.log("Skipping migrations — NETLIFY_DB_URL / DATABASE_URL not set.");
}
