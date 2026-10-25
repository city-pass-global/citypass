import { test, expect } from '@playwright/test';
test('Pollar is the only sign-in and an invalid application cookie grants no profile access', async ({
  page,
  context,
}) => {
  await context.addCookies([
    {
      name: 'citypassport_session',
      value: 'a'.repeat(64),
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
    },
  ]);
  const oauthRequests: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/auth/v1/authorize'))
      oauthRequests.push(request.url().split('?')[0]);
  });
  await page.goto('/en/wallet');
  await expect(page.getByRole('heading', { name: 'Wallet', exact: true })).toBeVisible();
  await expect(
    page.getByText('Sign in with Google through Pollar', { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Continue with Google', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Send', exact: true })).toHaveCount(0);
  expect(oauthRequests).toEqual([]);
});
