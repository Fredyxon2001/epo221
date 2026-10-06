// Credenciales de prueba (datos reales del entorno limpio mayo 2026).
// Override via env vars en CI.
export const USERS = {
  admin: { email: process.env.E2E_ADMIN_EMAIL ?? '', password: process.env.E2E_ADMIN_PASSWORD ?? '' },
  profesor: { email: process.env.E2E_PROFESOR_EMAIL ?? '', password: process.env.E2E_PROFESOR_PASSWORD ?? '' },
  alumno: { email: process.env.E2E_ALUMNO_EMAIL ?? '', password: process.env.E2E_ALUMNO_PASSWORD ?? '' },
};

import { Page, expect } from '@playwright/test';

export async function login(page: Page, who: keyof typeof USERS) {
  const u = USERS[who];
  if (!u.email || !u.password) throw new Error('Configura las credenciales E2E de una cuenta de pruebas aislada.');
  await page.goto('/login');
  await page.locator('input[name="curp"]').fill(u.email);
  await page.locator('input[name="password"]').fill(u.password);
  await page.locator('button[type="submit"], input[type="submit"]').first().click();
  await expect(page).not.toHaveURL(/\/login/, { timeout: 20_000 });
}
