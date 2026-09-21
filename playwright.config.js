import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./browser-tests",
  timeout: 30000,
  workers: 1,
  use: { baseURL: "http://127.0.0.1:4179", trace: "retain-on-failure" },
  webServer: { command: "node tools/serve.mjs 4179", url: "http://127.0.0.1:4179", reuseExistingServer: false },
});
