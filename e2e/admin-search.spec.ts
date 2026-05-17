import { test, expect } from '@playwright/test';
import { login } from './fixtures';

test('Cmd+K abre command palette, busca "raul" y abre perfil del alumno', async ({ page }) => {
  await login(page, 'admin');
  await page.goto('/admin');
  await page.waitForLoadState('domcontentloaded');

  // Disparar el shortcut. El listener escucha keydown con metaKey || ctrlKey + 'k'.
  await page.evaluate(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }));
  });

  const input = page.locator('input[placeholder*="Buscar"]').first();
  await expect(input).toBeVisible({ timeout: 5_000 });

  await input.fill('raul');

  // Esperar a que aparezca el item de Raul (búsqueda live debounced 250ms)
  const raulItem = page.locator('button:has-text("Raul"), button:has-text("RAUL"), button:has-text("raul")').first();
  await expect(raulItem).toBeVisible({ timeout: 8_000 });

  await raulItem.click();

  // Debe navegar a /admin/alumnos/<id>
  await expect(page).toHaveURL(/\/admin\/alumnos\/[0-9a-f-]+/i, { timeout: 10_000 });
});

test('API /api/admin/search devuelve resultados cross-entity', async ({ page }) => {
  await login(page, 'admin');
  await page.goto('/admin');
  await page.waitForLoadState('domcontentloaded');

  // Fetch desde el contexto autenticado del navegador
  const data = await page.evaluate(async () => {
    const r = await fetch('/api/admin/search?q=raul');
    return { status: r.status, body: await r.json() };
  });
  console.log('SEARCH RESPONSE:', JSON.stringify(data));
  expect(data.status).toBe(200);
  expect(Array.isArray(data.body.alumnos)).toBeTruthy();
  expect(data.body.alumnos.length).toBeGreaterThan(0);
  expect(data.body.alumnos[0].nombre).toMatch(/raul/i);
});
