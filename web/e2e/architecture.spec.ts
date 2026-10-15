import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// GPT-2 small's parameters, worked out by hand from its config (vocab_size 50257,
// n_positions 1024, n_embd 768, n_layer 12, n_head 12): 124,439,808 in all. The token embedding
// is 50,257 × 768 = 38,597,376 (31.0%); a fused QKV weight is 768 × 2,304 = 1,769,472 (1.42%),
// 21,233,664 (17.1%) over the 12 blocks; its bias is 2,304 (0.00185%).

test("explore the architecture", async ({ page }) => {
  await page.goto("/?example=village&view=blocks&lang=en");
  await page.getByRole("navigation", { name: "More about the model" }).getByRole("link", { name: "Architecture" }).click();
  await expect(page).toHaveURL(/view=architecture/);
  await expect(page.getByRole("heading", { level: 2 })).toHaveText("Architecture");
  const status = page.getByRole("status").filter({ hasText: /parameters/ });

  // The blocks are drawn once with ×12, all collapsed.
  await expect(page.getByRole("heading", { name: "Transformer block ×12" })).toBeVisible();
  const expanders = page.getByRole("group", { name: "Expand block" }).getByRole("button");
  const expander = (n: number) => expanders.and(page.getByRole("button", { name: `Block ${n}`, exact: true }));
  await expect(expanders).toHaveCount(12);
  await expect(page.getByRole("button", { name: /^Fused QKV/ })).toHaveCount(0);

  // A tensor outside the blocks: its shape, parameter count and share.
  await page.getByRole("button", { name: /^Token embedding weight/ }).click();
  await expect(status).toHaveText("Token embedding weight: 50,257 × 768, 38,597,376 parameters, 31.0% of all parameters.");
  await expect(page.locator("dl").getByText("wte.weight", { exact: true })).toBeVisible();

  // Any block expands from the keyboard; its tensors then show with the block's own names.
  await expander(5).focus();
  await page.keyboard.press("Enter");
  await expect(expander(5)).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("heading", { name: "Block 5 of 12" })).toBeVisible();

  await page.getByRole("button", { name: /^Fused QKV weight/ }).click();
  await expect(status).toHaveText("Block 5, Fused QKV weight: 768 × 2,304, 1,769,472 parameters, 1.42% of all parameters.");
  const card = page.locator("dl").filter({ hasText: "h.4.attn.c_attn.weight" });
  await expect(card).toContainText("1.42% of 124,439,808");
  await expect(card).toContainText("21,233,664 (17.1%)");
  await expect(page.getByText(/its columns are Q, K and V, each split into 12 heads of 64/)).toBeVisible();

  // Weights and biases are separate tensors.
  await page.getByRole("button", { name: /^Fused QKV bias/ }).click();
  await expect(status).toHaveText("Block 5, Fused QKV bias: 2,304, 2,304 parameters, 0.00185% of all parameters.");

  // Expanding another block shows the same tensor there.
  await expander(12).click();
  await expect(page.locator("dl").getByText("h.11.attn.c_attn.bias", { exact: true })).toBeVisible();
  await expect(expander(5)).toHaveAttribute("aria-expanded", "false");

  // The LM head is tied to the token embedding, and counted once.
  await page.getByRole("button", { name: /^LM head weight/ }).click();
  await expect(status).toHaveText("LM head weight: 50,257 × 768, the same matrix as wte.weight, so it adds no parameters.");
  await expect(page.getByText(/124,439,808 parameters in all/)).toContainText("The LM head adds none.");

  // Details list every tensor exactly.
  await page.getByText("Show details").click();
  const table = page.getByRole("table", { name: "Every parameter tensor, exactly" });
  await expect(table.getByRole("row", { name: /lm_head\.weight/ })).toContainText("tied to wte.weight");
  await expect(table.getByRole("row", { name: /^Total/ })).toContainText("124,439,808");

  // A reload keeps the page.
  await page.reload();
  await expect(page.getByRole("heading", { level: 2 })).toHaveText("Architecture");
});

test.describe("on a phone", () => {
  test.use({ viewport: { width: 375, height: 740 } });

  test("the architecture view fits the screen and passes axe", async ({ page }) => {
    await page.goto("/?example=moon&view=architecture&lang=en");
    await page.getByRole("group", { name: "Expand block" }).getByRole("button", { name: "Block 7" }).click();
    await page.getByRole("button", { name: /^MLP down projection weight/ }).click();
    await expect(page.getByText("h.6.mlp.c_proj.weight", { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);

    await page.getByText("Show details").click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
    const { violations } = await new AxeBuilder({ page }).analyze();
    expect(violations.map(({ id, nodes }) => ({ id, elements: nodes.map(({ target }) => target.join(" ")) }))).toEqual(
      [],
    );
  });
});
