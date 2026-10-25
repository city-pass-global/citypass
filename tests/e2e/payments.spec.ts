import { test, expect } from '@playwright/test';
test('merchant and checkout require Pollar sign-in', async ({ page }) => {
  for (const path of ['/en/merchant', '/en/checkout/11111111-1111-4111-8111-111111111111']) {
    await page.goto(path);
    await expect(
      page.getByRole('button', { name: 'Continue with Google', exact: true }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Pay with Pollar', exact: true })).toHaveCount(0);
  }
});
test('checkout scanner rejects foreign links and accepts local checkout links', async ({
  page,
}) => {
  await page.goto('/en/pay');
  const input = page.locator('input[type=url]');
  await input.fill('https://example.com/en/checkout/11111111-1111-4111-8111-111111111111');
  await page.getByRole('button', { name: 'Review checkout', exact: true }).click();
  await expect(page.locator('main p[role=alert]')).toBeVisible();
  await expect(page).toHaveURL(/\/en\/pay$/);
  await input.fill(new URL('/en/checkout/11111111-1111-4111-8111-111111111111', page.url()).href);
  await page.getByRole('button', { name: 'Review checkout', exact: true }).click();
  await expect(page).toHaveURL(/\/en\/checkout\/11111111-1111-4111-8111-111111111111$/);
});
test('merchant review never grants access through an invalid session', async ({
  page,
  context,
}) => {
  await context.addCookies([
    {
      name: 'citypassport_session',
      value: 'f'.repeat(64),
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
    },
  ]);
  await page.goto('/en/review');
  await expect(page.getByRole('heading', { name: 'Merchant review', exact: true })).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Continue with Google', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Approve merchant', exact: true })).toHaveCount(0);
  await expect(page.getByRole('textbox', { name: 'Decision reason', exact: true })).toHaveCount(0);
});
