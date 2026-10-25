import { test, expect } from '@playwright/test';
test('seeded demo is separate from real offers and cannot link to a provider', async ({ page }) => {
  test.skip(
    process.env.TEST_DEMO_SEEDED !== '1',
    'Requires explicit selected-development demo seed',
  );
  await page.goto('/en/destinations/lisbon');
  await expect(
    page.getByRole('heading', { name: 'Explore a fictional example', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText('No experiences have been published for this destination yet.', { exact: true }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Fictional experience', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Fictional experience', exact: true }),
  ).toBeVisible();
  await expect(page.getByText('Fictional example', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Visit provider website', exact: true })).toHaveCount(
    0,
  );
  await expect(page.locator('a[href*="/inquiries"]')).toHaveCount(0);
});
