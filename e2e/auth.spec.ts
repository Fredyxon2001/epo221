import { test, expect } from '@playwright/test';
import { login } from './fixtures';

test.describe('Autenticación', () => {
  test('login admin → /admin', async ({ page }) => {
    await login(page, 'admin');
    await expect(page).toHaveURL(/\/admin/);
    await expect(page.locator('body')).toContainText(/Panel|Resumen|Admin/i);
  });

  test('login profesor → /profesor', async ({ page }) => {
    await login(page, 'profesor');
    await expect(page).toHaveURL(/\/profesor/);
  });

  test('login alumno → /alumno', async ({ page }) => {
    await login(page, 'alumno');
    await expect(page).toHaveURL(/\/alumno/);
  });

  test('rechaza credenciales inválidas', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/correo|email/i).fill('inexistente@epo221.edu.mx');
    await page.getByLabel(/contraseña|password/i).fill('contraseña-invalida-xyz');
    await page.getByRole('button', { name: /entrar|iniciar/i }).click();
    await expect(page).toHaveURL(/\/login/);
  });
});
