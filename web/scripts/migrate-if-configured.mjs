import { execSync } from "node:child_process";

if (process.env.NETLIFY_DB_URL || process.env.DATABASE_URL) {
  console.log("Applying database migrations...");
  execSync("netlify database migrations apply", { stdio: "inherit" });
} else {
  console.log("Skipping migrations — NETLIFY_DB_URL / DATABASE_URL not set.");
}
