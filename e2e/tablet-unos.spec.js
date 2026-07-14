import { test, expect } from "@playwright/test";
import {
  imaE2EKredencijale,
  prijaviSe,
  prebaciLiniju,
  otvoriModul,
} from "./helpers.js";

/** Tablet ~8″ portrait — linija unos atributivne i merljive. */
test.describe("Tablet unos linija", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 1280 });
  });

  test("varijabilne — polje ID delo na tabletu", async ({ page }) => {
    test.skip(!imaE2EKredencijale(), "Nema E2E kredencijala");
    await prijaviSe(page);
    await prebaciLiniju(page);
    await otvoriModul(page, "modul-varijabilne");
    const polje = page.getByTestId("merenje-id-deo");
    await expect(polje).toBeVisible({ timeout: 20000 });
    await polje.fill("5502-A");
    await expect(polje).toHaveValue("5502-A");
  });

  test("atributivne — polje ID delo na tabletu", async ({ page }) => {
    test.skip(!imaE2EKredencijale(), "Nema E2E kredencijala");
    await prijaviSe(page);
    await prebaciLiniju(page);
    await otvoriModul(page, "modul-atributivne");
    const polje = page.getByTestId("atr-id-deo");
    await expect(polje).toBeVisible({ timeout: 20000 });
    await polje.fill("5501-A");
    await expect(polje).toHaveValue("5501-A");
  });

  test("poslednji deo — varijabilne učitava iz localStorage", async ({ page }) => {
    test.skip(!imaE2EKredencijale(), "Nema E2E kredencijala");
    await page.addInitScript(() => {
      localStorage.setItem("spc_poslednji_deo_linija", JSON.stringify({
        varijabilne: { idDeo: "5502-A", smena: null, ts: Date.now() },
      }));
    });
    await prijaviSe(page);
    await prebaciLiniju(page);
    await otvoriModul(page, "modul-varijabilne");
    const polje = page.getByTestId("merenje-id-deo");
    await expect(polje).toHaveValue("5502-A", { timeout: 20000 });
  });
});
