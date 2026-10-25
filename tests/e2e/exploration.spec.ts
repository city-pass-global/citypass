import { test, expect } from '@playwright/test';

test('merchant directory is reachable and searchable across destinations', async ({ page }) => {
  await page.goto('/en/merchants');
  await expect(page.getByRole('heading', { name: 'Explore the merchant directory' })).toBeVisible();
  if (process.env.TEST_SUPABASE_CONFIGURED !== '1') {
    await expect(page.getByText('The live merchant directory is unavailable until the database is configured.')).toBeVisible();
    return;
  }
  await page.screenshot({ path: `/private/tmp/citypass-merchants-${test.info().project.name}.png`, fullPage: true });
  await page.getByLabel('Search merchants', { exact: true }).fill('no-such-merchant-23892');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(page.getByText('No merchants match your search. Try another name or destination.')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('each idea offers scanning and direct claiming with a clear sign-in path', async ({ page }) => {
  test.skip(process.env.TEST_SUPABASE_CONFIGURED !== '1', 'Requires destination registry');
  await page.goto('/en/destinations/lisbon');
  const guide = page.locator('#things-to-do');
  await expect(guide.getByRole('button', { name: 'Collect Stamp', exact: true })).toHaveCount(6);
  await expect(guide.getByRole('progressbar')).toHaveAttribute('value', '0');
  const collect = guide.getByRole('button', { name: 'Collect Stamp', exact: true }).first();
  await collect.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('button', { name: 'Scan QR Code', exact: true })).toBeVisible();
  await expect(dialog.getByRole('link', { name: 'Claim Stamp', exact: true })).toHaveAttribute('href', '/en/login');
  await expect(dialog.getByText(/No purchase required/)).toBeVisible();
  await dialog.getByRole('button', { name: 'Scan QR Code', exact: true }).click();
  await expect(dialog.getByRole('link', { name: 'Sign in to collect this stamp' })).toBeVisible();
  await page.screenshot({ path: `/private/tmp/citypass-collect-${test.info().project.name}.png` });
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(collect).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('service catalog does not add example badges or invent payment capability',async({page})=>{
  test.skip(process.env.TEST_SUPABASE_CONFIGURED!=='1','Requires directory');
  await page.goto('/en/merchants');
  await expect(page.getByRole('heading',{name:'Example testnet prices'})).toHaveCount(0);
  await expect(page.locator('.service-price-examples')).toHaveCount(0);
  if (process.env.TEST_MERCHANT_SERVICES==='1') {
    await expect(page.getByRole('link',{name:'Buy service',exact:true}).first()).toBeVisible();
    await expect(page.getByText('CityPassport digital service',{exact:true}).first()).toBeVisible();
  } else {
    await expect(page.getByText('Service checkout is being set up. Purchases are unavailable right now.',{exact:true}).first()).toBeVisible();
  }
});
