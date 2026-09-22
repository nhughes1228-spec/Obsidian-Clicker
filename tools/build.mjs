import { mkdir, cp, rm, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { EDITION, SAVE_VERSION } from "../src/content.js";
await rm("dist", { recursive: true, force: true });
await mkdir("dist", { recursive: true });
for (const path of ["index.html", "style.css", "src", "assets"]) await cp(path, `dist/${path}`, { recursive: true });
await mkdir("dist/classic", { recursive: true });
for (const path of ["index.html", "style.css", "src", "assets"]) await cp(`classic/${path}`, `dist/classic/${path}`, { recursive: true });
let revision = process.env.CF_PAGES_COMMIT_SHA || process.env.GITHUB_SHA || "unknown";
try {
  revision = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
} catch {}
await writeFile("dist/release.json", JSON.stringify({ revision, edition: EDITION, saveVersion: SAVE_VERSION }) + "\n");
console.log("Built dist from the explicit public asset allowlist.");
