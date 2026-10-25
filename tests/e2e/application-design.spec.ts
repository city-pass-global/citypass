import { test, expect } from '@playwright/test';

test('traveler navigation stays connected and business tools are a separate disclosure', async ({
  page,
}) => {
  await page.goto('/en/profile');
  await expect(page.getByRole('heading', { name: 'Your travel essentials' })).toBeVisible();
  const business = page.locator('.workspace-directory');
  await expect(business).not.toHaveAttribute('open');
  await business.locator('summary').click();
  await expect(business.getByRole('link')).toHaveCount(4);
  await business.getByRole('link', { name: /Merchant portal/ }).click();
  await expect(page.getByRole('heading', { name: 'Merchant portal', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'A workspace with a purpose.' })).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Continue with Google', exact: true }),
  ).toBeVisible();
  await expect(page.locator('form input[name="organization_id"]')).toHaveCount(0);
  await page.goto('/en/wallet');
  await expect(page.locator('.destination-bar')).toHaveCount(0);
  for (const link of await page
    .locator('nav.desktop-nav a[href="/en/wallet"], nav.mobile-nav a[href="/en/wallet"]')
    .all())
    await expect(link).toHaveAttribute('aria-current', 'page');
  await page
    .getByRole('navigation', { name: 'Explore your journey' })
    .getByRole('link', { name: 'City guide', exact: true })
    .click();
  await expect(page).toHaveURL(/\/en\/explore$/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('scanner starts only on request and explains a manual fallback', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'BarcodeDetector', { configurable: true, value: undefined });
  });
  await page.goto('/en/pay');
  await expect(page.getByRole('button', { name: 'Close camera', exact: true })).toBeDisabled();
  await expect(page.locator('.scanner video')).toBeHidden();
  await page.getByRole('button', { name: 'Open camera', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Use your phone camera');
  await page
    .getByLabel('Checkout link', { exact: true })
    .fill('https://example.com/en/checkout/a1000000-0000-4000-8000-000000000001');
  await page.getByRole('button', { name: 'Review checkout', exact: true }).click();
  await expect(page.getByLabel('Checkout link', { exact: true })).toHaveAttribute(
    'aria-invalid',
    'true',
  );
  await expect(page.locator('#checkout-link-error')).toBeVisible();
  await page.getByLabel('Checkout link', { exact: true }).fill('https://example.com/changed');
  await expect(page.getByLabel('Checkout link', { exact: true })).toHaveAttribute(
    'aria-invalid',
    'false',
  );
  await expect(page.locator('#checkout-link-error')).toHaveCount(0);
});

test('closing or leaving the scanner releases camera tracks and clears its preview', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const state = { opened: 0, stopped: 0 };
    Object.assign(window, { cameraTestState: state });
    let firstFrame = true;
    Object.defineProperty(window, 'BarcodeDetector', {
      configurable: true,
      value: class {
        async detect() {
          if (firstFrame) {
            firstFrame = false;
            return new Promise<never>((_, reject) => {
              Object.assign(window, {
                rejectPreviousCameraFrame: () => reject(new Error('expired_frame')),
              });
            });
          }
          return [];
        }
      },
    });
    const streams = new WeakMap<HTMLMediaElement, unknown>();
    Object.defineProperty(HTMLMediaElement.prototype, 'srcObject', {
      configurable: true,
      get() {
        return streams.get(this);
      },
      set(value) {
        streams.set(this, value);
      },
    });
    HTMLMediaElement.prototype.play = () => Promise.resolve();
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
      configurable: true,
      value: async () => {
        state.opened++;
        return {
          getTracks: () => [
            {
              stop: () => {
                state.stopped++;
              },
            },
          ],
        };
      },
    });
  });
  await page.goto('/en/pay');
  const state = () =>
    page.evaluate(
      () =>
        (window as unknown as { cameraTestState: { opened: number; stopped: number } })
          .cameraTestState,
    );
  expect(await state()).toEqual({ opened: 0, stopped: 0 });
  await page.getByRole('button', { name: 'Open camera', exact: true }).click();
  await expect(page.locator('.scanner')).toHaveAttribute('data-active', 'true');
  await page.getByRole('button', { name: 'Open camera', exact: true }).click();
  await expect(page.locator('.scanner')).toHaveAttribute('data-active', 'true');
  await page.evaluate(() =>
    (window as unknown as { rejectPreviousCameraFrame: () => void }).rejectPreviousCameraFrame(),
  );
  await expect(page.locator('.scanner')).toHaveAttribute('data-active', 'true');
  await page.getByRole('button', { name: 'Close camera', exact: true }).click();
  await expect(page.locator('.scanner video')).toBeHidden();
  expect(
    await page.locator('.scanner video').evaluate((video: HTMLVideoElement) => video.srcObject),
  ).toBeNull();
  expect(await state()).toEqual({ opened: 2, stopped: 2 });
  await page.getByRole('button', { name: 'Open camera', exact: true }).click();
  await expect(page.locator('.scanner')).toHaveAttribute('data-active', 'true');
  await page
    .getByRole('navigation', { name: 'Explore your journey' })
    .getByRole('link', { name: 'City guide', exact: true })
    .click();
  await expect(page).toHaveURL(/\/en\/explore$/);
  expect(await state()).toEqual({ opened: 3, stopped: 3 });
});

test('unknown destinations offer a localized route back to discovery', async ({ page }) => {
  await page.goto('/pt/destinations/unknown-city');
  await expect(page.getByRole('heading', { name: '404', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Voltar aos destinos', exact: true }).click();
  await expect(page).toHaveURL(/\/pt\/destinations$/);
});

test('country discovery fits a narrow phone without crowding its passport link', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto('/en/destinations');
  await expect(page.getByRole('heading', { name: 'Destinations', exact: true })).toBeVisible();
  await expect(page.locator('.atlas-passport')).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    .toBe(true);
});
