import { test, expect } from '@playwright/test';
import en from '../../messages/en.json' with { type: 'json' };
import es from '../../messages/es.json' with { type: 'json' };
import pt from '../../messages/pt.json' with { type: 'json' };

for (const [locale, messages] of [
  ['en', en],
  ['es', es],
  ['pt', pt],
] as const) {
  test(`passport creation CTAs lead to account access in ${locale}`, async ({ page, context }) => {
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
    await page.goto(`/${locale}`);
    const entries = page.getByRole('link', {
      name: messages.landing.getPassport,
      exact: true,
      includeHidden: true,
    });
    await expect(entries).toHaveCount(4);
    for (const entry of await entries.all())
      await expect(entry).toHaveAttribute('href', `/${locale}/login`);
    await page
      .locator('.global-hero')
      .getByRole('link', { name: messages.landing.getPassport })
      .click();
    await expect(page).toHaveURL(new RegExp(`/${locale}/login$`));
    await expect(page.locator('main .auth-gate')).toBeVisible();
    await expect(
      page.locator('main').getByRole('button', { name: messages.signIn, exact: true }),
    ).toBeVisible();
    await page.screenshot({
      path: `/private/tmp/citypass-login-${locale}-${test.info().project.name}.png`,
    });
  });
}

test('home stays global and country selection colors the complete journey', async ({
  page,
  context,
}) => {
  test.skip(process.env.TEST_SUPABASE_CONFIGURED !== '1', 'Requires the destination registry');
  await context.addCookies([
    {
      name: 'citypassport_destination',
      value: 'lisbon',
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
    },
  ]);
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Un pasaporte. Todos los destinos.' }),
  ).toBeVisible();
  await expect(page.locator('body')).toHaveAttribute('data-brand-page', 'neutral');
  await expect(page.getByLabel('Tu destino', { exact: true })).toBeHidden();
  await page.screenshot({
    path: `/private/tmp/citypassport-home-${test.info().project.name}.png`,
    fullPage: true,
  });
  await page.getByRole('link', { name: 'Explorar destinos', exact: true }).first().click();
  await expect(page).toHaveURL(/\/es\/destinations$/);
  await expect(page.locator('main .country-postcard')).toHaveCount(4);
  await page.getByRole('button', { name: 'Explorar Brasil', exact: true }).click();
  await expect(page).toHaveURL(/\/es\/destinations\/br$/);
  await expect(page.locator('body')).toHaveAttribute('data-country', 'BR');
  await expect(page.getByRole('heading', { name: 'Seguí el ritmo de descubrir.' })).toBeVisible();
  await page.getByRole('link', { name: 'Río de Janeiro', exact: true }).click();
  await expect(page.locator('body')).toHaveAttribute('data-country', 'BR');
  await page.getByRole('link', { name: 'Cambiar destino', exact: true }).click();
  await expect(page.locator('body')).not.toHaveAttribute('data-country');
  await page.getByRole('button', { name: 'Explorar Portugal', exact: true }).click();
  await expect(page.locator('body')).toHaveAttribute('data-country', 'PT');
  await page.getByRole('link', { name: 'EN', exact: true }).click();
  await expect(page).toHaveURL(/\/en\/destinations\/pt$/);
  await expect(page.locator('body')).toHaveAttribute('data-country', 'PT');
  await expect(page.getByRole('heading', { name: 'New streets. Lasting memories.' })).toBeVisible();
  await page.getByRole('link', { name: 'CityPassport', exact: true }).first().click();
  await expect(
    page.getByRole('heading', { name: 'One passport. Every destination.' }),
  ).toBeVisible();
  await expect(page.locator('body')).not.toHaveAttribute('data-country');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('landing connects destination scenes, unavailable passes and real entry points', async ({
  page,
}) => {
  test.skip(process.env.TEST_SUPABASE_CONFIGURED !== '1', 'Requires the destination registry');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/en');
  await expect(page.locator('.global-landing > section')).toHaveCount(8);
  await expect(page.locator('.landing-country')).toHaveCount(4);
  await expect(page.locator('.journey-stamp')).toHaveCount(4);
  for (const stamp of await page.locator('.journey-stamp').all()) await expect(stamp).toBeVisible();
  await expect(page.locator('.pass-entry a')).toHaveCount(8);
  for (const link of await page.locator('.pass-entry a').all())
    await expect(link).toHaveAttribute('href', /\/en\/destinations\/[a-z-]+#destination-pass$/);
  await page.getByRole('button', { name: 'Portugal', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Portugal', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.locator('.journey-stamp[data-active="true"]')).toHaveAttribute(
    'href',
    '/en/destinations/pt',
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({
    path: `/private/tmp/citypassport-global-${test.info().project.name}.png`,
    fullPage: true,
  });
  await page.locator('.global-hero').getByRole('link', { name: 'Get your passport' }).click();
  await expect(page).toHaveURL(/\/en\/login$/);
  await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeVisible();
  for (const code of ['cr', 'ar', 'br', 'pt']) {
    await page.goto('/en');
    await page.locator(`.landing-country[href="/en/destinations/${code}"]`).click();
    await expect(page).toHaveURL(new RegExp(`/en/destinations/${code}$`));
    await expect(page.locator('.country-city-grid article')).toHaveCount(2);
    for (const link of await page.locator('.country-city-grid h3 a').all()) {
      const target = await link.getAttribute('href');
      expect(target).toMatch(/^\/en\/destinations\/[a-z-]+$/);
    }
    await page.locator('.country-city-grid h3 a').first().click();
    await expect(page.locator('body')).toHaveAttribute('data-country', code.toUpperCase());
    await expect(page.locator('main h1')).toBeVisible();
  }
  await page.goto('/en');
  await page.getByRole('link', { name: 'Explore destination access', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Bring your destination to CityPassport.' }),
  ).toBeVisible();
  await expect(
    page.getByText('This page does not submit an application', { exact: false }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Open destination workspace' }).click();
  await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeVisible();
});
