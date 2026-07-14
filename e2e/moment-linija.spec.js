import { test, expect } from "@playwright/test";
import { imaE2EKredencijale, prijaviSe, otvoriModul, prebaciLiniju } from "./helpers.js";

test.describe("Moment linija", () => {
  test.skip(!imaE2EKredencijale(), "Nema E2E kredencijala");

  test("digitalni modul otvara moment wizard", async ({ page }) => {
    await prijaviSe(page);
    await prebaciLiniju(page);
    await otvoriModul(page, "modul-varijabilne-digital");
    await page.getByTestId("tab-moment").click();
    await expect(page.getByTestId("moment-id-deo")).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("ID DELO")).toBeVisible();
  });

  test("moment korak ID prima unos", async ({ page }) => {
    await prijaviSe(page);
    await prebaciLiniju(page);
    await otvoriModul(page, "modul-varijabilne-digital");
    await page.getByTestId("tab-moment").click();
    const polje = page.getByTestId("moment-id-deo");
    await polje.fill("MRAP-001");
    await expect(polje).toHaveValue("MRAP-001");
  });

  test("moment VIN unos na zatezanju", async ({ page }) => {
    await prijaviSe(page);
    await prebaciLiniju(page);
    await otvoriModul(page, "modul-varijabilne-digital");
    await page.getByTestId("tab-moment").click();
    const idPolje = page.getByTestId("moment-id-deo");
    await idPolje.fill("MRAP1-001");
    await idPolje.press("Enter");
    const jobDugme = page.getByRole("button", { name: /JOB|Točkovi|tockovi/i }).first();
    if (await jobDugme.isVisible({ timeout: 8000 }).catch(() => false)) {
      await jobDugme.click();
    }
    const vinPolje = page.getByTestId("moment-vin-unos");
    await expect(vinPolje).toBeVisible({ timeout: 15000 });
    await vinPolje.fill("WVIN123456789");
    await expect(vinPolje).toHaveValue("WVIN123456789");
  });
});
