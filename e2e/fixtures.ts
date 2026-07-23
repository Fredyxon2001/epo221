// Credenciales de prueba (datos reales del entorno limpio mayo 2026).
// Override via env vars en CI.
export const USERS = {
  admin:    { email: process.env.E2E_ADMIN_EMAIL ?? 'admin@epo221.edu.mx', password: process.env.E2E_ADMIN_PASSWORD ?? 'TEMPORALEPO221!' },
  profesor: { email: 'pablo.profesor@epo221.edu.mx', password: 'TEMPORALEPO221!' },
  orientadora: { email: 'patricia.najera@epo221.edu.mx', password: 'TEMPORALEPO221!' },
  alumno:   { email: 'raul.flores@epo221.edu.mx', password: 'TEMPORALEPO221!' },
};

import { Page, expect } from '@playwright/test';

export async function login(page: Page, who: keyof typeof USERS) {
  const u = USERS[who];
  await page.goto('/login');
  await page.locator('input[name="curp"]').fill(u.email);
  await page.locator('input[name="password"]').fill(u.password);
  await page.locator('button[type="submit"], input[type="submit"]').first().click();
  await expect(page).not.toHaveURL(/\/login/, { timeout: 20_000 });
}
