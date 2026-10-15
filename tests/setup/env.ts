/**
 * Test environment. Database tests use TEST_DATABASE_URL only (never
 * DATABASE_URL, which may point at real content): the suite truncates tables.
 * TEST_DATABASE_URL can come from the shell, .env.test.local or .env.local.
 */
import { existsSync, readFileSync } from "node:fs";
import { loadEnvConfig } from "@next/env";
import { parse } from "dotenv";

loadEnvConfig(process.cwd(), false);
if (!process.env.TEST_DATABASE_URL && existsSync(".env.local")) {
  const local = parse(readFileSync(".env.local"));
  if (local.TEST_DATABASE_URL) process.env.TEST_DATABASE_URL = local.TEST_DATABASE_URL;
}
const testUrl = process.env.TEST_DATABASE_URL?.trim();
if (testUrl) process.env.DATABASE_URL = testUrl;
else delete process.env.DATABASE_URL;
delete process.env.VERCEL;
