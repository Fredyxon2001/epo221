import { test, expect } from '@playwright/test';
import { login } from './fixtures';

test('SEIEM página accesible para admin', async ({ page }) => {
  await login(page, 'admin');
  await page.goto('/admin/seiem');
  await expect(page.locator('h1, h2').first()).toContainText(/SEIEM|Reportes/i);
});

test('endpoint estadística devuelve XLSX', async ({ page, request }) => {
  await login(page, 'admin');
  const ck = (await page.context().cookies()).map((c) => `${c.name}=${c.value}`).join('; ');
  const r = await request.get('/api/seiem/estadistica', { headers: { cookie: ck } });
  expect(r.ok()).toBeTruthy();
  expect(r.headers()['content-type']).toContain('spreadsheet');
});
