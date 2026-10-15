import { defineConfig, devices } from "@playwright/test";

const port = 4173;

export default defineConfig({
  testDir: "e2e",
  forbidOnly: !!process.env.CI,
  use: { baseURL: `http://localhost:${port}` },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npm run build && npm run preview -- --port ${port} --strictPort`,
    port,
    reuseExistingServer: !process.env.CI,
  },
});
