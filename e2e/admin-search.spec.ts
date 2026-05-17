import { test, expect } from '@playwright/test';
import { login } from './fixtures';

test('Cmd+K abre command palette y encuentra alumno', async ({ page }) => {
  await login(page, 'admin');
  await page.keyboard.press('Control+K');
  const input = page.locator('input[placeholder*="Buscar"]').first();
  await expect(input).toBeVisible();
  await input.fill('raul');
  // Esperar resultado live
  await expect(page.locator('text=/raul/i').first()).toBeVisible({ timeout: 5_000 });
});

test('Búsqueda cross-entity devuelve resultados', async ({ page, request }) => {
  await login(page, 'admin');
  const ck = (await page.context().cookies()).map((c) => `${c.name}=${c.value}`).join('; ');
  const r = await request.get('/api/admin/search?q=raul', { headers: { cookie: ck } });
  expect(r.ok()).toBeTruthy();
  const data = await r.json();
  expect(Array.isArray(data.alumnos)).toBeTruthy();
});
