import { test, expect } from '@playwright/test';
test.beforeEach(() =>
  test.skip(process.env.TEST_SUPABASE_CONFIGURED !== '1', 'Requires migrated destination registry'),
);
test('city selection survives navigation, reload and language changes without Iguazu leakage', async ({
  page,
  context,
}) => {
  await page.goto('/en/explore');
  await page.goto('/en/destinations/lisbon');
  await page.getByRole('button', { name: 'Use this destination', exact: true }).click();
  await expect(page).toHaveURL(/\/en\/explore$/);
  await expect(page.getByRole('heading', { name: 'Lisbon', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Güirá Oga', exact: true })).toHaveCount(0);
  await expect(page.getByText('Your first stamp', { exact: true })).toHaveCount(0);
  await page.reload();
  await expect(page.locator('.destination-bar')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Lisbon', exact: true })).toBeVisible();
  const cookie = (await context.cookies()).find((c) => c.name === 'citypassport_destination');
  expect(cookie?.value).toBe('lisbon');
  expect(cookie?.httpOnly).toBe(true);
  expect(cookie?.sameSite).toBe('Lax');
  await page.goto('/en/destinations/lisbon');
  await page.getByRole('link', { name: 'PT', exact: true }).click();
  await expect(page).toHaveURL(/\/pt\/destinations\/lisbon$/);
  await expect(page.locator('.destination-bar')).toHaveCount(0);
  await page.goto('/en/routes');
  await expect(page.getByRole('heading', { name: 'Routes in Lisbon', exact: true })).toBeVisible();
  await expect(page.locator('.itinerary-stops li')).toHaveCount(6);
  await expect(
    page.getByRole('heading', { name: 'Lanes, the Tagus and ocean life' }),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: /wildlife/i })).toHaveCount(0);
  await page.goto('/en/rewards');
  await expect(page.getByRole('heading', { name: 'Rewards in Lisbon', exact: true })).toBeVisible();
  await expect(page.locator('.reward-concept')).toHaveCount(3);
  await page
    .getByRole('button', { name: 'Save interest: Flavours of Lisbon', exact: true })
    .click();
  await page.reload();
  await expect(
    page.getByRole('button', { name: 'Remove interest: Flavours of Lisbon', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await page.goto('/en/passport');
  await expect(
    page.getByText(
      'Exploring Lisbon. Your passport still includes stamps from every destination.',
      { exact: true },
    ),
  ).toBeVisible();
  await page.goto('/en/destinations/ar');
  await page
    .locator('.country-city-grid article')
    .filter({ hasText: 'Puerto Iguazú' })
    .getByRole('button', { name: 'Explore city', exact: true })
    .click();
  await expect(page.getByRole('heading', { name: 'Güirá Oga', exact: true })).toBeVisible();
});
test('unknown destination cookie falls back safely and a forged city selection is rejected', async ({
  page,
  context,
}) => {
  await context.addCookies([
    {
      name: 'citypassport_destination',
      value: 'unknown-city',
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
    },
  ]);
  await page.goto('/en/explore');
  await expect(
    page.getByRole('heading', { name: 'Live the journey. Keep the memories.' }),
  ).toBeVisible();
  await page.goto('/en/destinations/lisbon');
  await page.locator('main input[name=slug]').evaluate((input: HTMLInputElement) => {
    input.value = 'unknown-city';
  });
  await page.getByRole('button', { name: 'Use this destination', exact: true }).click();
  await expect(page).toHaveURL(/\/en\/destinations\?error=selection$/);
  await expect(page.locator('main [role=alert]')).toHaveText(
    'Choose a destination from the directory.',
  );
  expect((await context.cookies()).find((c) => c.name === 'citypassport_destination')?.value).toBe(
    'unknown-city',
  );
});
test('language navigation preserves review paths and strips credential parameters', async ({
  page,
}) => {
  await page.goto('/es/pay?token=do-not-forward&code=do-not-forward');
  await page.getByRole('link', { name: 'EN', exact: true }).click();
  await expect(page).toHaveURL(/\/en\/pay$/);
  await expect(page.getByRole('heading', { name: 'Scan a checkout', exact: true })).toBeVisible();
});
