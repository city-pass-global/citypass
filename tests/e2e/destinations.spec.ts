import { test, expect } from '@playwright/test';
test('destination browsing separates sourced listings and rejects unknown slugs', async ({
  page,
}) => {
  test.skip(
    process.env.TEST_SUPABASE_CONFIGURED !== '1',
    'Requires the migrated development database',
  );
  await page.goto('/en/destinations');
  await expect(page.getByRole('heading', { name: 'Destinations', exact: true })).toBeVisible();
  await page.screenshot({
    path: `/private/tmp/citypassport-destinations-${test.info().project.name}.png`,
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Explore Portugal', exact: true }).click();
  await page.getByRole('link', { name: 'Lisbon', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Things to do', exact: true })).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Wander through Alfama', exact: true }),
  ).toBeVisible();
  await expect(page.getByText('Güirá Oga', { exact: true })).toHaveCount(0);
  await page.getByRole('link', { name: 'Change destination' }).click();
  await page.getByRole('button', { name: 'Explore Argentina', exact: true }).click();
  await page.getByRole('link', { name: 'Puerto Iguazú', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Güirá Oga', exact: true })).toBeVisible();
  await page.goto('/en/destinations/unknown-city');
  await expect(page.getByRole('heading', { name: '404', exact: true })).toBeVisible();
});
test('unpublished experiences are absent and operator actions require Pollar login', async ({
  page,
  context,
}) => {
  test.skip(process.env.TEST_SUPABASE_CONFIGURED !== '1', 'Requires migrated development database');
  await page.goto('/en/destinations/lisbon');
  await expect(
    page.getByRole('heading', { name: 'Published experiences', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText('No experiences have been published for this destination yet.', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText('This is experience information, not a confirmed reservation.', {
      exact: false,
    }),
  ).toBeVisible();
  await context.addCookies([
    {
      name: 'citypassport_session',
      value: 'c'.repeat(64),
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
    },
  ]);
  for (const path of ['/en/operator', '/en/operator/a1000000-0000-4000-8000-000000000001']) {
    await page.goto(path);
    await expect(
      page.getByRole('button', { name: 'Continue with Google', exact: true }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Publish experience', exact: true })).toHaveCount(
      0,
    );
  }
  await page.goto('/en/experiences/a1000000-0000-4000-8000-000000000001');
  await expect(page.getByRole('heading', { name: '404', exact: true })).toBeVisible();
});
