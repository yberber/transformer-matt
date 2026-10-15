import { expect, test } from "@playwright/test";

test("open Example shows the Prompt's tokens", async ({ page }) => {
  await page.goto("/");

  // The default Example opens at Step 0: the Prompt alone.
  const tokens = page.getByRole("list", { name: "Tokens" }).getByRole("listitem");
  await expect(tokens).toHaveText(
    ["Once", "·upon", "·a", "·time", ",", "·in", "·a", "·small", "·village", "·by", "·the", "·sea"],
    { useInnerText: true },
  );

  // Each Position gets its own color, cycling through the 10-hue palette.
  const colorOf = (position: number) =>
    tokens.nth(position).getByRole("button").evaluate((el) => getComputedStyle(el).borderBottomColor);
  expect(await colorOf(0)).not.toBe(await colorOf(1));
  expect(await colorOf(0)).toBe(await colorOf(10));

  // Details show each token's raw bytes and token ID, and the top prediction made at its Position.
  await page.getByText("Show details").click();
  const row = page.getByRole("row").filter({ hasText: "7404" });
  await expect(row.getByRole("cell")).toHaveText(["8", "·village", "7404", "20 76 69 6C 6C 61 67 65", ",", "36.1%"], {
    useInnerText: true,
  });
});

test("newlines, tabs and characters split across tokens stay visible", async ({ page }) => {
  // No English Example has these, but Live mode can. Serve the default Example with
  // "☕" (E2 98 95) split across its second and third tokens, and a newline and a
  // tab as its fourth and fifth.
  await page.route("**/data/examples/village.json", async (route) => {
    const trace = await (await route.fetch()).json();
    const setBytes = (position: number, bytes: number[]) =>
      (trace.positions[position].token_bytes = Buffer.from(bytes).toString("base64"));
    setBytes(1, [0x20, 0xe2, 0x98]);
    setBytes(2, [0x95]);
    setBytes(3, [0x0a]);
    setBytes(4, [0x09]);
    await route.fulfill({ json: trace });
  });
  await page.goto("/?example=village&view=tokenize&step=0&lang=en");

  const tokens = page.getByRole("list", { name: "Tokens" }).getByRole("listitem");
  await expect(tokens.nth(3).getByRole("img", { name: "newline" })).toHaveText("↵");
  await expect(tokens.nth(4).getByRole("img", { name: "tab" })).toHaveText("→");

  await expect(tokens.nth(1)).toHaveText("·E2 98", { useInnerText: true });
  await expect(tokens.nth(2)).toHaveText("95", { useInnerText: true });
  await tokens.nth(2).hover();
  await expect(page.getByRole("tooltip").filter({ visible: true })).toContainText("Bytes 95 are part of a character");

  // In the details table the byte marker is its own control, with its own tooltip.

  await page.getByText("Show details").click();
  const row = page.getByRole("row").filter({ hasText: "2402" });
  await expect(row.getByRole("cell").nth(3)).toHaveText("20 E2 98");
  await row.getByRole("button", { name: "E2 98" }).hover();
  await expect(page.getByRole("tooltip").filter({ visible: true })).toContainText("Bytes E2 98 are part of a character");
});
