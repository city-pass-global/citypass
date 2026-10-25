import { test, expect } from '@playwright/test';

test('sample stamp is explicitly a preview and resets', async ({ page }) => {
  await page.goto('/es/explore');
  await page.getByRole('button', { name: 'Probá tu primer sello', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Solo una muestra.');
  await expect(page.locator('.sample-seal')).toHaveClass(/is-stamped/);
  await page.getByRole('button', { name: 'Probar otra vez', exact: true }).click();
  await expect(page.locator('.sample-seal')).toHaveCount(0);
  await page.goto('/es/passport');
  await expect(page.getByRole('heading', { name: 'Sellos coleccionados 0' })).toBeVisible();
});

test('reduced motion keeps the static illustration until explicitly enabled', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/en/explore');
  await expect(page.locator('canvas')).toHaveCount(0);
  await page.getByRole('button', { name: 'Try a sample stamp', exact: true }).click();
  await page.getByRole('button', { name: /Iguazú Falls/ }).click();
  await expect(page.locator('.living-landscape')).toHaveAttribute('data-scene', 'static');
  await expect(page.locator('.scene-canvas canvas')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Enable animation' })).toBeVisible();
});

test('WebGL failure leaves useful content and the original illustration', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, ...args) {
      if (String(args[0]).startsWith('webgl')) return null;
      return original.apply(this, args as Parameters<typeof original>);
    } as typeof original;
  });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/es/explore');
  await page.getByRole('button', { name: 'Probá tu primer sello', exact: true }).click();
  await page.getByRole('button', { name: /Cataratas del Iguazú/ }).click();
  await expect(page.locator('.living-landscape')).toHaveAttribute('data-scene', 'fallback');
  await expect(page.locator('.scene-fallback')).toHaveCSS('opacity', '1');
  await expect(page.getByRole('dialog')).toContainText('Diseño de muestra.');
});

test('scene has pause and view controls, and releases its canvas on navigation', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/es/explore');
  await page.getByRole('button', { name: 'Probá tu primer sello', exact: true }).click();
  await page.getByRole('button', { name: /Cataratas del Iguazú/ }).click();
  await expect(page.locator('.living-landscape')).toHaveAttribute('data-scene', 'ready');
  await page.getByRole('button', { name: 'Pausar animación' }).click();
  await expect(page.getByRole('button', { name: 'Activar animación' })).toBeVisible();
  await page.getByRole('button', { name: 'Acercarme' }).click();
  await expect(page.getByRole('button', { name: 'Ver el paisaje' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Cataratas del Iguazú/ })).toBeFocused();
  await expect(page.locator('.scene-canvas canvas')).toHaveCount(0);
});

test('passport opens its sample page without adding collected stamps', async ({ page }) => {
  await page.goto('/es/passport');
  await expect(page.locator('canvas')).toHaveCount(0);
  await page.getByRole('button', { name: 'Abrí tu pasaporte' }).click();
  await page.getByRole('button', { name: 'Probá tu primer sello', exact: true }).click();
  await page.getByRole('button', { name: /Cataratas del Iguazú/ }).click();
  await expect(page.getByRole('dialog')).toContainText('Diseño de muestra.');
  await page.getByRole('button', { name: 'Cerrar detalle del sello' }).click();
  await expect(page.getByRole('heading', { name: 'Sellos coleccionados 0' })).toBeVisible();
});
