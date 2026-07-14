import { test, expect } from "@playwright/test";
import { imaE2EKredencijale, prijaviSe, otvoriModul, prebaciLiniju } from "./helpers.js";

test.describe("Varijabilne — unos merenja", () => {
  test.skip(!imaE2EKredencijale(), "Nema E2E kredencijala (E2E_EMAIL, E2E_PASSWORD)");

  test("ručni unos prikazuje polje ID delo", async ({ page }) => {
    await prijaviSe(page);
    await prebaciLiniju(page);
    await otvoriModul(page, "modul-varijabilne");
    await expect(page.getByTestId("merenje-id-deo")).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId("tab-unos")).toBeVisible();
  });

  test("ID delo prima unos", async ({ page }) => {
    await prijaviSe(page);
    await prebaciLiniju(page);
    await otvoriModul(page, "modul-varijabilne");
    const polje = page.getByTestId("merenje-id-deo");
    await polje.fill("5502-A");
    await expect(polje).toHaveValue("5502-A");
  });
});
