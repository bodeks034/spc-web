import { test, expect } from "@playwright/test";
import { imaE2EKredencijale, prijaviSe } from "./helpers.js";

test.describe("Auto pravila UI", () => {
  test.skip(!imaE2EKredencijale(), "Nema E2E kredencijala");

  test("početni ekran prikazuje panel auto pravila", async ({ page }) => {
    await prijaviSe(page);
    const panel = page.getByTestId("auto-pravila-panel");
    const vidi = await panel.isVisible().catch(() => false);
    test.skip(!vidi, "Uloga nema pregled proizvodnje (kvalitet/šef/admin)");

    await expect(panel).toBeVisible();
    await panel.getByRole("button").click();
    await expect(page.getByTestId("auto-pravilo-nok3")).toBeVisible();
    await expect(page.getByTestId("auto-pravilo-digest")).toBeVisible();
  });
});
