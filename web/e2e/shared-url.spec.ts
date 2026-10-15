import { expect, test } from "@playwright/test";

test("open shared URL restores the Example, view, Step and language", async ({ page }) => {
  await page.goto("/?example=moon&view=blocks&step=3&lang=de");

  await expect(page.locator("html")).toHaveAttribute("lang", "de");
  const pipeline = page.getByRole("navigation", { name: "Pipeline" });
  await expect(pipeline.getByRole("button", { name: /Blöcke/ })).toHaveAttribute("aria-current", "step");
  await expect(page.getByRole("heading", { level: 2 })).toHaveText("Blöcke");

  // Moving along the strip updates the URL, so a reload reopens the same view.
  await pipeline.getByRole("button", { name: /Tokenisieren/ }).click();
  await expect(page).toHaveURL(/view=tokenize/);
  await page.reload();
  await expect(page.getByRole("heading", { level: 2 })).toHaveText("Tokenisieren");
  // The Moon Example's 46 Prompt tokens plus 3 Steps.
  await expect(page.getByRole("list", { name: "Tokens" }).getByRole("listitem")).toHaveCount(49);
  await expect(page.getByRole("slider", { name: "Schritt" })).toHaveValue("3");
  await expect(page.getByRole("combobox", { name: "Beispiel" })).toHaveValue("moon");

  // The browser's back button returns to the previous view.
  await page.goBack();
  await expect(page.getByRole("heading", { level: 2 })).toHaveText("Blöcke");
});

test("copy link copies the URL of the current view", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/?view=embed&lang=en");

  await page.getByRole("button", { name: "Copy link" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Link copied" })).toBeVisible();

  const copied = await page.evaluate(() => navigator.clipboard.readText());
  const opened = await context.newPage();
  await opened.goto(copied);
  await expect(opened.getByRole("heading", { level: 2 })).toHaveText("Embed");
});

test("without the clipboard API, copy link offers the URL pre-selected", async ({ page }) => {
  // As on plain HTTP, where browsers withhold the clipboard API.
  await page.addInitScript(() => Object.defineProperty(navigator, "clipboard", { value: undefined }));
  await page.goto("/?view=predict&lang=en");

  await page.getByRole("button", { name: "Copy link" }).click();
  const field = page.getByRole("textbox", { name: "Link to this view" });
  await expect(field).toBeFocused();
  await expect(field).toHaveValue(page.url());
  const selected = await field.evaluate((el: HTMLInputElement) => el.value.slice(el.selectionStart!, el.selectionEnd!));
  expect(selected).toBe(page.url());
});
