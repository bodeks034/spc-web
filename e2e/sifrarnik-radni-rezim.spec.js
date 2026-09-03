import { test, expect } from "@playwright/test";
import { prijaviSe, otvoriSifrarnik, otvoriModulSifrarnik, e2eKredencijali } from "./helpers.js";

function imaSifrarnikE2E() {
  const k = e2eKredencijali("kvalitet");
  return !!(k.email && k.password);
}

test.describe("Modul 0 — radni režim smoke (filter / tour / gotovo)", () => {
  test.describe.configure({ timeout: 60000 });

  test.skip(!imaSifrarnikE2E(), "Nema E2E kvalitet kredencijala");

  test("filter GU/greške/crtež, metrika dana i tastatura hint", async ({ page }) => {
    await prijaviSe(page, "kvalitet");
    await otvoriModulSifrarnik(page);
    await expect(page.getByTestId("sifrarnik-radni-rezim")).toBeVisible({ timeout: 15000 });

    await expect(page.getByTestId("radni-rezim-danas")).toBeVisible();
    await expect(page.getByTestId("radni-rezim-tastatura")).toBeVisible();
    await expect(page.getByTestId("radni-filter-svi")).toBeVisible();
    await page.getByTestId("radni-filter-gu").click();
    await page.getByTestId("radni-filter-greske").click();
    await page.getByTestId("radni-filter-crtez").click();
    await page.getByTestId("radni-filter-svi").click();
  });

  test("obuka: prikaz, preskok i restart", async ({ page }) => {
    await prijaviSe(page, "kvalitet");
    await page.evaluate(() => {
      localStorage.removeItem("spc_sifrarnik_radni_tour_done");
    });
    await otvoriModulSifrarnik(page);
    await expect(page.getByTestId("sifrarnik-radni-rezim")).toBeVisible({ timeout: 15000 });

    const tour = page.getByTestId("sifrarnik-radni-tour");
    if (!(await tour.isVisible().catch(() => false))) {
      await page.getByTestId("radni-tour-restart").click();
    }
    await expect(tour).toBeVisible({ timeout: 5000 });
    await page.getByTestId("radni-tour-preskoci").click();
    await expect(tour).not.toBeVisible();

    await page.getByTestId("radni-tour-restart").click();
    await expect(page.getByTestId("sifrarnik-radni-tour")).toBeVisible();
    await page.getByTestId("radni-tour-preskoci").click();
  });

  test("Gotovo → sledeći vraća na Radni režim", async ({ page }) => {
    await prijaviSe(page, "kvalitet");
    await otvoriSifrarnik(page, "glavni_unos");
    await expect(page.getByTestId("sifrarnik-nazad-radni")).toBeVisible({ timeout: 10000 });

    await page.evaluate(() => {
      sessionStorage.setItem("spc_sifrarnik_gotovo_sledeci", JSON.stringify({
        idDeo: "E2E-GOTOV",
        idDeovi: ["E2E-GOTOV"],
        akcija: "snimi",
        ts: Date.now(),
      }));
      window.dispatchEvent(new CustomEvent("sifrarnik-status-changed", {
        detail: { akcija: "snimi", idDeo: "E2E-GOTOV", idDeovi: ["E2E-GOTOV"] },
      }));
    });

    await expect(page.getByTestId("sifrarnik-gotovo-sledeci")).toBeVisible({ timeout: 8000 });
    await page.getByTestId("sifrarnik-gotovo-cta").click();
    await expect(page.getByTestId("sifrarnik-radni-rezim")).toBeVisible({ timeout: 15000 });
  });

  test("Gotovo red banner za više ID-eva", async ({ page }) => {
    await prijaviSe(page, "kvalitet");
    await page.evaluate(() => {
      sessionStorage.setItem("spc_sifrarnik_gotovo_red", JSON.stringify({
        ids: ["E2E-RED-1", "E2E-RED-2"],
        ts: Date.now(),
      }));
    });
    await otvoriModulSifrarnik(page);
    await expect(page.getByTestId("sifrarnik-hub")).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId("sifrarnik-gotovo-red")).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId("sifrarnik-gotovo-red-cta")).toBeVisible();
    await page.getByTestId("sifrarnik-gotovo-red-dismiss").click();
    await expect(page.getByTestId("sifrarnik-gotovo-red")).not.toBeVisible();
  });
});

test.describe("Admin — šifrarnik danas zatvoreno", () => {
  test.describe.configure({ timeout: 60000 });

  test.skip(!imaSifrarnikE2E(), "Nema E2E kvalitet kredencijala");

  test("admin panel prikazuje dnevni pregled", async ({ page }) => {
    const { otvoriAdmin } = await import("./helpers.js");
    await prijaviSe(page, "kvalitet");
    await otvoriAdmin(page);
    const panel = page.getByTestId("admin-sifrarnik-danas");
    await panel.scrollIntoViewIfNeeded();
    await expect(panel).toBeVisible({ timeout: 20000 });
    await expect(page.getByTestId("admin-sifrarnik-danas-broj")).toBeVisible();
  });
});
