import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Literals from the committed "village" Example: "Once upon a time, in a small village by the sea"
// is 12 Prompt tokens, so at Step 0 the last Position is 11 ("·sea"). There the logit lens after
// layer 1 guesses "·sea" (92.8%), after layer 2 "·sea" (62.3%), after layer 4 "plane" (62.4%) and
// after layer 12 the prediction itself, "," (0.724037, token ID 11). Averaged over layer 4's heads,
// "·sea" looks most at "Once" (40.7%), then "·by" (21.8%). The MLP's impact on "·village"
// (Position 8) is 0.989093 in layer 1 and 0.160786 in layer 12. At Step 1 the last Position is
// 12 (","), and after layer 12 it guesses "·a" (12.8%).

const URL = "/?example=village&view=blocks&step=0&lang=en";

test("step through layers", async ({ page }) => {
  await page.goto(URL);
  await expect(page.getByRole("heading", { level: 2 })).toHaveText("Blocks");
  await expect(page).toHaveURL(/layer=1/);

  const layers = page.getByRole("group", { name: "Layers" });
  const lens = page.getByRole("list", { name: /^Logit lens/ }).getByRole("listitem");
  const attention = page.getByRole("list", { name: /^Where .* looks/ }).getByRole("listitem");
  const mlp = page.getByRole("list", { name: /^MLP impact/ }).getByRole("listitem");

  // Layer 1: the logit lens at the last Position, the MLP's impact on every Position.
  await expect(layers.getByRole("button", { name: /^Layer 1\b/ })).toHaveAttribute("aria-current", "true");
  await expect(lens).toHaveCount(5);
  await expect(lens.first()).toContainText("·sea", { useInnerText: true });
  await expect(lens.first()).toContainText("92.8%");
  await expect(mlp).toHaveCount(12);
  await expect(mlp.nth(8)).toContainText("·village", { useInnerText: true });
  await expect(mlp.nth(8)).toContainText("98.9%");

  // The next-layer button works from the keyboard and puts the layer in the URL.
  await layers.getByRole("button", { name: "Next layer" }).focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/layer=2/);
  await expect(page.getByText("Layer 2 of 12")).toBeVisible();
  await expect(lens.first()).toContainText("62.3%");

  // Any layer can be picked directly.
  await layers.getByRole("button", { name: /^Layer 4\b/ }).click();
  await expect(page).toHaveURL(/layer=4/);
  await expect(lens.first()).toContainText("plane");
  await expect(lens.first()).toContainText("62.4%");
  await expect(attention.first()).toContainText("Once");
  await expect(attention.first()).toContainText("40.7%");
  await expect(attention.nth(1)).toContainText("·by", { useInnerText: true });
  await expect(attention.nth(1)).toContainText("21.8%");

  // After the last layer the logit lens is the prediction itself, and there is no next layer.
  await layers.getByRole("button", { name: /^Layer 12\b/ }).focus();
  await page.keyboard.press("Space");
  await expect(page).toHaveURL(/layer=12/);
  await expect(layers.getByRole("button", { name: "Next layer" })).toBeDisabled();
  await expect(lens.first()).toContainText(",");
  await expect(lens.first()).toContainText("72.4%");

  // Details show the exact MLP impacts and logit-lens probabilities.
  await page.getByText("Show details").click();
  const impacts = page.getByRole("table", { name: /MLP impact/ });
  await expect(impacts.getByRole("row").filter({ hasText: "·village" })).toContainText("0.160786", { useInnerText: true });
  const lensTable = page.getByRole("table", { name: /Logit lens/ });
  await expect(lensTable.getByRole("row").nth(1)).toContainText("0.724037");
  await expect(lensTable.getByRole("row").nth(1)).toContainText("11");

  // Stepping on moves the logit lens to the new last Position.
  await page.getByRole("button", { name: "Next token" }).click();
  await expect(mlp).toHaveCount(13);
  await expect(lens.first()).toContainText("·a", { useInnerText: true });
  await expect(lens.first()).toContainText("12.8%");

  // The attention summary links to the heatmap at the same layer.
  await page.getByRole("link", { name: /attention heatmap/ }).click();
  await expect(page).toHaveURL(/view=attention/);
  await expect(page.getByRole("combobox", { name: "Layer" })).toHaveValue("12");

  // Back on Blocks, a reload keeps the layer.
  await page.goBack();
  await page.reload();
  await expect(layers.getByRole("button", { name: /^Layer 12\b/ })).toHaveAttribute("aria-current", "true");
});

test.describe("on a phone", () => {
  test.use({ viewport: { width: 375, height: 740 } });

  test("the blocks view fits the screen and passes axe", async ({ page }) => {
    await page.goto("/?example=moon&view=blocks&layer=7&step=16&lang=en");
    await expect(page.getByRole("group", { name: "Layers" }).getByRole("button", { name: /^Layer 7\b/ })).toBeVisible();
    await expect(page.getByRole("list", { name: /^MLP impact/ }).getByRole("listitem")).toHaveCount(62);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);

    for (const summary of await page.getByText("Show details").all()) await summary.click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
    const { violations } = await new AxeBuilder({ page }).analyze();
    expect(violations.map(({ id, nodes }) => ({ id, elements: nodes.map(({ target }) => target.join(" ")) }))).toEqual(
      [],
    );
  });
});
