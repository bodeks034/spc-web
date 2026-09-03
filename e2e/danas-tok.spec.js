import { test, expect } from "@playwright/test";
import {
  imaE2EKredencijale,
  prijaviSe,
  prebaciLiniju,
} from "./helpers.js";

test.describe("Danas tok", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
  });

  test("panel na početnoj i CTA otvara modul", async ({ page }) => {
    test.skip(!imaE2EKredencijale(), "Nema E2E kredencijala");
    await prijaviSe(page);

    const panel = page.getByTestId("danas-tok-panel");
    await expect(panel).toBeVisible({ timeout: 20000 });

    const lista = page.getByTestId("danas-cta-lista");
    const atr = page.getByTestId("danas-cta-atributivne");
    const mer = page.getByTestId("danas-cta-varijabilne");
    const sif = page.getByTestId("danas-cta-sifrarnik");
    const adm = page.getByTestId("danas-cta-admin");

    if (await lista.isVisible().catch(() => false)) {
      await lista.click();
      await expect(page.getByTestId("kontrolna-lista-gate")).toBeVisible({ timeout: 20000 });
      return;
    }
    if (await atr.isVisible().catch(() => false)) {
      await atr.click();
      await expect(
        page.getByTestId("atr-id-deo").or(page.getByTestId("linija-tab-traka")),
      ).toBeVisible({ timeout: 20000 });
      return;
    }
    if (await mer.isVisible().catch(() => false)) {
      await mer.click();
      await expect(
        page.getByTestId("tab-unos").or(page.getByTestId("linija-tab-traka")),
      ).toBeVisible({ timeout: 20000 });
      return;
    }
    if (await sif.isVisible().catch(() => false)) {
      await sif.click();
      await expect(
        page.getByTestId("sifrarnik-radni-rezim").or(page.getByTestId("sifrarnik-hub")),
      ).toBeVisible({ timeout: 20000 });
      return;
    }
    if (await adm.isVisible().catch(() => false)) {
      await adm.click();
      await expect(page.getByTestId("admin-spc-alarmi")).toBeVisible({ timeout: 20000 });
      return;
    }

    // Sync / alarm CTA — panel postoji, bar jedan korak
    await expect(panel.locator("button").first()).toBeVisible();
  });

  test("linija tab traka posle ulaska u atributivne", async ({ page }) => {
    test.skip(!imaE2EKredencijale(), "Nema E2E kredencijala");
    await prijaviSe(page);
    await prebaciLiniju(page);

    const atrCta = page.getByTestId("danas-cta-atributivne");
    if (await atrCta.isVisible().catch(() => false)) {
      await atrCta.click();
    } else {
      await page.getByTestId("modul-atributivne").click();
    }

    await expect(page.getByTestId("linija-tab-traka")).toBeVisible({ timeout: 20000 });
  });
});
