import { test, expect } from "@playwright/test";
import {
  e2eKredencijali,
  prijaviSe,
  otvoriSifrarnik,
  otvoriAdmin,
  imaE2EKredencijale,
} from "./helpers.js";

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

test.describe("Modul 0 — nastavi checklist banner", () => {
  test.describe.configure({ timeout: 60000 });

  test.skip(!imaSifrarnikE2E(), "Nema E2E kvalitet kredencijala");

  test("banner CTA menja tab kada postoji delimični deo", async ({ page }) => {
    await prijaviSe(page, "kvalitet");
    await otvoriSifrarnik(page, "glavni_unos");

    const banner = page.getByTestId("sifrarnik-nastavi-banner");
    const vidiBanner = await banner.isVisible().catch(() => false);
    if (!vidiBanner) {
      test.info().annotations.push({ type: "note", description: "Svi delovi kompletni — banner nije prikazan" });
      return;
    }

    await page.getByTestId("sifrarnik-nastavi-cta").click();
    await expect(page.getByTestId("sifrarnik-hub")).toBeVisible();
  });

  test("prikazuje redni broj u queue-u", async ({ page }) => {
    await prijaviSe(page, "kvalitet");
    await otvoriSifrarnik(page, "glavni_unos");

    const banner = page.getByTestId("sifrarnik-nastavi-banner");
    if (!(await banner.isVisible().catch(() => false))) {
      test.info().annotations.push({ type: "note", description: "Banner nije prikazan" });
      return;
    }

    const queue = page.getByTestId("sifrarnik-nastavi-queue");
    await expect(queue).toBeVisible();
    await expect(queue).toHaveText(/\(\d+\/\d+\)/);
  });

  test("Ne sada sakriva banner do kraja sesije", async ({ page }) => {
    await prijaviSe(page, "kvalitet");
    await otvoriSifrarnik(page, "glavni_unos");

    const banner = page.getByTestId("sifrarnik-nastavi-banner");
    if (!(await banner.isVisible().catch(() => false))) {
      test.info().annotations.push({ type: "note", description: "Banner nije prikazan" });
      return;
    }

    await page.getByTestId("sifrarnik-nastavi-dismiss").click();
    await expect(banner).not.toBeVisible();
  });
});

test.describe("Modul 0 — globalna pretraga", () => {
  test.describe.configure({ timeout: 60000 });

  test.skip(!imaSifrarnikE2E(), "Nema E2E kvalitet kredencijala");

  test("pretraga ID dela je vidljiva", async ({ page }) => {
    await prijaviSe(page, "kvalitet");
    await otvoriSifrarnik(page, "glavni_unos");

    await expect(page.getByTestId("sifrarnik-global-pretraga")).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId("sifrarnik-global-pretraga-input")).toBeVisible();
    await expect(page.getByTestId("sifrarnik-global-pretraga-go")).toBeVisible();
  });
});

test.describe("Modul 0 — migracije banner", () => {
  test.describe.configure({ timeout: 60000 });

  test.skip(!imaSifrarnikE2E(), "Nema E2E kvalitet kredencijala");

  test("hub učitava migracije banner ili ga nema kad je RPC OK", async ({ page }) => {
    await prijaviSe(page, "kvalitet");
    await otvoriSifrarnik(page, "glavni_unos");
    await expect(page.getByTestId("sifrarnik-hub")).toBeVisible();

    const mig = page.getByTestId("sifrarnik-migracije-banner");
    const vidi = await mig.isVisible().catch(() => false);
    if (vidi) {
      await expect(mig.getByText(/Go-live SQL/i)).toBeVisible();
    }
  });
});

test.describe("Modul 0 — glavni unos alati", () => {
  test.describe.configure({ timeout: 60000 });

  test.skip(!imaSifrarnikE2E(), "Nema E2E kvalitet kredencijala");

  test("kloniraj deo forma i novi deo wizard su dostupni", async ({ page }) => {
    await prijaviSe(page, "kvalitet");
    await otvoriSifrarnik(page, "glavni_unos");

    await expect(page.getByTestId("gu-kloniraj-toggle")).toBeVisible({ timeout: 15000 });
    await page.getByTestId("gu-kloniraj-toggle").click();
    await expect(page.getByTestId("gu-kloniraj-forma")).toBeVisible();
    await expect(page.getByTestId("gu-kloniraj-submit")).toBeVisible();
  });
});

