import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig, type ProxyOptions } from "vite";

// The web app calls the inference server under /api, as the reverse proxy serves it in
// production. The dev and preview servers forward it to API_URL (the local server by default).
function apiProxy(): Record<string, ProxyOptions> {
  return {
    "/api": {
      target: process.env.API_URL ?? "http://127.0.0.1:8000",
      rewrite: (path) => path.replace(/^\/api/, ""),
    },
  };
}

export default defineConfig({
  plugins: [svelte()],
  server: { proxy: apiProxy() },
  preview: { proxy: apiProxy() },
});
