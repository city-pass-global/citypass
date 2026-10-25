import { test, expect } from '@playwright/test';
test('discovery works without an account and preserves source attribution', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/es/explore');
  await expect(
    page.getByRole('heading', { name: 'El viaje se vive. Los recuerdos se sellan.' }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Garganta del Diablo' })).toBeVisible();
  await expect(
    page.getByText('Las referencias de Visit Iguazú no implican una alianza', { exact: false }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Gastronomía', exact: true }).click();
  await expect(page.getByText('No hay lugares en esta categoría.')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  expect(errors).toEqual([]);
});
test('passport does not fabricate stamps and sign-in reflects configuration', async ({ page }) => {
  await page.goto('/es/passport');
  await expect(page.getByText('Tu primer sello te espera')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Continuar con Google' })).toBeEnabled({
    enabled: process.env.TEST_POLLAR_CONFIGURED === '1',
  });
  await page.goto('/es/hotel');
  await expect(page.getByRole('heading', { name: 'Iniciá sesión para continuar' })).toBeVisible();
});
test('all three languages render server and client copy', async ({ page }) => {
  await page.goto('/en/explore');
  await expect(
    page.getByRole('heading', { name: 'Live the journey. Keep the memories.' }),
  ).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await page.getByRole('link', { name: 'PT', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'pt');
  await page.goto('/pt/passport');
  await expect(
    page.getByText('Um passaporte para todos os destinos.', { exact: false }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Um lugar para suas lembranças.' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Continuar com Google' })).toBeEnabled({
    enabled: process.env.TEST_POLLAR_CONFIGURED === '1',
  });
});
test('guest form removes fragment and rejects incomplete submissions', async ({ page }) => {
  await page.goto('/es/precheckin#token=' + 'a'.repeat(64));
  await expect(page).toHaveURL(/\/es\/precheckin$/);
  await page.getByRole('button', { name: 'Enviar al hotel' }).click();
  await expect(page.getByText('Revisá los datos ingresados.').first()).toBeVisible();
  await expect(page.getByText('Confirmá la autorización para continuar.')).toBeVisible();
});
test('planned rewards are clearly unavailable', async ({ page }) => {
  await page.goto('/es/rewards');
  await expect(
    page.getByText('Todavía no hay beneficios disponibles para canjear.', { exact: false }),
  ).toBeVisible();
});

test('source directory supports agency filtering, contacts and search', async ({ page }) => {
  await page.goto('/es/explore?category=agency#discover');
  await expect(page.getByRole('heading', { name: 'Aguas Grandes', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Garganta del Diablo' })).toHaveCount(0);
  const agency = page.locator('article').filter({ hasText: 'Aguas Grandes' });
  await agency.locator('summary').click();
  await expect(
    agency.getByRole('link', { name: 'info@aguasgrandes.tur.ar', exact: true }),
  ).toHaveAttribute('href', 'mailto:info@aguasgrandes.tur.ar');
  await expect(agency.getByRole('link', { name: 'Ver en Visit Iguazú' })).toHaveAttribute(
    'href',
    'https://visitiguazu.travel/agencias/aguas-grandes/',
  );
  await page.getByRole('searchbox').fill('entre rios');
  await page.getByRole('button', { name: 'Buscar', exact: true }).click();
  await expect(page.locator('article.place')).toHaveCount(1);
  await page.getByRole('link', { name: 'Ver todos', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Güirá Oga', exact: true })).toBeVisible();
});
