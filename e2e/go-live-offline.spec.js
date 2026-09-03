import { test, expect } from "@playwright/test";
import {
  imaE2EKredencijale,
  prijaviSe,
  otvoriAdmin,
  otvoriModul,
  prebaciLiniju,
} from "./helpers.js";

test.describe("Danas tok", () => {
  test("početni ekran ima DANAS panel", async ({ page }) => {
    test.skip(!imaE2EKredencijale(), "Nema E2E kredencijala");
    await prijaviSe(page);
    await expect(page.getByTestId("danas-tok-panel")).toBeVisible({ timeout: 20000 });
  });
});

  test("admin vidi go-live status i checklist", async ({ page }) => {
    test.skip(!imaE2EKredencijale(), "Nema E2E kredencijala");
    await prijaviSe(page);
    await otvoriAdmin(page);
    await expect(page.getByTestId("admin-go-live-status")).toBeVisible({ timeout: 20000 });
    await expect(page.getByTestId("go-live-checklist")).toBeVisible({ timeout: 15000 });
    await page.getByTestId("go-live-proveri-semu").click();
    await expect(page.getByTestId("go-live-sema-gate")).toBeVisible({ timeout: 30000 });
  });
});

test.describe("Offline zaglavljen banner", () => {
  test("banner se prikazuje kad red ima zaglavljene poslove", async ({ page }) => {
    test.skip(!imaE2EKredencijale(), "Nema E2E kredencijala");

    await page.addInitScript(() => {
      const job = {
        id: "e2e-zaglavljen-1",
        type: "kontrolni_log",
        createdAt: new Date().toISOString(),
        failCount: 3,
        lastError: "E2E simulacija mreže",
        lastFailAt: new Date().toISOString(),
        payload: [{ id_deo: "E2E1", client_id: "e2e-c1" }],
      };
      localStorage.setItem("spc_q_v2", JSON.stringify([job]));
      // Oslobodi IndexedDB da se učita iz localStorage (migracija u ensureQueueReady).
      try {
        indexedDB.deleteDatabase("spc_offline_v1");
      } catch { /* */ }
    });

    await prijaviSe(page);
    await prebaciLiniju(page);
    await otvoriModul(page, "modul-atributivne");
    await expect(page.getByTestId("offline-zaglavljen-banner")).toBeVisible({ timeout: 20000 });
    await expect(page.getByTestId("offline-zaglavljen-pokusaj")).toBeVisible();
  });
});
