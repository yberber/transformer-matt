import { expect, test } from "@playwright/test";

test("open Example shows the Prompt's tokens", async ({ page }) => {
  await page.goto("/");

  const tokens = page.getByRole("list", { name: "Prompt tokens" }).getByRole("listitem");
  await expect(tokens).toHaveText(
    [
    "Token",
    "izers",
    "·split",
    "·words",
    "·like",
    "·E2 98",
    "95",
    "·into",
    "·pieces",
    ".",
    "↵",
    "→",
    "Even",
    "·tabs",
    "·and",
    "·new",
    "lines",
    ],
    { useInnerText: true },
  );

  // Each Position gets its own color, cycling through the 10-hue palette.
  const colorOf = (position: number) =>
    tokens.nth(position).evaluate((el) => getComputedStyle(el).borderBottomColor);
  expect(await colorOf(0)).not.toBe(await colorOf(1));
  expect(await colorOf(0)).toBe(await colorOf(10));

  // A character split across tokens shows a byte marker with a tooltip.
  const byteMarker = tokens.nth(6).getByRole("button", { name: "95" });
  await byteMarker.hover();
  await expect(page.getByRole("tooltip")).toContainText("part of a character");

  // Details show each token's raw bytes and token ID.
  await page.getByText("Show details").click();
  const row = page.getByRole("row").filter({ hasText: "34719" });
  await expect(row.getByRole("cell")).toHaveText(["5", "·E2 98", "34719", "20 E2 98"], {
    useInnerText: true,
  });
});
