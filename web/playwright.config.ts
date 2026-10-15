import { defineConfig, devices } from "@playwright/test";

const port = 4173;
const apiPort = 8000;
// A second copy of the built site whose API path leads nowhere, for "server unavailable".
const noBackendPort = 4174;
export const NO_BACKEND_URL = `http://localhost:${noBackendPort}`;

export default defineConfig({
  testDir: "e2e",
  forbidOnly: !!process.env.CI,
  use: { baseURL: `http://localhost:${port}` },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // Started in this order. The real inference server counts as up once the model has
  // loaded: Health answers 503 until then.
  webServer: [
    {
      command: "uv run serve",
      cwd: "../python",
      env: { PORT: String(apiPort) },
      url: `http://127.0.0.1:${apiPort}/health`,
      timeout: 180_000,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: `npm run build && npm run preview -- --port ${port} --strictPort`,
      env: { API_URL: `http://127.0.0.1:${apiPort}` },
      port,
      reuseExistingServer: !process.env.CI,
    },
    {
      // Port 9 (discard) has nothing listening, so every API call fails as with no server.
      command: `npm run preview -- --port ${noBackendPort} --strictPort`,
      env: { API_URL: "http://127.0.0.1:9" },
      port: noBackendPort,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
