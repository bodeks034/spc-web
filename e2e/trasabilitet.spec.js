import { test, expect } from "@playwright/test";
import { imaE2EKredencijale, prijaviSe, otvoriModul, prebaciAnalitiku } from "./helpers.js";

test.describe("Trasabilitet VIN filter", () => {
  test.skip(!imaE2EKredencijale(), "Nema E2E kredencijala");

  test("panel ima polje za VIN / lot filter", async ({ page }) => {
    await prijaviSe(page);
    await prebaciAnalitiku(page);
    await otvoriModul(page, "modul-varijabilne-digital");
    await page.getByTestId("tab-trasabilitet").click();
    await expect(page.getByTestId("trasabilitet-vin-lot")).toBeVisible({ timeout: 15000 });
    const vinPolje = page.getByTestId("trasabilitet-vin-lot");
    await vinPolje.fill("VIN-TEST-001");
    await expect(vinPolje).toHaveValue("VIN-TEST-001");
  });
});
