import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// Against the real inference server. The village Example's Prompt typed in Live mode
// gives the same values as the committed Example: "Once upon a time, in a small village
// by the sea" is 12 Prompt tokens, the top next token is "," at 72.4%, and the greedy
// Continuation starts ", a" with "·a" at 12.8% after the ",".
const VILLAGE = "Once upon a time, in a small village by the sea";

function countStepRequests(page: Page): { readonly count: number } {
  const counter = { count: 0 };
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === "/api/step") counter.count += 1;
  });
  return counter;
}

async function axeViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page }).analyze();
  return violations.map(({ id, nodes }) => ({ id, elements: nodes.map(({ target }) => target.join(" ")) }));
}

test("use Live mode", async ({ page }) => {
  const steps = countStepRequests(page);
  await page.goto("/?example=village&view=predict&lang=en");

  // Opting in checks the server, then the Prompt field is ready.
  const toggle = page.getByRole("button", { name: "Live mode" });
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await expect(page).toHaveURL(/mode=live/);
  await expect(page.getByRole("status").filter({ hasText: "The server is ready" })).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Example" })).toHaveCount(0);
  await expect(page.getByText("Type a Prompt and run the model")).toBeVisible();

  // Typing shows the real tokens and the count against the limit.
  const prompt = page.getByRole("textbox", { name: "Your Prompt" });
  await prompt.fill(VILLAGE);
  const preview = page.getByRole("list", { name: "Token preview" }).getByRole("listitem");
  await expect(preview).toHaveCount(12);
  await expect(preview.nth(11)).toHaveText("·sea", { useInnerText: true });
  await expect(page.getByText("12 / 64")).toBeVisible();

  // Running the Prompt fills every view, exactly as in Example mode.
  await page.getByRole("button", { name: "Run the model" }).click();
  const sequence = page.getByRole("list", { name: "Sequence so far" }).getByRole("listitem");
  const ranked = page.getByRole("list", { name: "Top 10 next tokens" }).getByRole("listitem");
  await expect(sequence).toHaveCount(12);
  await expect(ranked.first()).toHaveText(/^1\s*,\s*72\.4%$/, { useInnerText: true });
  expect(steps.count).toBe(1);

  // Next token asks the server for one more Step.
  const next = page.getByRole("button", { name: "Next token" });
  await next.click();
  await expect(page).toHaveURL(/step=1/);
  await expect(sequence).toHaveCount(13);
  await expect(sequence.nth(12)).toHaveText(",");
  await expect(ranked.first()).toHaveText(/^1\s*·a\s*12\.8%$/, { useInnerText: true });
  await next.click();
  await expect(page).toHaveURL(/step=2/);
  await expect(sequence).toHaveCount(14);
  expect(steps.count).toBe(3);

  // Previous, the scrubber and next within the Steps so far use the Trace in the browser.
  await page.getByRole("button", { name: "Previous Step" }).click();
  await expect(page).toHaveURL(/step=1/);
  await expect(sequence).toHaveCount(13);
  await page.getByRole("slider", { name: "Step" }).fill("0");
  await expect(sequence).toHaveCount(12);
  await next.click();
  await expect(sequence).toHaveCount(13);
  expect(steps.count).toBe(3);

  // Every view shows the Live Trace.
  const pipeline = page.getByRole("navigation", { name: "Pipeline" });
  await pipeline.getByRole("button", { name: /Tokenize/ }).click();
  await expect(page.getByRole("list", { name: "Tokens" }).getByRole("listitem")).toHaveCount(13);
  await expect(page.getByText("Step 1 of 64").first()).toBeVisible();
  await pipeline.getByRole("button", { name: /Blocks/ }).click();
  await expect(page.getByRole("heading", { level: 2 })).toHaveText("Blocks");
  // The Blocks view's logit lens and MLP impact, for the 13 Positions at Step 1.
  await expect(page.getByRole("list", { name: /^Logit lens/ }).getByRole("listitem")).toHaveCount(5);
  const mlp = page.getByRole("list", { name: /^MLP impact/ }).getByRole("listitem");
  await expect(mlp).toHaveCount(13);
  await expect(mlp.nth(8)).toContainText("·village", { useInnerText: true });
  await expect(mlp.nth(8)).toContainText("98.9%");
  await page.getByRole("link", { name: /attention heatmap/ }).click();
  await expect(page.getByRole("application", { name: /Attention heatmap/ })).toBeVisible();
  await expect(page.getByTestId("query-labels").getByText("·village")).toBeVisible();
  await pipeline.getByRole("button", { name: /Embed/ }).click();
  await expect(page.getByRole("heading", { level: 2 })).toHaveText("Embed");
  expect(await axeViolations(page)).toEqual([]);
  await page.getByRole("navigation", { name: "More about the model" }).getByRole("link", { name: "Statistics" }).click();
  await expect(page.getByRole("heading", { level: 2 })).toHaveText("Statistics");
  await expect(page.getByText("Step 1 of 64").first()).toBeVisible();

  // Editing the Prompt discards the Continuation.
  await prompt.fill(`${VILLAGE},`);
  await expect(page).toHaveURL(/step=0/);
  await expect(page.getByText("Type a Prompt and run the model")).toBeVisible();
  await expect(preview).toHaveCount(13);

  // Text that is not English gets a gentle warning.
  const warning = page.getByText(/GPT-2 was trained mostly on English/);
  await expect(warning).toHaveCount(0);
  await prompt.fill("Der Hund läuft über die Straße und bellt.");
  await expect(warning).toBeVisible();

  // A Prompt over the limit says so, and cannot be run.
  await prompt.fill(Array.from({ length: 12 }, () => "The tide came in and the boats rose.").join(" "));
  await expect(page.getByText("108 / 64")).toBeVisible();
  await expect(page.getByText(/more than 64 tokens/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Run the model" })).toBeDisabled();

  // Turning Live mode off returns to the Example.
  await toggle.click();
  await expect(page).toHaveURL(/mode=example/);
  await expect(page.getByRole("combobox", { name: "Example" })).toHaveValue("village");
  await pipeline.getByRole("button", { name: /Tokenize/ }).click();
  await expect(page.getByRole("list", { name: "Tokens" }).getByRole("listitem")).toHaveCount(12);
});

test("a limit error from the server is shown as a clear message", async ({ page }) => {
  // Clicking Run before the token preview arrives sends the Prompt anyway; the server rejects it.
  await page.goto("/?mode=live&lang=en");
  await expect(page.getByRole("status").filter({ hasText: "The server is ready" })).toBeVisible();
  await page.route("**/api/tokenize", () => {}); // The preview never arrives.
  await page
    .getByRole("textbox", { name: "Your Prompt" })
    .fill(Array.from({ length: 12 }, () => "The tide came in and the boats rose.").join(" "));
  await page.getByRole("button", { name: "Run the model" }).click();
  await expect(page.getByRole("alert")).toContainText(/more than 64 tokens/);
});

test("Live mode warms up while the model loads", async ({ page }) => {
  // The server answers 503 twice, as while the model loads, then is ready.
  let loading = 2;
  await page.route("**/api/health", (route) =>
    loading-- > 0 ? route.fulfill({ status: 503, json: { status: "loading" } }) : route.continue(),
  );
  await page.goto("/?lang=en");
  await page.getByRole("button", { name: "Live mode" }).click();
  await expect(page.getByRole("status").filter({ hasText: "warming up" })).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: "The server is ready" })).toBeVisible({ timeout: 10_000 });
});
