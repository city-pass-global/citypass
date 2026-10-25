import { test, expect } from '@playwright/test';
test('suggested route selection, device bookmark and source links', async ({ page }) => {
  await page.goto('/es/routes');
  await expect(page.getByRole('heading', { name: 'El agua como protagonista', exact: true })).toBeVisible();
  await page.getByRole('link', { name: /Entre aves y selva/ }).click();
  await expect(page.locator('.itinerary-stops li')).toHaveCount(2);
  await expect(page.getByRole('heading', { name: 'Güirá Oga', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Guardar ruta', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Ruta guardada en este dispositivo.');
  await page.reload();
  await expect(page.getByRole('button', { name: 'Quitar de guardadas' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Quitar de guardadas' }).click();
  await expect(page.getByRole('button', { name: 'Guardar ruta', exact: true })).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('.route-stop-links a').first()).toHaveAttribute('href', 'https://visitiguazu.travel/atractivos/el-jardin-de-los-picaflores/');
  await expect(page.getByText('Guardar esta ruta no acredita visitas.', {exact: false})).toBeVisible();
});
