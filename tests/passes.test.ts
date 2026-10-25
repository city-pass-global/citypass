import { describe, expect, it } from 'vitest';
import { passOfferSchema, reputationTier } from '../src/lib/passes/validation';
describe('destination pass rules', () => {
  it('uses the agreed tier boundaries', () => {
    expect([0, 79, 80, 239, 240, 800].map(reputationTier)).toEqual([
      'basic',
      'basic',
      'mid',
      'mid',
      'top',
      'top',
    ]);
  });
  it('rejects changed prices and reputation awards from the catalog', () => {
    const offer = {
      id: '11111111-1111-4111-8111-111111111111',
      destination_id: '11111111-1111-4111-8111-111111111112',
      organization_id: '11111111-1111-4111-8111-111111111113',
      names: { es: 'Pase', en: 'Pass', pt: 'Passe' },
      benefits: { es: 'Visita', en: 'Visit', pt: 'Visita' },
      amount: '100',
      reputation_points: 80,
      published: true,
    };
    expect(passOfferSchema.safeParse(offer).success).toBe(true);
    expect(passOfferSchema.safeParse({ ...offer, amount: '101' }).success).toBe(false);
    expect(passOfferSchema.safeParse({ ...offer, reputation_points: 800 }).success).toBe(false);
  });
});

describe('testnet treasury readiness', () => {
  it('requires spendable buyer USDC from the exact issuer and excludes selling liabilities', async () => {
    const { canPayTestnetUsdc } = await import('../src/lib/payments/recipient');
    const { TESTNET_USDC_ISSUER } = await import('../src/lib/payments/validation');
    const line = {
      asset_type: 'credit_alphanum4',
      asset_code: 'USDC',
      asset_issuer: TESTNET_USDC_ISSUER,
      balance: '100',
      selling_liabilities: '0',
      is_authorized: true,
    };
    expect(canPayTestnetUsdc([line], '100')).toBe(true);
    for (const patch of [
      { balance: '99.9999999' },
      { selling_liabilities: '0.0000001' },
      { asset_issuer: 'other' },
      { is_authorized: false },
      { balance: 'bad' },
    ])
      expect(canPayTestnetUsdc([{ ...line, ...patch }], '100')).toBe(false);
    expect(canPayTestnetUsdc([], '100')).toBe(false);
  });
  it('checks issuer, authorization and exact receiving capacity', async () => {
    const { canReceiveTestnetUsdc } = await import('../src/lib/payments/recipient');
    const { TESTNET_USDC_ISSUER } = await import('../src/lib/payments/validation');
    const line = {
      asset_type: 'credit_alphanum4',
      asset_code: 'USDC',
      asset_issuer: TESTNET_USDC_ISSUER,
      balance: '0.0000000',
      limit: '100.0000000',
      buying_liabilities: '0.0000000',
      is_authorized: true,
    };
    expect(canReceiveTestnetUsdc([line], '100')).toBe(true);
    expect(canReceiveTestnetUsdc([], '100')).toBe(false);
    expect(canReceiveTestnetUsdc([{ ...line, asset_issuer: 'other' }], '100')).toBe(false);
    expect(canReceiveTestnetUsdc([{ ...line, is_authorized: false }], '100')).toBe(false);
    expect(canReceiveTestnetUsdc([{ ...line, buying_liabilities: '0.0000001' }], '100')).toBe(
      false,
    );
    expect(canReceiveTestnetUsdc([{ ...line, balance: '0.0000001' }], '100')).toBe(false);
    expect(canReceiveTestnetUsdc([{ ...line, limit: 'broken' }], '100')).toBe(false);
  });
});
