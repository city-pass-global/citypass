import { test, expect } from '@playwright/test';

const cities = [
  ['buenos-aires', 6],
  ['lisbon', 6],
  ['san-jose', 6],
  ['la-fortuna', 6],
  ['rio-de-janeiro', 4],
  ['sao-paulo', 4],
  ['porto', 4],
] as const;
for (const [slug, stops] of cities) {
  test(`${slug} has sourced routes and isolated reward interests`, async ({ page, context }) => {
    test.skip(process.env.TEST_SUPABASE_CONFIGURED !== '1', 'Requires destination registry');
    await context.addCookies([
      {
        name: 'citypassport_destination',
        value: slug,
        domain: 'localhost',
        path: '/',
        httpOnly: true,
        sameSite: 'Lax',
      },
    ]);
    await page.goto('/en/routes');
    await expect(page.locator('.itinerary-stops li')).toHaveCount(stops);
    await expect(page.locator('.itinerary-stops a[target="_blank"]')).toHaveCount(stops);
    const save = page.locator('.route-save button');
    await save.click();
    await page.reload();
    await expect(save).toHaveAttribute('aria-pressed', 'true');
    await page.goto('/en/rewards');
    await expect(page.locator('.reward-concept')).toHaveCount(3);
    await expect(page.locator('.rewards-page')).not.toContainText('Iguazú');
    await page.locator('.reward-concept button').first().click();
    await page.reload();
    await expect(page.locator('.reward-concept button').first()).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await context.addCookies([
      {
        name: 'citypassport_destination',
        value: slug === 'lisbon' ? 'porto' : 'lisbon',
        domain: 'localhost',
        path: '/',
      },
    ]);
    await page.reload();
    await expect(page.locator('.reward-concept button').first()).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });
}
