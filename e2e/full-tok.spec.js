import { test, expect } from "@playwright/test";
import {
  imaE2EKredencijale,
  prijaviSe,
  otvoriModul,
  prebaciLiniju,
  otvoriNcrPanel,
  e2eKredencijali,
} from "./helpers.js";

const E2E_ID_DEO = process.env.E2E_ID_DEO || "5502-A";

test.describe("Puni E2E tok — merenje + NCR + zatvaranje", () => {
  test.describe.configure({ timeout: 90000 });

  test.skip(!imaE2EKredencijale(), "Nema E2E kredencijala (E2E_EMAIL, E2E_PASSWORD)");

  test("operater priprema unos merenja, kvalitet kreira i zatvara NCR", async ({ page }) => {
    // 1. Operater — modul merljive, unos ID dela
    await prijaviSe(page);
    await prebaciLiniju(page);
    await otvoriModul(page, "modul-varijabilne");
    await expect(page.getByTestId("merenje-id-deo")).toBeVisible({ timeout: 15000 });
    await page.getByTestId("merenje-id-deo").fill(E2E_ID_DEO);
    await expect(page.getByTestId("merenje-id-deo")).toHaveValue(E2E_ID_DEO);
    await expect(page.getByTestId("tab-unos")).toBeVisible();

    // 2. Kvalitet — novi NCR za isti deo
    const kval = e2eKredencijali("kvalitet");
    test.skip(!kval.email || !kval.password, "Nema E2E_EMAIL_KVALITET za NCR korak");

    await page.goto("/");
    await prijaviSe(page, "kvalitet");
    const tab = await otvoriNcrPanel(page, "atributivne");
    test.skip(!tab, "Uloga nema pristup NCR tabu");

    const opis = `E2E puni tok ${Date.now()}`;
    await page.getByTestId("ncr-novi").click();
    await page.getByTestId("ncr-id-deo").fill(E2E_ID_DEO);
    await page.getByTestId("ncr-opis").fill(opis);
    await page.getByTestId("ncr-snimi").click();

    await expect(page.getByTestId("ncr-forma")).toHaveCount(0, { timeout: 15000 });
    await expect(page.getByText(opis)).toBeVisible({ timeout: 15000 });

    const red = page.locator("[data-testid^='ncr-red-']").filter({ hasText: opis }).first();
    await expect(red).toBeVisible();
    await red.click();
    await page.getByTestId("ncr-status-zatvoren").click();
    await expect(red.getByText("zatvoren")).toBeVisible({ timeout: 15000 });
  });
});
