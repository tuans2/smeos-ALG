import { defineConfig } from "@playwright/test"

// Cổng 3200 — đúng `npm run dev`/`npm run start` (package.json: -p 3200)
const PORT = 3200

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 10 * 60_000,
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    // Máy có Chromium dựng sẵn khác bản Playwright đòi (vd sandbox đám mây):
    // PW_CHROMIUM_PATH=/opt/pw-browsers/chromium thay vì `playwright install`.
    ...(process.env.PW_CHROMIUM_PATH ? { launchOptions: { executablePath: process.env.PW_CHROMIUM_PATH } } : {}),
  },
  webServer: {
    command: process.env.E2E_WEB_COMMAND ?? "npm run dev",
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
})
