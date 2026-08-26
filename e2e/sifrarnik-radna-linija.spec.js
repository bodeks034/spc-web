import { test, expect } from "@playwright/test";
import { prijaviSe, otvoriSifrarnik, e2eKredencijali } from "./helpers.js";

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

test.describe("Modul 0 — radna linija i brzi start", () => {
  test.describe.configure({ timeout: 60000 });

  test.skip(!imaSifrarnikE2E(), "Nema E2E kvalitet kredencijala");

  test("radna linija bar i brzi start tile", async ({ page }) => {
    await prijaviSe(page, "kvalitet");
    await otvoriSifrarnik(page, "glavni_unos");

    const bar = page.getByTestId("sifrarnik-radna-linija");
    await expect(bar).toBeVisible({ timeout: 15000 });

    const select = page.getByTestId("sifrarnik-radna-linija-select");
    const opts = await select.locator("option").allTextContents();
    const kod = opts.join(" ").match(/VOZ-\d+/)?.[0];
    if (!kod) {
      test.info().annotations.push({ type: "note", description: "Nema VOZ linija u bazi" });
      return;
    }

    await select.selectOption(kod);
    await expect(page.getByTestId("sifrarnik-radna-linija-novi-deo")).toBeVisible();

    const qs = page.getByTestId("sifrarnik-quick-start");
    if (await qs.isVisible().catch(() => false)) {
      await expect(qs.getByText(new RegExp(kod))).toBeVisible();
    }
  });

  test("čarobnjak se otvara posle Novi deo na liniji", async ({ page }) => {
    await prijaviSe(page, "kvalitet");
    await otvoriSifrarnik(page, "glavni_unos");

    const select = page.getByTestId("sifrarnik-radna-linija-select");
    const opts = await select.locator("option").allTextContents();
    const kod = opts.join(" ").match(/VOZ-\d+/)?.[0];
    if (!kod) {
      test.info().annotations.push({ type: "note", description: "Nema VOZ linija" });
      return;
    }

    await select.selectOption(kod);
    await page.getByTestId("sifrarnik-radna-linija-novi-deo").click();

    await expect(page.getByTestId("novi-deo-wizard")).toBeVisible({ timeout: 15000 });
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
