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

export async function otvoriSifrarnikHub(page) {
  await expect(page.getByTestId("sifrarnik-hub")).toBeVisible({ timeout: 20000 });
  const radni = page.getByTestId("sifrarnik-radni-rezim");
  if (await radni.isVisible().catch(() => false)) {
    await page.getByTestId("sifrarnik-otvori-hub").click();
    await expect(page.getByTestId("sifrarnik-nazad-radni")).toBeVisible({ timeout: 10000 });
  }
}

/**
 * Kartica Modula 0 je iza prekidača na početnom ekranu — bez ovog klika
 * `modul-sifrarnik` uopšte nije u DOM-u.
 */
export async function otvoriModulSifrarnik(page) {
  const kartica = page.getByTestId("modul-sifrarnik");
  if (!(await kartica.isVisible().catch(() => false))) {
    await page.getByTestId("modul-prekidac-0").click();
  }
  await expect(kartica).toBeVisible({ timeout: 15000 });
  await kartica.click();
}

export async function otvoriSifrarnik(page, podtab = "delovi") {
  await otvoriModulSifrarnik(page);
  await otvoriSifrarnikHub(page);
  if (podtab) {
    const tabEl = page.getByTestId(`sifrarnik-tab-${podtab}`);
    if (!(await tabEl.isVisible().catch(() => false))) {
      const napredno = page.getByTestId("sifrarnik-grupa-napredno");
      if (await napredno.isVisible().catch(() => false)) await napredno.click();
    }
    await tabEl.click();
  }
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
