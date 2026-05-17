import { test, expect } from '@playwright/test';
import { login } from './fixtures';

test('admin abre PMI y ve formulario nuevo', async ({ page }) => {
  await login(page, 'admin');
  await page.goto('/admin/pmi');
  await expect(page.locator('h1, h2').first()).toContainText(/PMI|Plan de Mejora/i);
  await page.getByText(/Nuevo PMI/i).click();
  await expect(page.locator('select[name="alumno_id"]')).toBeVisible();
});
