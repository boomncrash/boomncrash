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

// Netlify applies migrations automatically during deploy (post-processing).
// Never run migrations against NETLIFY_DB_URL in CI/build — it corrupts the
// migration version table (version_id mismatch). Local only via `netlify dev`.
const isNetlifyBuild =
  process.env.NETLIFY === "true" ||
  process.env.CONTEXT === "production" ||
  process.env.CONTEXT === "deploy-preview" ||
  process.env.CONTEXT === "branch-deploy";

if (isNetlifyBuild) {
  console.log("Skipping migrations on Netlify — platform applies them during deploy.");
} else if (process.env.DATABASE_URL && !process.env.NETLIFY_DB_URL) {
  console.log("Applying database migrations (local DATABASE_URL)...");
  execSync(`node "${netlifyBin()}" database migrations apply`, { stdio: "inherit" });
} else {
  console.log(
    "Skipping migrations — use `npm run db:migrate` locally with `netlify dev`, or let Netlify deploy apply them."
  );
}
