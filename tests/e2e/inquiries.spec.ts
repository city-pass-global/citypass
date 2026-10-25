import { test, expect } from '@playwright/test';

test('retired inquiry screens expose no forms even with a forged session', async ({
  page,
  context,
}) => {
  await context.addCookies([
    {
      name: 'citypassport_session',
      value: 'd'.repeat(64),
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
    },
  ]);
  for (const locale of ['es', 'en', 'pt']) {
    for (const path of [
      'inquiries',
      'inquiries/new?experience=a1000000-0000-4000-8000-000000000001',
      'inquiries/b1000000-0000-4000-8000-000000000001',
      'operator/inquiries',
    ]) {
      await page.goto(`/${locale}/${path}`);
      await expect(page.getByRole('heading', { name: '404', exact: true })).toBeVisible();
      await expect(page.locator('main form')).toHaveCount(0);
    }
  }
});

test('navigation and profile no longer link to inquiries', async ({ page }) => {
  for (const path of ['explore', 'routes', 'rewards', 'profile']) {
    await page.goto(`/en/${path}`);
    await expect(page.locator('a[href*="/inquiries"]')).toHaveCount(0);
  }
});
