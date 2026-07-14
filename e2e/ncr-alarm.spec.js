import { test, expect } from "@playwright/test";
import {
  imaE2EKredencijale,
  prijaviSe,
  otvoriAdmin,
  prebaciAnalitiku,
  nazadNaPocetni,
} from "./helpers.js";

test.describe("SPC alarm → NCR", () => {
  test.skip(!imaE2EKredencijale(), "Nema E2E kredencijala (E2E_EMAIL, E2E_PASSWORD)");

  test.beforeEach(async ({ page }) => {
    page.on("dialog", (dialog) => dialog.accept());
  });

  test("admin kreira NCR iz aktivnog alarma", async ({ page }) => {
    await prijaviSe(page);
    await otvoriAdmin(page);

    const ncrDugme = page.locator('[data-testid^="alarm-ncr-"]').first();
    const imaAlarm = await ncrDugme.isVisible().catch(() => false);
    test.skip(!imaAlarm, "Nema aktivnih SPC alarma u bazi");

    await ncrDugme.click();
    await expect(page.getByText(/^NCR: NCR-/)).toBeVisible({ timeout: 15000 });
  });

  test("posle kreiranja iz admina otvara NCR tab u atributivnim", async ({ page }) => {
    await prijaviSe(page);
    await otvoriAdmin(page);

    const ncrDugme = page.locator('[data-testid^="alarm-ncr-"]').first();
    const imaAlarm = await ncrDugme.isVisible().catch(() => false);
    test.skip(!imaAlarm, "Nema aktivnih SPC alarma u bazi");

    await ncrDugme.click();
    const brojEl = page.getByText(/^NCR: NCR-/).first();
    await expect(brojEl).toBeVisible({ timeout: 15000 });
    const brojNcr = (await brojEl.textContent())?.replace("NCR: ", "").trim();

    await nazadNaPocetni(page);
    await page.getByTestId("modul-atributivne").click();
    await prebaciAnalitiku(page);

    await expect(page.getByTestId("ncr-panel")).toBeVisible({ timeout: 20000 });
    if (brojNcr) await expect(page.getByText(brojNcr)).toBeVisible({ timeout: 15000 });
  });
});
