import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator } from "@playwright/test";

// Literals from the committed "village" Example: Position 8 is "·village" (token ID 7404).

const URL = "/?example=village&view=embed&step=0&lang=en";

/** The distinct colors of a strip's fully opaque cells, as CSS rgb() strings. */
function opaqueColors(strip: Locator): Promise<string[]> {
  return strip.locator("canvas").evaluate((canvas: HTMLCanvasElement) => {
    const data = canvas.getContext("2d")!.getImageData(0, 0, canvas.width, canvas.height).data;
    const colors = new Set<string>();
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] === 255) colors.add(`rgb(${data[i]}, ${data[i + 1]}, ${data[i + 2]})`);
    }
    return [...colors];
  });
}

test("embeddings view", async ({ page }) => {
  await page.goto(URL);

  // One row per Position: the token, its token embedding, plus its position embedding, equals what enters block 1.
  const rows = page.getByRole("list", { name: "Embeddings per Position" }).getByRole("listitem");
  await expect(rows).toHaveCount(12);
  const village = rows.nth(8);
  await expect(village).toContainText("·village", { useInnerText: true });
  const tokenStrip = village.getByRole("img", { name: "Token embedding at Position 8" });
  await expect(tokenStrip).toBeVisible();
  await expect(village.getByRole("img", { name: "Position embedding at Position 8" })).toBeVisible();
  await expect(village.getByRole("img", { name: /^Sum at Position 8/ })).toBeVisible();
  await expect(page.getByText(/added number by number/)).toBeVisible();

  // Each strip is 768 numbers, drawn in its Position's color.
  await expect(tokenStrip.locator("canvas")).toHaveAttribute("width", "768");
  const colorOf = (row: Locator) => row.locator(".chip").evaluate((el) => getComputedStyle(el).borderBottomColor);
  const villageColor = await colorOf(village);
  expect(await opaqueColors(tokenStrip)).toContain(villageColor);
  expect(await opaqueColors(rows.nth(9).getByRole("img", { name: "Token embedding at Position 9" }))).not.toContain(
    villageColor,
  );

  // Switching theme redraws the strips in the new theme's colors.
  await page.getByRole("button", { name: "Dark theme" }).click();
  const darkColor = await colorOf(village);
  expect(darkColor).not.toBe(villageColor);
  await expect.poll(() => opaqueColors(tokenStrip)).toContain(darkColor);

  // Details show the first 16 dimensions exactly and the norm, as a truncated view; the keyboard opens them.
  await page.getByText("Show details").focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText(/Truncated view: the first 16 of 768 dimensions/)).toBeVisible();
  const details = page.getByRole("rowgroup").filter({ hasText: "·village" }).getByRole("row");
  await expect(details).toHaveCount(3);
  await expect(details.nth(0)).toContainText("0.077192");
  await expect(details.nth(0)).toContainText("3.358770");
  await expect(details.nth(1)).toContainText("0.111045");
  await expect(details.nth(1)).toContainText("3.850706");
  await expect(details.nth(2)).toContainText("0.149121");
  await expect(details.nth(0)).toContainText("Token ID 7404");
  await expect(details.nth(0)).toContainText("20 76 69 6C 6C 61 67 65");
  await expect(page.getByText(/token embedding table has 50,257 rows of 768 numbers/)).toBeVisible();

  // Stepping on adds the Continuation's Positions.
  await page.getByRole("button", { name: "Next token" }).click();
  await expect(rows).toHaveCount(13);
});

test.describe("on a phone", () => {
  test.use({ viewport: { width: 375, height: 740 } });

  test("the embeddings view fits the screen and passes axe", async ({ page }) => {
    await page.goto(URL);
    const row = page.getByRole("list", { name: "Embeddings per Position" }).getByRole("listitem").nth(8);
    const strip = row.getByRole("img", { name: "Position embedding at Position 8" });
    await expect(strip).toBeVisible();

    // The three strips stack, each wide enough to read and labelled in place.
    expect((await strip.boundingBox())!.width).toBeGreaterThan(250);
    await expect(row.getByText("Position embedding")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);

    for (const summary of await page.getByText("Show details").all()) await summary.click();
    const { violations } = await new AxeBuilder({ page }).analyze();
    expect(violations.map(({ id, nodes }) => ({ id, elements: nodes.map(({ target }) => target.join(" ")) }))).toEqual(
      [],
    );
  });
});
