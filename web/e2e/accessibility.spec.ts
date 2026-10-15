import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// The main views axe checks, each in both themes. Adding a view is one line here.
const MAIN_VIEWS = [
  "/?example=village&view=tokenize&step=5&lang=en",
  "/?example=village&view=embed&step=5&lang=en",
  "/?example=village&view=blocks&layer=4&step=5&lang=en",
  "/?example=village&view=predict&step=5&lang=en",
  "/?example=village&view=attention&layer=5&head=12&step=5&lang=en",
  "/?example=village&view=architecture&lang=en",
];

// Each theme as the system setting gives it, and as the toggle picks it against the
// system setting: the stylesheet defines the dark theme once for each.
const THEMES = [
  { name: "light theme", colorScheme: "light", toggle: false },
  { name: "dark theme", colorScheme: "dark", toggle: false },
  { name: "dark theme picked with the toggle", colorScheme: "light", toggle: true },
  { name: "light theme picked with the toggle", colorScheme: "dark", toggle: true },
] as const;

for (const { name, colorScheme, toggle } of THEMES) {
  test.describe(name, () => {
    test.use({ colorScheme });

    for (const url of MAIN_VIEWS) {
      test(`axe finds no violations on ${url}`, async ({ page }) => {
        await page.goto(url);
        await expect(page.getByRole("heading", { level: 2 }).first()).toBeVisible();
        if (toggle) await page.getByRole("button", { name: "Dark theme" }).click();
        // Check the exact numbers too, not only the summaries.
        for (const summary of await page.getByText("Show details").all()) await summary.click();

        const { violations } = await new AxeBuilder({ page }).analyze();
        // Rule IDs and the elements they flag; the rules are explained at dequeuniversity.com/rules/axe.
        const flagged = violations.map(({ id, nodes }) => ({ id, elements: nodes.map(({ target }) => target.join(" ")) }));
        expect(flagged).toEqual([]);
      });
    }
  });
}
