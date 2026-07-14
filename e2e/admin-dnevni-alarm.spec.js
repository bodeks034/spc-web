import { test, expect } from "@playwright/test";
import {
  imaE2EKredencijale,
  prijaviSe,
  prebaciLiniju,
  otvoriModul,
  otvoriAdmin,
  nazadNaPocetni,
} from "./helpers.js";

function imaKvalitetKredencijale() {
  return !!(process.env.E2E_EMAIL_KVALITET && process.env.E2E_PASSWORD_KVALITET);
}

test.describe("Admin ERP diff", () => {
  test("ERP diff panel u adminu", async ({ page }) => {
    test.skip(!imaE2EKredencijale(), "Nema E2E kredencijala");
    await prijaviSe(page);
    await otvoriAdmin(page);
    await expect(page.getByTestId("erp-diff-panel")).toBeVisible({ timeout: 20000 });
  });
});

test.describe("Dnevni pregled deep-link", () => {
  test("kvalitet vidi panel i klik na OEE", async ({ page }) => {
    test.skip(!imaKvalitetKredencijale(), "Nema E2E kvalitet kredencijala");
    await prijaviSe(page, "kvalitet");
    await expect(page.getByTestId("dnevni-pregled-panel")).toBeVisible({ timeout: 20000 });
    await page.getByTestId("dnevni-kpi-oee").click();
    await expect(page.getByTestId("tab-oee")).toBeVisible({ timeout: 20000 });
  });
});

test.describe("SPC alarm objašnjenje", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 1280 });
  });

  test("modal ima sekciju zašto je blokiran kad alarm postoji", async ({ page }) => {
    test.skip(!imaE2EKredencijale(), "Nema E2E kredencijala");
    await prijaviSe(page);
    await prebaciLiniju(page);
    await otvoriModul(page, "modul-varijabilne");
    const blok = page.locator("text=ZAŠTO JE UNOS BLOKIRAN?");
    const vidi = await blok.isVisible({ timeout: 8000 }).catch(() => false);
    test.skip(!vidi, "Nema aktivnog SPC alarma na liniji — preskačem");
    await expect(blok).toBeVisible();
  });
});
