import { test, expect } from '@playwright/test';
import { login } from './fixtures';

test('catálogo NEM muestra aprendizajes Mate y Lengua', async ({ page }) => {
  await login(page, 'admin');
  await page.goto('/admin/aprendizajes');
  await expect(page.locator('body')).toContainText(/Pensamiento|Lengua/i);
});

test('banco de preguntas accesible', async ({ page }) => {
  await login(page, 'admin');
  await page.goto('/admin/banco-preguntas');
  await expect(page.locator('h1, h2').first()).toContainText(/Banco/i);
});
