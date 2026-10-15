import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// The village Example's Prompt is 12 tokens. Worked out by hand (see tests/flops.test.ts): one
// token reading n Positions costs 247,064,064 + 36,864n FLOPs, and a Prompt of P tokens
// P × 247,064,064 + 36,864 × P(P+1)/2. At Step 5:
//   prefill(12) = 2,967,644,160, so 247,303,680 per Prompt token;
//   the next token reads 18 Positions: 247,727,616;
//   the text so far is prefill(17) = 4,205,729,280, of which the 5 Steps' decodes are 1,238,085,120;
//   the KV cache holds 17 Positions × 73,728 bytes = 1,253,376 bytes.

test("read the statistics", async ({ page }) => {
  await page.goto("/?example=village&view=blocks&step=5&lang=en");
  await page.getByRole("navigation", { name: "More about the model" }).getByRole("link", { name: "Statistics" }).click();
  await expect(page).toHaveURL(/view=statistics/);
  await expect(page.getByRole("heading", { level: 2 })).toHaveText("Statistics");

  // Prefill and decode per token.
  await expect(page.getByRole("group", { name: "Prefill, per Prompt token" })).toContainText("247 million FLOPs");
  await expect(page.getByRole("group", { name: "Decode, the next token" })).toContainText("248 million FLOPs");
  await expect(page.getByRole("group", { name: "Decode, the next token" })).toContainText("reading 18 Positions");

  // Totals for the text so far.
  const totals = page.getByRole("region", { name: "This text so far" });
  await expect(totals).toContainText("2.97 billion FLOPs");
  await expect(totals).toContainText("1.24 billion FLOPs");
  await expect(totals).toContainText("4.21 billion FLOPs");
  await expect(totals).toContainText("1.25 MB");

  // The breakdown by component: embeddings are 0 FLOPs, with why; the excluded operations are listed.
  const breakdown = page.getByRole("table", { name: "Where the compute goes" });
  await expect(breakdown.getByRole("row", { name: /^Embeddings/ })).toContainText("0");
  await expect(page.getByText(/a lookup copies a row of the table/)).toBeVisible();
  await expect(page.getByText(/Not counted: softmax, LayerNorm, GELU, residual adds/)).toBeVisible();

  // Per layer: one stacked bar ×12, and a toggle to show all 12.
  const layers = page.getByRole("list", { name: "FLOPs per layer" });
  await expect(layers.getByRole("listitem")).toHaveCount(1);
  await expect(layers).toContainText("×12");
  const toggle = page.getByRole("button", { name: "Show all 12 layers" });
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(layers.getByRole("listitem")).toHaveCount(12);
  await expect(layers.getByRole("listitem").nth(11)).toContainText("Layer 12");

  // Stepping updates the totals: the text is then prefill(18) = 4,453,456,896.
  await page.getByRole("button", { name: "Next token" }).click();
  await expect(totals).toContainText("4.45 billion FLOPs");

  // The exact numbers behind them.
  await page.getByText("Show details").click();
  const exact = page.getByRole("table", { name: "Every Estimate, exactly" });
  await expect(exact.getByRole("row", { name: /^Total/ })).toContainText("4,453,456,896");

  // Every figure is a theoretical Estimate, linked to how it is calculated.
  const estimates = page.getByRole("link", { name: "Theoretical Estimate: how we calculate" });
  expect(await estimates.count()).toBeGreaterThanOrEqual(5);
  await estimates.first().click();
  await expect(page).toHaveURL(/view=calculate/);
  await expect(page.getByRole("heading", { level: 2 })).toHaveText("How we calculate");
});

test("how we calculate documents every formula and what is left out, in every language", async ({ page }) => {
  await page.goto("/?example=village&view=calculate&lang=en");
  await expect(page.getByRole("heading", { level: 2 })).toHaveText("How we calculate");
  await expect(page.getByText("2 FLOPs", { exact: false }).first()).toBeVisible();
  const perLayer = page.getByRole("table", { name: "One token, in one layer" });
  await expect(perLayer.getByRole("row", { name: /^Fused QKV/ })).toContainText("3,538,944");
  await expect(perLayer.getByRole("row", { name: /^Attention scores/ })).toContainText("1,536 · n");
  await expect(perLayer.getByRole("row", { name: /^MLP/ })).toContainText("9,437,184");
  await expect(page.getByText("247,064,064 + 36,864 · n")).toBeVisible();
  await expect(page.getByText("73,728 · n bytes")).toBeVisible();
  for (const left of ["Softmax", "LayerNorm", "GELU", "Residual adds"]) {
    await expect(page.getByRole("list", { name: "Not counted" })).toContainText(left);
  }

  await page.getByLabel("Language").selectOption("Türkçe");
  await expect(page.getByRole("heading", { level: 2 })).toHaveText("Nasıl hesaplıyoruz");
  await expect(page.getByText("247.064.064 + 36.864 · n")).toBeVisible();

  await page.getByLabel("Dil").selectOption("Deutsch");
  await expect(page.getByRole("heading", { level: 2 })).toHaveText("So rechnen wir");
  await expect(page.getByText("247.064.064 + 36.864 · n")).toBeVisible();
});

test.describe("on a phone", () => {
  test.use({ viewport: { width: 375, height: 740 } });

  for (const view of ["statistics", "calculate"]) {
    test(`the ${view} page fits the screen and passes axe`, async ({ page }) => {
      await page.goto(`/?example=moon&view=${view}&step=16&lang=en`);
      await expect(page.getByRole("heading", { level: 2 })).toBeVisible();
      const toggle = page.getByRole("button", { name: "Show all 12 layers" });
      if (await toggle.count()) await toggle.click();
      for (const summary of await page.getByText("Show details").all()) await summary.click();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);

      const { violations } = await new AxeBuilder({ page }).analyze();
      expect(
        violations.map(({ id, nodes }) => ({ id, elements: nodes.map(({ target }) => target.join(" ")) })),
      ).toEqual([]);
    });
  }
});
