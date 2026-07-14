import { test, expect } from "@playwright/test";

test.describe("Prijava", () => {
  test("prikazuje login formu", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: "PRIJAVA" })).toBeVisible();
    await expect(page.locator("#spc-login-email")).toBeVisible();
    await expect(page.locator("#spc-login-pass")).toBeVisible();
  });

  test("prazna prijava prikazuje grešku", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "PRIJAVA" }).click();
    await expect(page.getByText("Unesite email i lozinku.")).toBeVisible();
  });
});

test.describe("Opcioni login", () => {
  test.skip(!process.env.E2E_EMAIL || !process.env.E2E_PASSWORD, "Nema E2E kredencijala");

  test("uspešna prijava vodi na modul kartice", async ({ page }) => {
    await page.goto("/");
    await page.locator("#spc-login-email").fill(process.env.E2E_EMAIL);
    await page.locator("#spc-login-pass").fill(process.env.E2E_PASSWORD);
    await page.getByRole("button", { name: "PRIJAVA" }).click();
    await expect(page.getByTestId("pocetni-ekran")).toBeVisible({ timeout: 15000 });
  });
});
