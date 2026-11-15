import { expect, test } from "@playwright/test";

// Pages légales : rendu sans champ à compléter, sitemap et robots.

for (const [path, title] of [
  ["/mentions-legales", "Mentions légales"],
  ["/cgu", "Conditions d'utilisation"],
  ["/confidentialite", "Politique de confidentialité"],
  ["/cookies", "Cookies"],
  ["/a-propos", "propos"],
] as const) {
  test(`${path} : titre affiché, aucun « À COMPLÉTER »`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(title);
    await expect(page.locator("body")).not.toContainText("À COMPLÉTER");
  });
}

test("sitemap.xml et robots.txt répondent", async ({ request }) => {
  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.ok()).toBeTruthy();
  expect(await sitemap.text()).toContain("/cookies");
  expect((await request.get("/robots.txt")).ok()).toBeTruthy();
});
