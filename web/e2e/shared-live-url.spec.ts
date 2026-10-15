import { expect, test, type Page, type Request } from "@playwright/test";

// Against the real inference server. The village Example's Prompt continues ", a" greedily,
// so at Step 2 the sequence is its 12 Prompt tokens plus "," and "·a" (see live-mode.spec.ts).
const VILLAGE = "Once upon a time, in a small village by the sea";

/** A shared Live link to the Prompt at the view state in `query`. */
function sharedLiveUrl(prompt: string, query: string): string {
  return `/?mode=live&${query}#${new URLSearchParams({ prompt })}`;
}

/** The Prompt in the page's URL fragment, if any. */
function fragmentPrompt(page: Page): string | null {
  return new URLSearchParams(new URL(page.url()).hash.slice(1)).get("prompt");
}

function stepRequests(page: Page): Request[] {
  const requests: Request[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === "/api/step") requests.push(request);
  });
  return requests;
}

test("open shared Live URL restores the Prompt and Step with exactly one Step request", async ({ page }) => {
  const requests = stepRequests(page);
  // The Step request is held until the progress indicator has been seen.
  let release!: () => void;
  const held = new Promise<void>((resolve) => (release = resolve));
  await page.route("**/api/step", async (route) => {
    await held;
    await route.continue();
  });

  await page.goto(sharedLiveUrl(VILLAGE, "view=tokenize&step=2&lang=en"));

  const progress = page.getByRole("progressbar", { name: "Restoring the shared run up to Step 2…" });
  await expect(progress).toBeVisible();
  release();
  await expect(progress).toHaveCount(0);

  // The Prompt and every Step up to the shared one are back.
  await expect(page.getByRole("textbox", { name: "Your Prompt" })).toHaveValue(VILLAGE);
  const tokens = page.getByRole("list", { name: "Tokens" }).getByRole("listitem");
  await expect(tokens).toHaveCount(14);
  await expect(tokens.nth(13)).toContainText("·a", { useInnerText: true });
  await expect(page.getByRole("slider", { name: "Step" })).toHaveValue("2");
  await expect(page).toHaveURL(/step=2/);

  // In one Step request with the Prompt text and `advance` 2.
  expect(requests).toHaveLength(1);
  expect(requests[0]!.postDataJSON()).toEqual({ prompt: VILLAGE, advance: 2 });

  // The Prompt stays in the fragment, never the query string.
  const url = new URL(page.url());
  expect(fragmentPrompt(page)).toBe(VILLAGE);
  expect(url.searchParams.has("prompt")).toBe(false);
  expect(decodeURIComponent(url.search)).not.toContain("Once upon");
});

test("in Live mode the Prompt is written to the URL fragment, and Copy link shares it", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/?mode=live&view=predict&lang=en");
  await expect(page.getByRole("status").filter({ hasText: "The server is ready" })).toBeVisible();

  await page.getByRole("textbox", { name: "Your Prompt" }).fill(VILLAGE);
  await expect.poll(() => fragmentPrompt(page)).toBe(VILLAGE);
  expect(new URL(page.url()).searchParams.has("prompt")).toBe(false);
  await page.getByRole("button", { name: "Run the model" }).click();
  await page.getByRole("button", { name: "Next token" }).click();
  await expect(page).toHaveURL(/step=1&lang=en#prompt=Once\+upon/);

  await page.getByRole("button", { name: "Copy link" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Link copied" })).toBeVisible();
  const copied = await page.evaluate(() => navigator.clipboard.readText());

  // The recipient sees the same Prompt at the same Step.
  const opened = await context.newPage();
  const requests = stepRequests(opened);
  await opened.goto(copied);
  await expect(opened.getByRole("textbox", { name: "Your Prompt" })).toHaveValue(VILLAGE);
  const sequence = opened.getByRole("list", { name: "Sequence so far" }).getByRole("listitem");
  await expect(sequence).toHaveCount(13);
  await expect(opened.getByRole("list", { name: "Top 10 next tokens" }).getByRole("listitem").first()).toHaveText(
    /^1\s*·a\s*12\.8%$/,
    { useInnerText: true },
  );
  expect(requests.map((request) => request.postDataJSON())).toEqual([{ prompt: VILLAGE, advance: 1 }]);

  // Example mode carries no Prompt.
  await page.getByRole("button", { name: "Live mode" }).click();
  await expect(page).toHaveURL(/mode=example/);
  expect(new URL(page.url()).hash).toBe("");
});

test("rate limited while restoring a shared Live link says when to continue, then restores it", async ({ page }) => {
  await page.clock.install();
  await page.route("**/api/step", (route) =>
    route.fulfill({
      status: 429,
      headers: { "Retry-After": "30" },
      json: { code: "rate_limited", message: "Rate limited; retry after 30 s." },
    }),
  );
  await page.goto(sharedLiveUrl(VILLAGE, "view=tokenize&step=2&lang=en"));
  const alert = page.getByRole("alert");
  await expect(alert).toContainText("You can continue in 30 seconds.");

  // Once the wait is over, running the Prompt restores the shared Step.
  await page.unroute("**/api/step");
  await page.clock.fastForward(30_000);
  await expect(alert).toHaveCount(0);
  const requests = stepRequests(page);
  await page.getByRole("button", { name: "Run the model" }).click();
  await expect(page.getByRole("list", { name: "Tokens" }).getByRole("listitem")).toHaveCount(14);
  await expect(page.getByRole("slider", { name: "Step" })).toHaveValue("2");
  expect(requests.map((request) => request.postDataJSON())).toEqual([{ prompt: VILLAGE, advance: 2 }]);
});

test("Back, Forward or a link that changes only the fragment restores the Prompt in the URL", async ({ page }) => {
  const other = "The old lighthouse keeper climbed the stairs";
  const requests = stepRequests(page);
  await page.goto(sharedLiveUrl(VILLAGE, "view=tokenize&step=1&lang=en"));
  const prompt = page.getByRole("textbox", { name: "Your Prompt" });
  const tokens = page.getByRole("list", { name: "Tokens" }).getByRole("listitem");
  await expect(tokens).toHaveCount(13);

  // The same URL with another Prompt in its fragment: the page stays, and that Prompt is restored.
  const url = new URL(page.url());
  url.hash = new URLSearchParams({ prompt: other }).toString();
  await page.goto(url.href);
  await expect(prompt).toHaveValue(other);
  await expect(page.getByRole("slider", { name: "Step" })).toHaveValue("1");
  expect(fragmentPrompt(page)).toBe(other);

  await page.goBack();
  await expect(prompt).toHaveValue(VILLAGE);
  await expect(tokens).toHaveCount(13);
  expect(requests.map((request) => request.postDataJSON())).toEqual([
    { prompt: VILLAGE, advance: 1 },
    { prompt: other, advance: 1 },
    { prompt: VILLAGE, advance: 1 },
  ]);
});