test.describe("Modul 0 — delovi pregled", () => {
  test.describe.configure({ timeout: 60000 });

  test.skip(!imaSifrarnikE2E(), "Nema E2E kvalitet kredencijala");

  test("filter nedostaje je dostupan", async ({ page }) => {
    await prijaviSe(page, "kvalitet");
    await otvoriSifrarnikTab(page, "delovi");
    await expect(page.getByTestId("delovi-nedostaje-filter")).toBeVisible({ timeout: 15000 });
    await page.getByTestId("delovi-nedostaje-filter").selectOption("gu");
    await expect(page.getByTestId("delovi-panel")).toBeVisible();
  });

  test("prazna pretraga prikazuje empty state ili listu", async ({ page }) => {
    await prijaviSe(page, "kvalitet");
    await otvoriSifrarnikTab(page, "delovi");
    await expect(page.getByTestId("delovi-panel")).toBeVisible({ timeout: 15000 });

    const pretraga = page.locator('input[placeholder="ID, naziv…"]');
    await pretraga.fill("__E2E_NEMA_REZULTATA__");
    await expect(page.getByTestId("delovi-empty")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Nema delova/i)).toBeVisible();

    const cta = page.getByTestId("delovi-cta-gu");
    if (await cta.isVisible().catch(() => false)) {
      await cta.click();
      await expect(page.getByTestId("sifrarnik-tab-glavni_unos")).toBeVisible();
    }
  });
});

test.describe("Modul 0 — ERP uvoz", () => {
  test.describe.configure({ timeout: 60000 });

  test.skip(!imaSifrarnikE2E(), "Nema E2E kvalitet kredencijala");

  test("ERP tab i opcioni GU banner", async ({ page }) => {
    await prijaviSe(page, "kvalitet");
    await otvoriSifrarnikTab(page, "erp");

    await expect(page.getByTestId("erp-uvoz-panel")).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/ERP uvoz u bazu/i)).toBeVisible();

    const guBanner = page.getByTestId("erp-gu-banner");
    if (await guBanner.isVisible().catch(() => false)) {
      await expect(page.getByTestId("erp-gu-cta")).toBeVisible();
      await page.getByTestId("erp-gu-cta").click();
      await expect(page.getByTestId("sifrarnik-tab-delovi")).toBeVisible();
    }
  });
});

test.describe("Modul 0 — održavanje kompletnost", () => {
  test.describe.configure({ timeout: 60000 });

  test.skip(!imaSifrarnikE2E(), "Nema E2E kvalitet kredencijala");

  test("prikazuje karticu kompletnosti", async ({ page }) => {
    await prijaviSe(page, "kvalitet");
    await otvoriSifrarnikTab(page, "odrzavanje");
    await expect(page.getByTestId("odrzavanje-kompletnost")).toBeVisible({ timeout: 20000 });
    await expect(page.getByText(/Kompletnost šifrarnika/i)).toBeVisible();
    await expect(page.getByTestId("odrzavanje-csv-export")).toBeVisible();
  });

  test("batch objavi dugme je vidljivo", async ({ page }) => {
    await prijaviSe(page, "kvalitet");
    await otvoriSifrarnikTab(page, "odrzavanje");
    await expect(page.getByTestId("odrzavanje-batch-objavi")).toBeVisible({ timeout: 20000 });
  });
});

test.describe("Modul 0 — quick start", () => {
  test.describe.configure({ timeout: 60000 });

  test.skip(!imaSifrarnikE2E(), "Nema E2E kvalitet kredencijala");

  test("quick start panel je vidljiv ili sakriven", async ({ page }) => {
    await prijaviSe(page, "kvalitet");
    await otvoriSifrarnik(page, "glavni_unos");
    const qs = page.getByTestId("sifrarnik-quick-start");
    const vidi = await qs.isVisible().catch(() => false);
    if (vidi) {
      await expect(page.getByText(/Brzi start/i)).toBeVisible();
      await page.getByTestId("sifrarnik-quick-start-dismiss").click();
      await expect(qs).not.toBeVisible();
    }
  });
});

test.describe("Admin — go-live status", () => {
  test.describe.configure({ timeout: 60000 });

  test.skip(!imaE2EKredencijale(), "Nema E2E kredencijala (E2E_EMAIL)");

  test("automatski go-live panel se učitava", async ({ page }) => {
    await prijaviSe(page);
    await otvoriAdmin(page);

    const panel = page.getByTestId("admin-go-live-status");
    await panel.scrollIntoViewIfNeeded();
    await expect(panel).toBeVisible({ timeout: 20000 });
    await expect(panel.getByText(/GO-LIVE STATUS/i)).toBeVisible();
    await expect(panel.getByText(/Šema migracije/i)).toBeVisible();
  });
});
