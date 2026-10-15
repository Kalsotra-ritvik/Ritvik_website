#!/usr/bin/env node
/**
 * Bundles the molecular-surface worker into a standalone script:
 *   components/molecular/surfaceWorker.ts → public/workers/surface-worker.js
 * Runs automatically before `dev`, `build` and `vercel-build`.
 */
import { build } from "esbuild";

await build({
  entryPoints: ["components/molecular/surfaceWorker.ts"],
  outfile: "public/workers/surface-worker.js",
  bundle: true,
  format: "iife",
  platform: "browser",
  target: "es2020",
  minify: true,
  legalComments: "none",
  logLevel: "warning",
});
console.log("build:worker — public/workers/surface-worker.js");
