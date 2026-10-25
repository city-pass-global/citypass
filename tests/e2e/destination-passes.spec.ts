import { test, expect } from '@playwright/test';
import en from '../../messages/en.json' with { type: 'json' };
import es from '../../messages/es.json' with { type: 'json' };
import pt from '../../messages/pt.json' with { type: 'json' };
const treasury = 'GC6RIEORZ5UF7L2KKXCZLSGMSIYY5NG6FXCKR3J5P7ZYIXSMXLX2QJKU';
for (const [locale, messages] of [
  ['en', en],
  ['es', es],
  ['pt', pt],
] as const) {
  test(`published pass explains inclusions and requires sign-in in ${locale}`, async ({ page }) => {
    test.skip(process.env.TEST_PILOT_PASSES !== '1', 'Requires published development pilot offers');
    await page.goto(`/${locale}/destinations/lisbon`);
    const section = page.locator('#destination-pass');
    await expect(
      section.getByRole('heading', { name: messages.destinationPass.pilotOfferName, exact: true }),
    ).toBeVisible();
    await expect(section).toContainText(messages.destinationPass.pilotOfferBenefits);
    await expect(section.locator('.auth-gate')).toBeVisible();
    await expect(
      section.getByRole('button', { name: messages.destinationPass.buy, exact: true }),
    ).toHaveCount(0);
    await expect(
      section.getByText(messages.destinationPass.salePending, { exact: true }),
    ).toHaveCount(0);
  });
}
test('destination pass shows a concise summary without recipient information', async ({ page }) => {
  test.skip(process.env.TEST_SUPABASE_CONFIGURED !== '1', 'Requires destination registry');
  await page.goto('/en/destinations/lisbon');
  const section = page.locator('#destination-pass');
  await expect(
    section.getByRole('heading', { name: 'Destination pass', exact: true }),
  ).toBeVisible();
  await expect(section).not.toContainText('Stellar testnet');
  await expect(section).not.toContainText('Testnet pilot');
  await expect(section.locator('.pass-summary')).toContainText('100 USDC');
  await expect(section.locator('.pass-summary')).toContainText('+80');
  await expect(section.locator('.pass-benefit-preview')).toContainText('10%–50%');
  await expect(section).not.toContainText(treasury);
  await expect(section).not.toContainText('Payment recipient');
  const details = section.locator('.pass-details');
  await expect(details).not.toHaveAttribute('open');
  await details.locator('summary').click();
  await expect(details).toContainText('Mother’s Day');
  await expect(details).toContainText('0–79');
  await expect(section.getByRole('link', { name: 'Open your passport' })).toHaveAttribute(
    'href',
    '/en/passport',
  );
  await expect(section.getByRole('button', { name: en.destinationPass.buy })).toHaveCount(0);
  await details.locator('summary').click();
  await section.screenshot({
    path: `/private/tmp/citypass-refined-destination-${test.info().project.name}.png`,
  });
});

for (const [locale, tiers] of [
  ['en', 'Reputation tiers'],
  ['es', 'Niveles de reputación'],
  ['pt', 'Níveis de reputação'],
] as const) {
  test(`landing keeps pass selection compact and details accessible in ${locale}`, async ({
    page,
  }) => {
    test.skip(process.env.TEST_SUPABASE_CONFIGURED !== '1', 'Requires destination registry');
    await page.goto(`/${locale}`);
    const section = page.locator('#city-passes');
    const countries = section.locator('.pass-country');
    await expect(countries).toHaveCount(4);
    await expect(section.locator('.pass-entry:visible')).toHaveCount(0);
    await expect(section.locator('.pass-summary')).toContainText('100 USDC');
    await expect(section.locator('.pass-summary')).toContainText('+80');
    await expect(section).not.toContainText(treasury);
    await expect(section).not.toContainText('Destinatario del pago');
    const firstSummary = countries.first().locator('summary');
    await firstSummary.click();
    await expect(countries.first()).toHaveAttribute('open');
    await firstSummary.press('Enter');
    await expect(countries.first()).not.toHaveAttribute('open');
    await firstSummary.press('Space');
    await expect(section.locator('.pass-entry:visible')).toHaveCount(2);
    for (const country of await countries.all()) {
      if ((await country.getAttribute('open')) === null) await country.locator('summary').click();
    }
    const rows = section.locator('.pass-entry');
    await expect(rows).toHaveCount(8);
    for (const row of await rows.all()) {
      await expect(row).toContainText('100 USDC');
      await expect(row.getByRole('link')).toHaveAttribute(
        'href',
        new RegExp(`^/${locale}/destinations/[a-z-]+#destination-pass$`),
      );
    }
    const details = section.locator('.pass-details');
    await expect(details).not.toHaveAttribute('open');
    await details.locator('summary').click();
    await expect(section.getByRole('heading', { name: tiers, exact: true })).toBeVisible();
    for (const value of ['0–79', '80–239', '240+']) await expect(details).toContainText(value);
    const benefitsBox = await details.locator('.pass-benefits-detail').boundingBox();
    const tiersBox = await details.locator('.pass-reputation-detail').boundingBox();
    expect(benefitsBox).not.toBeNull();
    expect(tiersBox).not.toBeNull();
    if (page.viewportSize()!.width > 760)
      expect(tiersBox!.x).toBeGreaterThan(benefitsBox!.x + benefitsBox!.width);
    else expect(tiersBox!.y).toBeGreaterThan(benefitsBox!.y + benefitsBox!.height);
    const tierRows = await details.locator('.pass-tier-list > div').all();
    const firstTier = await tierRows[0].boundingBox();
    const secondTier = await tierRows[1].boundingBox();
    expect(secondTier!.y).toBeGreaterThan(firstTier!.y);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await details.screenshot({
      path: `/private/tmp/citypass-expanded-details-${locale}-${test.info().project.name}.png`,
      animations: 'disabled',
    });
    await details.locator('summary').click();
    for (const country of await countries.all()) await country.locator('summary').click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await section.screenshot({
      path: `/private/tmp/citypass-refined-landing-${locale}-${test.info().project.name}.png`,
    });
    await firstSummary.click();
    const link = rows.first().getByRole('link');
    const href = await link.getAttribute('href');
    await link.click();
    await expect(page).toHaveURL(new URL(href!, page.url()).href);
    await expect(page.locator('#destination-pass')).toBeVisible();
    await expect(page.locator('#destination-pass')).toContainText('100 USDC');
    await expect(page.locator('#destination-pass')).not.toContainText(treasury);
  });
}
