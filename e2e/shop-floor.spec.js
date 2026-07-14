import { test, expect } from "@playwright/test";
import {
  imaE2EKredencijale,
  prijaviSe,
  prebaciAnalitiku,
  otvoriModul,
  e2eKredencijali,
} from "./helpers.js";

/** Kvalitet/admin/sef — za pregled smene i NCR navigaciju. */
function imaKvalitetKredencijale() {
  const k = e2eKredencijali("kvalitet");
  return !!(k.email && k.password);
}

test.describe("Shop floor", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
  });

  test("shop-floor traka na atributivnim (desktop analitika)", async ({ page }) => {
    test.skip(!imaE2EKredencijale(), "Nema E2E kredencijala");
    await prijaviSe(page);
    await prebaciAnalitiku(page);
    await otvoriModul(page, "modul-atributivne");
    await expect(page.getByTestId("shop-floor-bar")).toBeVisible({ timeout: 20000 });
    await expect(page.getByTestId("shop-floor-online")).toBeVisible();
  });

  test("shop-floor NCR chip otvara NCR tab", async ({ page }) => {
    test.skip(!imaKvalitetKredencijale(), "Nema E2E kvalitet kredencijala");
    await prijaviSe(page, "kvalitet");
    await prebaciAnalitiku(page);
    await otvoriModul(page, "modul-atributivne");

    const ncrChip = page.getByTestId("shop-floor-ncr");
    const vidi = await ncrChip.isVisible().catch(() => false);
    test.skip(!vidi, "Nema otvorenih NCR u bazi");

    await ncrChip.click();
    await expect(page.getByTestId("ncr-panel")).toBeVisible({ timeout: 15000 });
  });

  test("shop-floor SPC chip otvara odobrenja", async ({ page }) => {
    test.skip(!imaKvalitetKredencijale(), "Nema E2E kvalitet kredencijala");
    await prijaviSe(page, "kvalitet");
    await prebaciAnalitiku(page);
    await otvoriModul(page, "modul-atributivne");

    const spcChip = page.getByTestId("shop-floor-spc");
    const vidi = await spcChip.isVisible().catch(() => false);
    test.skip(!vidi, "Nema aktivnih SPC alarma");

    await spcChip.click();
    await expect(page.getByTestId("tab-odobrenja")).toBeVisible({ timeout: 15000 });
  });

  test("sef smena dashboard na početnom ekranu", async ({ page }) => {
    test.skip(!imaKvalitetKredencijale(), "Nema E2E kvalitet kredencijala");
    await prijaviSe(page, "kvalitet");
    await expect(page.getByTestId("sef-smena-dashboard")).toBeVisible({ timeout: 20000 });
    await page.getByTestId("sef-smena-osvezi").click();
    await expect(page.getByTestId("sef-kpi-fpy")).toBeVisible({ timeout: 10000 });
  });

  test("dashboard tab — SPC KPI navigacija ka odobrenjima", async ({ page }) => {
    test.skip(!imaKvalitetKredencijale(), "Nema E2E kvalitet kredencijala");
    await prijaviSe(page, "kvalitet");
    await prebaciAnalitiku(page);
    await otvoriModul(page, "modul-atributivne");

    const dashTab = page.getByTestId("tab-dashboard");
    if (await dashTab.isVisible().catch(() => false)) {
      await dashTab.click();
    }

    await expect(page.getByTestId("sef-smena-dashboard")).toBeVisible({ timeout: 20000 });

    const spcKpi = page.getByTestId("sef-kpi-spc");
    const vidi = await spcKpi.isVisible().catch(() => false);
    test.skip(!vidi, "SPC KPI nije vidljiv");

    const tekst = await spcKpi.textContent();
    const broj = parseInt(String(tekst).replace(/\D/g, ""), 10);
    test.skip(!broj || broj === 0, "Nema aktivnih SPC alarma");

    await spcKpi.click();
    await expect(page.getByTestId("tab-odobrenja")).toBeVisible({ timeout: 15000 });
  });
});
