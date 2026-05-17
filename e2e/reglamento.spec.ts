import { test, expect } from '@playwright/test';
import { login } from './fixtures';

test('alumno ve reglamento vigente', async ({ page }) => {
  await login(page, 'alumno');
  await page.goto('/alumno/reglamento');
  await expect(page.locator('h1')).toContainText(/Reglamento/i);
  await expect(page.locator('body')).toContainText(/EPO 221/);
});
