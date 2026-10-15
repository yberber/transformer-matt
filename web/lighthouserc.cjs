// Lighthouse CI quality gates for Example mode (`npm run lighthouse` builds the site, then runs them).
// Lighthouse runs with its default mobile emulation and throttling, on Playwright's Chromium.
// The built site is served by LHCI's own server, which gzips responses. Caddy serves brotli,
// which is smaller, so the measured page weight errs high.
const { chromium } = require("@playwright/test");

module.exports = {
  ci: {
    collect: {
      staticDistDir: "./dist",
      chromePath: chromium.executablePath(),
      url: [
        // The landing page: the default Example.
        "http://localhost/",
        // The Example with the most Positions, so the largest Example file.
        "http://localhost/?example=moon",
      ],
      numberOfRuns: 3,
      // Linux CI runners block the user namespaces Chrome's sandbox needs; Playwright
      // turns the sandbox off for the same reason. The page under test is our own build.
      settings: { chromeFlags: "--no-sandbox" },
    },
    assert: {
      assertions: {
        "categories:performance": ["error", { minScore: 0.9, aggregationMethod: "median-run" }],
        // The initial page load stays under 2 MB transferred.
        "total-byte-weight": ["error", { maxNumericValue: 2_000_000, aggregationMethod: "median-run" }],
      },
    },
    upload: { target: "filesystem", outputDir: ".lighthouseci/reports" },
  },
};
