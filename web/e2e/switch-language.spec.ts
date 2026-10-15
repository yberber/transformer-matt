import { expect, test } from "@playwright/test";

test.describe("with a Turkish browser", () => {
  test.use({ locale: "tr-TR" });

  test("switch language", async ({ page }) => {
    await page.goto("/");

    // The UI starts in the browser's language.
    await expect(page.locator("html")).toHaveAttribute("lang", "tr");
    await expect(page.getByRole("heading", { level: 2 })).toHaveText("Tokenleştir");
    await expect(page.getByText(/Örnekler İngilizcedir/)).toBeVisible();

    // Technical terms stay in English, with a short explanation in Turkish.
    const term = page.getByRole("button", { name: "token", exact: true });
    await term.click();
    await expect(term).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByText("modelin okuduğu metin birimi", { exact: false })).toBeVisible();

    // Switching language changes the UI at once and is kept in the URL.
    await page.getByLabel("Dil").selectOption("Deutsch");
    await expect(page.locator("html")).toHaveAttribute("lang", "de");
    await expect(page.getByRole("heading", { level: 2 })).toHaveText("Tokenisieren");
    await expect(page.getByText(/Die Beispiele sind auf Englisch/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Tokens", exact: true })).toBeVisible();
    await expect(page).toHaveURL(/lang=de/);

    await page.getByLabel("Sprache").selectOption("English");
    await expect(page.getByRole("heading", { level: 2 })).toHaveText("Tokenize");
    await expect(page.getByText(/GPT-2 is a text-completion model/)).toBeVisible();
  });
});

test.describe("with a browser in a language the site does not offer", () => {
  test.use({ locale: "fr-FR" });

  test("the UI falls back to English", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.getByRole("heading", { level: 2 })).toHaveText("Tokenize");
    await expect(page).toHaveURL(/lang=en/);
  });
});
