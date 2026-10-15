import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Literals from the committed "village" Example: "Once upon a time, in a small village by the sea"
// is 12 Prompt tokens. From Position 11 ("·sea"), layer 1 head 1 gives "·upon" 14/255 (5.5%)
// "Once" 27/255 (10.6%) and "·village" 59/255 (23.1%); layer 1 head 2 looks at "·sea" itself (254/255, 99.6%);
// layer 5 head 12 looks only at the previous token, "·the" (255/255).

test("change head", async ({ page }) => {
  // The Blocks view links to the attention heatmap.
  await page.goto("/?example=village&view=blocks&step=0&lang=en");
  await page.getByRole("link", { name: /attention heatmap/ }).click();
  await expect(page).toHaveURL(/view=attention/);
  await expect(page).toHaveURL(/layer=1&head=1/);
  await expect(page.getByRole("heading", { level: 2 })).toHaveText("Attention");
  await expect(page.getByRole("navigation", { name: "Pipeline" }).getByRole("button", { name: /Blocks/ })).toHaveAttribute(
    "aria-current",
    "step",
  );

  // Rows and columns are labelled with the tokens.
  const heatmap = page.getByRole("application", { name: /Attention heatmap/ });
  await expect(heatmap).toBeVisible();
  await expect(page.getByTestId("query-labels").getByText("·village")).toBeVisible();
  await expect(page.getByTestId("key-labels").getByText("·village")).toBeVisible();
  await expect(page.getByText(/first token/).first()).toBeVisible();

  // The heatmap is one tab stop; arrow keys move between cells and each cell is announced.
  const announced = page.getByRole("status").filter({ hasText: "→" });
  await heatmap.focus();
  await expect(announced).toHaveText("sea (Position 11) → Once (Position 0): 10.6%");
  await page.keyboard.press("ArrowRight");
  await expect(announced).toHaveText("sea (Position 11) → upon (Position 1): 5.5%");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowLeft");
  await expect(announced).toHaveText("sea (Position 11) → upon (Position 1): 5.5%");

  // A native select changes the head, and the head goes into the URL.
  await page.getByRole("combobox", { name: "Head" }).selectOption("2");
  await expect(page).toHaveURL(/head=2/);
  await heatmap.focus();
  await page.keyboard.press("End");
  await expect(announced).toContainText("sea (Position 11) → sea (Position 11): 99.6%");

  // ] and [ switch head from the keyboard.
  await page.keyboard.press("]");
  await expect(page).toHaveURL(/head=3/);
  await expect(page.getByRole("combobox", { name: "Head" })).toHaveValue("3");
  await expect(announced).toContainText("Layer 1, head 3");
  await page.keyboard.press("[");
  await page.keyboard.press("[");
  await expect(page).toHaveURL(/head=1/);
  await page.keyboard.press("[");
  await expect(page).toHaveURL(/head=12/);

  // Layer 5, head 12 looks only at the previous token.
  await page.getByRole("combobox", { name: "Layer" }).selectOption("5");
  await expect(page).toHaveURL(/layer=5&head=12/);
  await heatmap.focus();
  await page.keyboard.press("ArrowLeft");
  await expect(announced).toContainText("sea (Position 11) → the (Position 10): 100.0%");

  // Details show that row's exact weights.
  await page.getByText("Show details").click();
  const details = page.getByRole("table", { name: /Position 11/ });
  await expect(details.getByRole("row").filter({ hasText: "·the" })).toContainText("1.000", { useInnerText: true });
  await expect(details.getByRole("row").filter({ hasText: "Once" })).toContainText("0.000");

  // A reload reopens the same layer and head.
  await page.reload();
  await expect(page.getByRole("combobox", { name: "Layer" })).toHaveValue("5");
  await expect(page.getByRole("combobox", { name: "Head" })).toHaveValue("12");
});

test.describe("on a phone", () => {
  test.use({ viewport: { width: 375, height: 740 } });

  test("a query-token chooser with a ranked list replaces the heatmap, and passes axe", async ({ page }) => {
    await page.goto("/?example=village&view=attention&layer=1&head=1&step=0&lang=en");

    await expect(page.getByRole("application", { name: /Attention heatmap/ })).toBeHidden();
    await expect(page.getByRole("img", { name: /Overview/ })).toBeVisible();

    // Choose a query token, then read where it looks, most attention first.
    await page.getByRole("combobox", { name: "Query token" }).selectOption({ label: "Position 11: sea" });
    const ranked = page.getByRole("list", { name: /Where sea \(Position 11\) looks/ }).getByRole("listitem");
    await expect(ranked.first()).toContainText("·village", { useInnerText: true });
    await expect(ranked.first()).toContainText("23.1%");
    await expect(ranked.nth(1)).toContainText("·sea", { useInnerText: true });

    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);

    for (const summary of await page.getByText("Show details").all()) await summary.click();
    const { violations } = await new AxeBuilder({ page }).analyze();
    expect(violations.map(({ id, nodes }) => ({ id, elements: nodes.map(({ target }) => target.join(" ")) }))).toEqual(
      [],
    );
  });
});
