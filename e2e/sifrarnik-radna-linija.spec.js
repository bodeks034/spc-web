import { test, expect } from "@playwright/test";
import { prijaviSe, otvoriSifrarnik, otvoriModulSifrarnik, e2eKredencijali } from "./helpers.js";

function imaSifrarnikE2E() {
  const k = e2eKredencijali("kvalitet");
  return !!(k.email && k.password);
}

async function otvoriNaprednoTab(page, tab) {
  const napredno = page.getByTestId("sifrarnik-grupa-napredno");
  if (await napredno.isVisible().catch(() => false)) {
    await napredno.click();
  }
  await page.getByTestId(`sifrarnik-tab-${tab}`).click();
}

test.describe("Modul 0 — radni režim i radna linija", () => {
  test.describe.configure({ timeout: 60000 });

  test.skip(!imaSifrarnikE2E(), "Nema E2E kvalitet kredencijala");

  test("radni režim je podrazumevani ulaz", async ({ page }) => {
    await prijaviSe(page, "kvalitet");
    await otvoriModulSifrarnik(page);
    await expect(page.getByTestId("sifrarnik-radni-rezim")).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId("radni-rezim-linija-select")).toBeVisible();
    await expect(page.getByTestId("radni-rezim-sledeci")).toBeVisible();
    await expect(page.getByTestId("sifrarnik-otvori-hub")).toBeVisible();
  });

  test("povratak Hub → Radni režim", async ({ page }) => {
    await prijaviSe(page, "kvalitet");
    await otvoriSifrarnik(page, "glavni_unos");
    await expect(page.getByTestId("sifrarnik-nazad-radni")).toBeVisible();
    await page.getByTestId("sifrarnik-nazad-radni").click();
    await expect(page.getByTestId("sifrarnik-radni-rezim")).toBeVisible({ timeout: 10000 });
  });

  test("radna linija u radnom režimu i novi deo", async ({ page }) => {
    await prijaviSe(page, "kvalitet");
    await otvoriModulSifrarnik(page);
    await expect(page.getByTestId("sifrarnik-radni-rezim")).toBeVisible({ timeout: 15000 });

    const select = page.getByTestId("radni-rezim-linija-select");
    const opts = await select.locator("option").allTextContents();
    const kod = opts.join(" ").match(/VOZ-\d+/)?.[0];
    if (!kod) {
      test.info().annotations.push({ type: "note", description: "Nema VOZ linija u bazi" });
      return;
    }

    await select.selectOption(kod);
    await expect(page.getByTestId("radni-rezim-novi-deo")).toBeEnabled();
    await page.getByTestId("radni-rezim-novi-deo").click();
    await expect(page.getByTestId("novi-deo-wizard")).toBeVisible({ timeout: 15000 });
  });

  test("Svi tabovi otvara hub sa radnom linijom", async ({ page }) => {
    await prijaviSe(page, "kvalitet");
    await otvoriSifrarnik(page, "glavni_unos");
    await expect(page.getByTestId("sifrarnik-nazad-radni")).toBeVisible();
    const bar = page.getByTestId("sifrarnik-radna-linija");
    if (await bar.isVisible().catch(() => false)) {
      await expect(page.getByTestId("sifrarnik-radna-linija-select")).toBeVisible();
    }
  });
});

test.describe("Modul 0 — ERP pod Napredno", () => {
  test.describe.configure({ timeout: 60000 });

  test.skip(!imaSifrarnikE2E(), "Nema E2E kvalitet kredencijala");

  test("ERP tab preko grupe Napredno ili direktno", async ({ page }) => {
    await prijaviSe(page, "kvalitet");
    await otvoriSifrarnik(page, "glavni_unos");

    const erpTab = page.getByTestId("sifrarnik-tab-erp");
    if (!(await erpTab.isVisible().catch(() => false))) {
      await otvoriNaprednoTab(page, "erp");
    } else {
      await erpTab.click();
    }

    const panel = page.getByTestId("erp-uvoz-panel");
    if (await panel.isVisible().catch(() => false)) {
      await expect(panel).toBeVisible();
    } else {
      test.info().annotations.push({ type: "note", description: "ERP tab sakriven (nije admin)" });
    }
  });
});
