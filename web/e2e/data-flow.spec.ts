import { expect, test, type Page } from "@playwright/test";

// Literals from the committed "village" Example: 12 Prompt tokens at Step 0, so the token that
// Step 1 appends sits at Position 12.

const TOKENIZE_URL = "/?example=village&view=tokenize&step=0&lang=en";
const PREDICT_URL = "/?example=village&view=predict&step=0&lang=en";
const TOKENIZE_STEP_3_URL = "/?example=village&view=tokenize&step=3&lang=en";

declare global {
  interface Window {
    animated: Element[];
  }
}

/** Records every element whose animation starts from now on. */
async function recordAnimations(page: Page) {
  await page.evaluate(() => {
    window.animated = [];
    document.addEventListener("animationstart", (event) => window.animated.push(event.target as Element));
  });
}

/** The colors of the beads moving in the pipeline strip, one list per animated element. */
function movingColors(page: Page) {
  return page.evaluate(() =>
    window.animated
      .filter((element) => element.closest('nav[aria-label="Pipeline"]'))
      .map((element) =>
        [element, ...element.querySelectorAll("*")]
          .map((bead) => getComputedStyle(bead).backgroundColor)
          .filter((color) => color !== "rgba(0, 0, 0, 0)"),
      ),
  );
}

/** The colors of the view's token chips, in Position order. */
function chipColors(page: Page, list: string) {
  return page
    .getByRole("list", { name: list })
    .getByRole("listitem")
    .evaluateAll((items) => items.map((item) => getComputedStyle(item.querySelector(".chip") ?? item).borderBottomColor));
}

function station(page: Page, name: string) {
  return page.getByRole("navigation", { name: "Pipeline" }).getByRole("button", { name: new RegExp(name) });
}

test("moving to a later stage animates the tokens flowing there, in their Position colors", async ({ page }) => {
  await page.goto(TOKENIZE_URL);
  const colors = await chipColors(page, "Tokens");
  expect(colors).toHaveLength(12);

  await recordAnimations(page);
  await station(page, "Predict").click();
  await expect(page.getByRole("heading", { level: 2 })).toHaveText("Predict");

  // Every tube between Tokenize and Predict carries the whole sequence along, Position by Position.
  await expect.poll(() => movingColors(page)).toEqual([colors, colors, colors]);
  // The motion ends on its own.
  await expect.poll(() => page.evaluate(() => document.getAnimations().length)).toBe(0);
});

test("appending a Step animates the new token entering the pipeline, in its Position color", async ({ page }) => {
  await page.goto(PREDICT_URL);
  await expect(page.getByRole("list", { name: "Sequence so far" }).getByRole("listitem")).toHaveCount(12);

  await recordAnimations(page);
  await page.getByRole("button", { name: "Next token" }).click();
  await expect(page.getByRole("list", { name: "Sequence so far" }).getByRole("listitem")).toHaveCount(13);
  const newColor = (await chipColors(page, "Sequence so far"))[12];

  // Only the new token moves: back to the inlet and on through the tubes.
  await expect.poll(() => movingColors(page)).toContainEqual([newColor]);
  await expect.poll(() => page.evaluate(() => document.getAnimations().length)).toBe(0);
  for (const colors of await movingColors(page)) expect(colors).toEqual([newColor]);
});

test("going back to an earlier stage cuts instantly, even when Back raises the Step", async ({ page }) => {
  await page.goto(TOKENIZE_STEP_3_URL);
  await station(page, "Predict").click();
  await expect(page.getByRole("heading", { level: 2 })).toHaveText("Predict");
  await page.getByRole("slider", { name: "Step" }).fill("1");
  await expect(page).toHaveURL(/step=1/);
  await expect.poll(() => page.evaluate(() => document.getAnimations().length)).toBe(0);

  // Back returns to Tokenize at Step 3: a move back in history, not a new token.
  await recordAnimations(page);
  await page.goBack();
  await expect(page.getByRole("heading", { level: 2 })).toHaveText("Tokenize");
  await expect(page).toHaveURL(/step=3/);
  expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
  expect(await movingColors(page)).toEqual([]);
});

test.describe("with reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("stage changes and new Steps complete without animation", async ({ page }) => {
    await page.goto(TOKENIZE_URL);
    await expect(page.getByRole("list", { name: "Tokens" }).getByRole("listitem")).toHaveCount(12);
    await recordAnimations(page);

    // The same moves animate above; here each is an instant cut.
    await station(page, "Predict").click();
    await expect(page.getByRole("heading", { level: 2 })).toHaveText("Predict");
    expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);

    await page.getByRole("button", { name: "Next token" }).click();
    await expect(page.getByRole("list", { name: "Sequence so far" }).getByRole("listitem")).toHaveCount(13);
    expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);

    // Nothing started in between, either.
    expect(await page.evaluate(() => window.animated.length)).toBe(0);
  });
});
