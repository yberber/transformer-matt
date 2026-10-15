import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { NO_BACKEND_URL } from "../playwright.config";

// Against a second copy of the built site whose API path leads to no server.
test.use({ baseURL: NO_BACKEND_URL });

test("Live mode with server unavailable", async ({ page }) => {
  const apiRequests: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.startsWith("/api/")) apiRequests.push(request.url());
  });

  // Example mode never calls the server.
  await page.goto("/?example=village&view=tokenize&lang=en");
  const tokens = page.getByRole("list", { name: "Tokens" }).getByRole("listitem");
  await expect(tokens).toHaveCount(12);
  await page.getByRole("button", { name: "Next token" }).click();
  await expect(tokens).toHaveCount(13);
  expect(apiRequests).toEqual([]);

  // Live mode says the server is unavailable, with one click back to Example mode.
  await page.getByRole("button", { name: "Live mode" }).click();
  const alert = page.getByRole("alert");
  await expect(alert).toContainText("The inference server is unavailable");
  const { violations } = await new AxeBuilder({ page }).analyze();
  expect(violations.map(({ id }) => id)).toEqual([]);

  await alert.getByRole("button", { name: "Back to Example mode" }).click();
  await expect(page).toHaveURL(/mode=example/);
  await expect(page.getByRole("combobox", { name: "Example" })).toHaveValue("village");
  await expect(tokens).toHaveCount(12);
});

test("a server that does not answer within 3 s is unavailable", async ({ page }) => {
  await page.route("**/api/health", () => {}); // Never answers.
  await page.goto("/?mode=live&lang=en");
  await expect(page.getByRole("status").filter({ hasText: "Checking the server" })).toBeVisible();
  await expect(page.getByRole("alert")).toContainText("The inference server is unavailable", { timeout: 5_000 });
});

test("a shared Live link with server unavailable says so, with one click back to Example mode", async ({ page }) => {
  const fragment = new URLSearchParams({ prompt: "Once upon a time, in a small village by the sea" });
  await page.goto(`/?mode=live&example=village&view=tokenize&step=2&lang=en#${fragment}`);
  const alert = page.getByRole("alert");
  await expect(alert).toContainText("The inference server is unavailable");

  await alert.getByRole("button", { name: "Back to Example mode" }).click();
  await expect(page).toHaveURL(/mode=example/);
  await expect(page.getByRole("list", { name: "Tokens" }).getByRole("listitem")).toHaveCount(12);
});
