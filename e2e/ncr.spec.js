import { test, expect } from "@playwright/test";
import { imaE2EKredencijale, otvoriNcrPanel } from "./helpers.js";

const E2E_ID_DEO = process.env.E2E_ID_DEO || "MRAP-001";

test.describe("NCR / CAPA tok", () => {
  test.skip(!imaE2EKredencijale(), "Nema E2E kredencijala (E2E_EMAIL, E2E_PASSWORD)");

  test("analitika otvara NCR panel", async ({ page }) => {
    const tab = await otvoriNcrPanel(page);
    test.skip(!tab, "Uloga nema pristup NCR tabu (potreban kvalitet/admin/sef)");
    await expect(page.getByRole("button", { name: "+ Novi NCR" })).toBeVisible();
    await expect(page.getByTestId("ncr-tab-registar")).toBeVisible();
  });

  test("novi NCR otvara obrazac", async ({ page }) => {
    const tab = await otvoriNcrPanel(page);
    test.skip(!tab, "Uloga nema pristup NCR tabu");
    await page.getByTestId("ncr-novi").click();
    await expect(page.getByTestId("ncr-obrazac")).toBeVisible();
    await expect(page.getByText("Opis neusaglašenosti")).toBeVisible();
  });

  test("validacija obaveznih polja", async ({ page }) => {
    const tab = await otvoriNcrPanel(page);
    test.skip(!tab, "Uloga nema pristup NCR tabu");
    await page.getByTestId("ncr-novi").click();
    await page.getByTestId("ncr-snimi").click();
    await expect(page.getByTestId("ncr-greska-id_deo")).toBeVisible();
    await expect(page.getByTestId("ncr-greska-opis")).toBeVisible();
  });

  test("kreira i zatvara NCR", async ({ page }) => {
    const tab = await otvoriNcrPanel(page);
    test.skip(!tab, "Uloga nema pristup NCR tabu");

    const opis = `E2E NCR ${Date.now()}`;
    await page.getByTestId("ncr-novi").click();
    await page.getByTestId("ncr-id-deo").fill(E2E_ID_DEO);
    await page.getByTestId("ncr-f-pogon").fill("E2E");
    await page.getByTestId("ncr-opis").fill(opis);
    await page.getByTestId("ncr-snimi").click();

    await expect(page.getByText(opis)).toBeVisible({ timeout: 15000 });

    await page.getByTestId("ncr-status-closed").click();
    await expect(page.getByText("CLOSED")).toBeVisible({ timeout: 10000 });

    await page.getByTestId("ncr-tab-registar").click();
    await expect(page.getByTestId("ncr-registar")).toBeVisible();
    await expect(page.getByText(opis)).toBeVisible({ timeout: 10000 });
  });

  test("NCR otvara 8D editor sa prefill-om", async ({ page }) => {
    const tab = await otvoriNcrPanel(page);
    test.skip(!tab, "Uloga nema pristup NCR tabu");

    const opis = `E2E 8D prefill ${Date.now()}`;
    await page.getByTestId("ncr-novi").click();
    await page.getByTestId("ncr-id-deo").fill(E2E_ID_DEO);
    await page.getByTestId("ncr-f-pogon").fill("E2E");
    await page.getByTestId("ncr-opis").fill(opis);
    await page.getByTestId("ncr-snimi").click();
    await expect(page.getByText(opis)).toBeVisible({ timeout: 15000 });

    await page.getByTestId("ncr-otvori-8d").click();

    await expect(page.getByTestId("tab-8d")).toBeVisible();
    await expect(page.getByTestId("osmd-editor")).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("8D izveštaj")).toBeVisible();
  });
});
