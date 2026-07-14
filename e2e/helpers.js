import { expect } from "@playwright/test";

export const imaE2EKredencijale = () =>
  !!(process.env.E2E_EMAIL && process.env.E2E_PASSWORD);

/** Kredencijali — podrazumevano E2E_EMAIL/PASSWORD, ili E2E_EMAIL_KVALITET za NCR. */
export function e2eKredencijali(varijanta = "default") {
  if (varijanta === "kvalitet" && process.env.E2E_EMAIL_KVALITET && process.env.E2E_PASSWORD_KVALITET) {
    return { email: process.env.E2E_EMAIL_KVALITET, password: process.env.E2E_PASSWORD_KVALITET };
  }
  return { email: process.env.E2E_EMAIL, password: process.env.E2E_PASSWORD };
}

export async function prijaviSe(page, varijanta = "default") {
  const { email, password } = e2eKredencijali(varijanta);
  if (!email || !password) throw new Error("Nema E2E kredencijala");
  await page.goto("/");
  await page.locator("#spc-login-email").fill(email);
  await page.locator("#spc-login-pass").fill(password);
  await page.getByRole("button", { name: "PRIJAVA" }).click();
  await expect(page.getByTestId("pocetni-ekran")).toBeVisible({ timeout: 20000 });
}

export async function otvoriModul(page, testId) {
  await page.getByTestId(testId).click();
}

export async function prebaciAnalitiku(page) {
  const dugme = page.getByTestId("rezim-analitika");
  if (await dugme.isVisible().catch(() => false)) {
    await dugme.click();
  }
}

export async function prebaciLiniju(page) {
  const dugme = page.getByTestId("rezim-linija");
  if (await dugme.isVisible().catch(() => false)) {
    await dugme.click();
  }
}

export async function otvoriAdmin(page) {
  await page.getByTestId("modul-admin").click();
  await expect(page.getByTestId("admin-spc-alarmi")).toBeVisible({ timeout: 20000 });
}

export async function nazadNaPocetni(page) {
  const nazad = page.getByRole("button", { name: "← Nazad" });
  if (await nazad.isVisible().catch(() => false)) {
    await nazad.click();
    await expect(page.getByTestId("pocetni-ekran")).toBeVisible({ timeout: 10000 });
  }
}

export async function otvoriNcrPanel(page, modul = "atributivne") {
  await prijaviSe(page, "kvalitet");
  await prebaciAnalitiku(page);
  await otvoriModul(page, `modul-${modul}`);
  const ncrTab = page.getByTestId("tab-ncr");
  const vidi = await ncrTab.isVisible().catch(() => false);
  if (!vidi) return null;
  await ncrTab.click();
  await expect(page.getByTestId("ncr-panel")).toBeVisible({ timeout: 15000 });
  return ncrTab;
}
