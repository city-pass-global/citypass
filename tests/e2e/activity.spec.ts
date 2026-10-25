import { test, expect } from '@playwright/test';

test('anonymous and forged sessions cannot activate or publish activity', async ({ page, context }) => {
  await context.addCookies([{ name: 'citypassport_session', value: 'f'.repeat(64), domain: 'localhost', path: '/', httpOnly: true, sameSite: 'Lax' }]);
  await page.goto('/en/passport');
  await expect(page.getByRole('heading', { name: 'Sign in to continue' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Activate and sync verified activity' })).toHaveCount(0);
  await expect(page.getByText('On-chain:', { exact: false })).toHaveCount(0);
});

test('privacy explains public wallet activity in all interface languages', async ({ page }) => {
  for (const [locale, heading, text] of [
    ['en', 'Passport on Stellar', 'public and persistent'],
    ['es', 'Pasaporte en Stellar', 'públicos y persistentes'],
    ['pt', 'Passaporte na Stellar', 'públicos e persistentes'],
  ]) {
    await page.goto(`/${locale}/privacy`);
    await expect(page.getByRole('heading', { name: heading })).toBeVisible();
    await expect(page.getByText(text, { exact: false })).toBeVisible();
  }
});
