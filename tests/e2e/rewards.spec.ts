import { test, expect } from '@playwright/test';
test('reward interests persist locally without presenting a redemption', async ({ page }) => {
  await page.goto('/es/rewards');
  await expect(page.locator('.reward-concept')).toHaveCount(3);
  await page.getByRole('button', { name: 'Mis intereses', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Tu próxima experiencia, a tu gusto' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Todas las propuestas', exact: true }).last().click();
  await page
    .getByRole('button', { name: 'Guardar interés: Sabores de Iguazú', exact: true })
    .click();
  await page.reload();
  await expect(
    page.getByRole('button', { name: 'Quitar interés: Sabores de Iguazú', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Mis intereses', exact: true }).click();
  await expect(page.locator('.reward-concept')).toHaveCount(1);
  await page
    .getByRole('button', { name: 'Quitar interés: Sabores de Iguazú', exact: true })
    .click();
  await expect(page.locator('.reward-concept')).toHaveCount(0);
  await page.getByText('¿Los sellos son puntos?', { exact: true }).click();
  await expect(
    page.getByText('No otorgan automáticamente puntos, descuentos ni dinero.', { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByText('Todavía no hay beneficios disponibles para canjear.', { exact: false }),
  ).toBeVisible();
});
