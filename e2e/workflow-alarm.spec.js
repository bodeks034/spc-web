import { test, expect } from "@playwright/test";

test.describe("Workflow / početni ekran", () => {
  test("login forma i početni ekran struktura", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: "PRIJAVA" })).toBeVisible();
    await expect(page.locator("#spc-login-email")).toBeVisible();
  });

  test.skip(!process.env.E2E_EMAIL || !process.env.E2E_PASSWORD, "Nema E2E kredencijala");

  test("posle prijave — dashboard i modul kartice", async ({ page }) => {
    await page.goto("/");
    await page.locator("#spc-login-email").fill(process.env.E2E_EMAIL);
    await page.locator("#spc-login-pass").fill(process.env.E2E_PASSWORD);
    await page.getByRole("button", { name: "PRIJAVA" }).click();
    await expect(page.getByTestId("pocetni-ekran")).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("PREGLED PROIZVODNJE")).toBeVisible({ timeout: 10000 });
  });
});
