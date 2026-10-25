import { test, expect } from '@playwright/test';

test.beforeEach(() =>
  test.skip(process.env.TEST_SUPABASE_CONFIGURED !== '1', 'Requires the destination registry'),
);
for (const [slug, title, source, count] of [
  ['buenos-aires', 'Discover Teatro Colón', 'visitbue.com', 6],
  ['lisbon', 'Wander through Alfama', 'www.visitlisboa.com', 6],
  ['san-jose', 'National Theatre', 'es.visitcostarica.com', 6],
  ['la-fortuna', 'Arenal Volcano National Park', 'es.visitcostarica.com', 6],
  ['rio-de-janeiro', 'Selarón Steps', 'www.visitbrasil.com', 4],
  ['sao-paulo', 'Art at MASP', 'www.visitbrasil.com', 4],
  ['porto', 'São Bento station', 'visitporto.travel', 4],
] as const) {
  test(`${slug} has attributed discovery ideas isolated from operator experiences`, async ({
    page,
  }) => {
    await page.goto(`/en/destinations/${slug}`);
    const guide = page.locator('#things-to-do');
    await expect(guide.getByRole('heading', { name: title, exact: true })).toBeVisible();
    await expect(guide.locator('.guide-ideas > li')).toHaveCount(count);
    await expect(guide.locator('.place-art svg')).toHaveCount(count);
    await expect(
      guide.getByText('Travel illustrations; not photographs of the places.', { exact: true }),
    ).toBeVisible();
    for (const link of await guide.locator('.guide-ideas a').all()) {
      expect(new URL((await link.getAttribute('href'))!).hostname).toBe(source);
      await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    }
    await expect(guide.getByText(/do not imply a CityPassport partnership/)).toBeVisible();
    await expect(guide.getByRole('link', { name: /book|inquiry|stamp/i })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Güirá Oga', exact: true })).toHaveCount(0);
    await expect(
      page.getByRole('heading', { name: 'Published experiences', exact: true }),
    ).toBeVisible();
    await page.screenshot({
      path: `/private/tmp/citypassport-${slug}-redesign-${test.info().project.name}.png`,
      fullPage: true,
    });
  });
}
test('guide filters, accent-insensitive search, empty recovery and language navigation work', async ({
  page,
}) => {
  await page.goto('/en/destinations/buenos-aires');
  const guide = page.locator('#things-to-do');
  await guide.getByRole('link', { name: 'Art & culture', exact: true }).click();
  await expect(guide.locator('.guide-ideas > li')).toHaveCount(4);
  await guide.getByLabel('Search ideas', { exact: true }).fill('colon');
  await guide.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(guide.locator('.guide-ideas > li')).toHaveCount(1);
  await expect(
    guide.getByRole('heading', { name: 'Discover Teatro Colón', exact: true }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'ES', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Conocer el Teatro Colón', exact: true }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'PT', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Conheça o Teatro Colón', exact: true }),
  ).toBeVisible();
  await page.goto('/en/destinations/buenos-aires?q=not-a-real-attraction');
  await expect(guide.getByText('No ideas match these filters.', { exact: true })).toBeVisible();
  await guide.getByRole('link', { name: 'Show all ideas', exact: true }).click();
  await expect(guide.locator('.guide-ideas > li')).toHaveCount(6);
});
test('saved-city exploration keeps guide filters on the explore route', async ({ page }) => {
  await page.goto('/en/explore');
  await page.goto('/en/destinations/sao-paulo');
  await page.getByRole('button', { name: 'Use this destination', exact: true }).click();
  await expect(page).toHaveURL(/\/en\/explore$/);
  await expect(page.getByRole('heading', { name: 'São Paulo', exact: true })).toBeVisible();
  await page.goto('/en/explore');
  await page
    .locator('#things-to-do')
    .getByRole('link', { name: 'Food & drink', exact: true })
    .click();
  await expect(page).toHaveURL(/\/en\/explore\?category=food#things-to-do$/);
  await expect(page.locator('.guide-ideas > li')).toHaveCount(1);
  await expect(
    page.getByRole('heading', { name: 'Flavours of the Municipal Market', exact: true }),
  ).toBeVisible();
});
