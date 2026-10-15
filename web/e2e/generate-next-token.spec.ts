import { expect, test } from "@playwright/test";

// Literals from the committed "village" Example: "Once upon a time, in a small village by the sea"
// is 12 Prompt tokens, and its greedy Continuation starts ", a man named".

test("generate next token", async ({ page }) => {
  await page.goto("/?example=village&view=predict&lang=en");

  // The prediction view ranks the top 10 next tokens and says decoding is greedy.
  const sequence = page.getByRole("list", { name: "Sequence so far" }).getByRole("listitem");
  const ranked = page.getByRole("list", { name: "Top 10 next tokens" }).getByRole("listitem");
  await expect(sequence).toHaveCount(12);
  await expect(ranked).toHaveCount(10);
  await expect(ranked.first()).toHaveText(/^1\s*,\s*72\.4%$/, { useInnerText: true });
  await expect(page.getByText(/other 50,247 tokens/)).toBeVisible();
  await expect(page.getByText(/greedy/).first()).toBeVisible();

  // Asking for the next token appends the top-1 token, and the Step goes into the URL.
  await page.getByRole("button", { name: "Next token" }).click();
  await expect(page).toHaveURL(/step=1/);
  await expect(sequence).toHaveCount(13);
  await expect(sequence.nth(12)).toHaveText(",");
  await expect(ranked.first()).toHaveText(/^1\s*·a\s*12\.8%$/, { useInnerText: true });
  await expect(page.getByText("next", { exact: true })).toBeVisible();

  // Every view shows the extended sequence.
  await page.getByRole("navigation", { name: "Pipeline" }).getByRole("button", { name: /Tokenize/ }).click();
  const tokens = page.getByRole("list", { name: "Tokens" }).getByRole("listitem");
  await expect(tokens).toHaveCount(13);
  await expect(page.getByText("Step 1 of 16").first()).toBeVisible();

  // Prev goes back a Step.
  await page.getByRole("button", { name: "Previous Step" }).click();
  await expect(page).toHaveURL(/step=0/);
  await expect(tokens).toHaveCount(12);

  // Hovering a Prompt token shows the prediction made at that Position.
  await tokens.nth(1).hover();
  const tooltip = page.getByRole("tooltip").filter({ visible: true });
  await expect(tooltip).toContainText("39.1%");
  await expect(tooltip).toContainText("·a", { useInnerText: true });

  // The scrubber reaches the last precomputed Step, where next is disabled with an explanation.
  await page.getByRole("slider", { name: "Step" }).fill("16");
  await expect(page).toHaveURL(/step=16/);
  await expect(tokens).toHaveCount(28);
  const next = page.getByRole("button", { name: "Next token" });
  await expect(next).toBeDisabled();
  await expect(next).toHaveAccessibleDescription(/All 16 precomputed Steps/);
  await expect(page.getByText(/All 16 precomputed Steps/)).toBeVisible();
  await page.getByRole("navigation", { name: "Pipeline" }).getByRole("button", { name: /Predict/ }).click();
  await expect(ranked).toHaveCount(10);
  await expect(page.getByText("next", { exact: true })).toHaveCount(0);
  await page.getByRole("navigation", { name: "Pipeline" }).getByRole("button", { name: /Tokenize/ }).click();

  // A reload restores the Step from the URL.
  await page.reload();
  await expect(tokens).toHaveCount(28);
  await expect(page.getByRole("slider", { name: "Step" })).toHaveValue("16");
});

test("the Example picker offers six Examples labelled short, medium and long", async ({ page }) => {
  await page.goto("/?example=village&view=tokenize&step=5&lang=en");

  const picker = page.getByRole("combobox", { name: "Example" });
  for (const band of ["Short", "Medium", "Long"]) {
    await expect(picker.locator(`optgroup[label="${band}"] option`)).toHaveCount(2);
  }

  // Choosing another Example starts it at Step 0.
  await picker.selectOption({ label: "The drifting Moon" });
  await expect(page).toHaveURL(/example=moon/);
  await expect(page).toHaveURL(/step=0/);
  await expect(page.getByRole("list", { name: "Tokens" }).getByRole("listitem")).toHaveCount(46);
});
