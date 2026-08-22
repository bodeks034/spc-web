import { test, expect } from "@playwright/test";
import { e2eKredencijali, prijaviSe } from "./helpers.js";

function imaSifrarnikE2E() {
  const k = e2eKredencijali("kvalitet");
  return !!(k.email && k.password);
}

async function otvoriSifrarnikTab(page, tab = "delovi") {
  await page.getByTestId("modul-sifrarnik").click();
  await expect(page.getByTestId("sifrarnik-hub")).toBeVisible({ timeout: 20000 });
  await page.getByTestId(`sifrarnik-tab-${tab}`).click();
}

test.describe("Modul 0 — status dela", () => {
  test.describe.configure({ timeout: 60000 });

  test.skip(!imaSifrarnikE2E(), "Nema E2E kvalitet kredencijala (E2E_EMAIL_KVALITET)");

  test("klik status badge menja tab ili otvara meni koraka", async ({ page }) => {
    await prijaviSe(page, "kvalitet");
    await otvoriSifrarnikTab(page, "delovi");
    await expect(page.getByTestId("delovi-panel")).toBeVisible({ timeout: 15000 });

    const status = page.locator("[data-testid^='delovi-status-']").first();
    await expect(status).toBeVisible({ timeout: 15000 });
    const idDeo = (await status.getAttribute("data-testid"))?.replace("delovi-status-", "") || "";

    await status.click();

    const menu = page.getByTestId(`delovi-status-menu-${idDeo}`);
    if (await menu.isVisible().catch(() => false)) {
      await menu.locator("[data-testid^='delovi-status-nav-']").first().click();
    }

    await expect(page.getByTestId("sifrarnik-tab-delovi")).toHaveCSS("border-bottom-width", "0px");
  });
});
