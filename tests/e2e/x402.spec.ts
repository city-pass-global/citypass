import { test, expect } from '@playwright/test';
const id = '10000000-0000-4000-8000-000000000001';
test('agent API fails closed without a purchase credential and never accepts an app cookie as payment authorization', async ({
  request,
}) => {
  const attempts: Record<string, string>[] = [
    {},
    { Cookie: 'citypassport_session=' + 'f'.repeat(64) },
    { Authorization: 'Bearer invalid' },
  ];
  for (const headers of attempts) {
    const response = await request.get(`/api/agent/passes/${id}`, { headers });
    expect([401, 503]).toContain(response.status());
    expect(response.headers()['cache-control']).toContain('no-store');
    expect(response.headers()['payment-response']).toBeUndefined();
  }
});
test('agent authorization requires sign-in and explains the scope in each language', async ({
  page,
}) => {
  for (const [locale, title] of [
    ['en', 'Authorize an agent purchase'],
    ['es', 'Autorizar una compra por agente'],
    ['pt', 'Autorizar uma compra por agente'],
  ]) {
    await page.goto(`/${locale}/passport/agents`);
    await expect(page.getByRole('heading', { name: title })).toBeVisible();
    await expect(page.locator('input[name="agent_wallet"]')).toHaveCount(0);
  }
});
