/**
 * End-to-end tests (npm run test:e2e). Builds and starts the production server
 * against TEST_DATABASE_URL with a freshly seeded database and a throwaway
 * administrator whose password is generated for this run only.
 * Set E2E_SKIP_BUILD=1 to reuse an existing build.
 */
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { defineConfig } from "@playwright/test";
import { parse } from "dotenv";

if (!process.env.TEST_DATABASE_URL && existsSync(".env.local")) {
  const local = parse(readFileSync(".env.local"));
  if (local.TEST_DATABASE_URL) process.env.TEST_DATABASE_URL = local.TEST_DATABASE_URL;
}
if (!process.env.TEST_DATABASE_URL) throw new Error("Set TEST_DATABASE_URL to a disposable PostgreSQL database to run end-to-end tests.");
process.env.E2E_ADMIN_ID ??= "e2e-admin";
process.env.E2E_ADMIN_PASSWORD ??= randomBytes(18).toString("base64url");

const PORT = Number(process.env.E2E_PORT ?? 3300);
const build = process.env.E2E_SKIP_BUILD ? "" : "npx next build && ";

export default defineConfig({
  testDir: "tests/e2e",
  workers: 1,
  fullyParallel: false,
  timeout: 60_000,
  use: {
    baseURL: `http://localhost:${PORT}`,
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : {},
  },
  webServer: {
    command: `npx tsx tests/e2e/prepare.ts && ${build}npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/admin/login`,
    timeout: 300_000,
    reuseExistingServer: false,
    stdout: "pipe",
    env: {
      DATABASE_URL: process.env.TEST_DATABASE_URL,
      TEST_DATABASE_URL: process.env.TEST_DATABASE_URL,
      E2E_ADMIN_ID: process.env.E2E_ADMIN_ID,
      E2E_ADMIN_PASSWORD: process.env.E2E_ADMIN_PASSWORD,
      STORAGE_DRIVER: "local",
      LOCAL_UPLOAD_DIR: "test-results/uploads",
    },
  },
});
