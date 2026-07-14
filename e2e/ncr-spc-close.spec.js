import { test, expect } from "@playwright/test";
import {
  imaE2EKredencijale,
  prijaviSe,
  otvoriAdmin,
  otvoriNcrPanel,
} from "./helpers.js";

test.describe("NCR zatvaranje → auto SPC alarm", () => {
  test.skip(!imaE2EKredencijale(), "Nema E2E kredencijala (E2E_EMAIL, E2E_PASSWORD)");

  test("zatvaranje NCR iz alarma zatvara povezani SPC alarm", async ({ page }) => {
    await prijaviSe(page);
    await otvoriAdmin(page);

    const ncrDugme = page.locator('[data-testid^="alarm-ncr-"]').first();
    const imaAlarm = await ncrDugme.isVisible().catch(() => false);
    test.skip(!imaAlarm, "Nema aktivnih SPC alarma u bazi");

    await ncrDugme.click();
    const brojEl = page.getByText(/^NCR: NCR-/).first();
    await expect(brojEl).toBeVisible({ timeout: 15000 });
    const brojNcr = (await brojEl.textContent())?.replace("NCR: ", "").trim();
    test.skip(!brojNcr, "NCR broj nije učitan");

    const tab = await otvoriNcrPanel(page, "atributivne");
    test.skip(!tab, "Uloga nema pristup NCR tabu");

    const red = page.locator("[data-testid^='ncr-red-']").filter({ hasText: brojNcr }).first();
    await expect(red).toBeVisible({ timeout: 15000 });
    await red.click();
    await page.getByTestId("ncr-status-zatvoren").click();

    await expect(red.getByText("zatvoren")).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/Auto-zatvoreno.*SPC alarma/i)).toBeVisible({ timeout: 10000 });
  });
});
