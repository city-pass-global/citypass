import { describe, it, expect } from 'vitest';
import { serviceSchemas } from '../src/lib/payments/services';
import { activityEvidence, activitySchema } from '../src/lib/activity/validation';
import { Keypair } from '@stellar/stellar-sdk';
describe('merchant service boundaries', () => {
  const id = '10000000-0000-4000-8000-000000000001';
  const service = {
    service_id: id,
    organization_id: id,
    venue_id: id,
    name: 'Example test service',
    stamp_name: 'Purchase stamp',
    amount: '25',
  };
  it('accepts only the requested 25 to 150 range', () => {
    for (const amount of ['25', '75', '150'])
      expect(serviceSchemas.publish.safeParse({ ...service, amount }).success).toBe(true);
    for (const amount of ['24.9999999', '150.0000001', '0', '1e2', '-25'])
      expect(serviceSchemas.publish.safeParse({ ...service, amount }).success).toBe(false);
  });
  it('a buyer submits only the service identity, never price or award authority', () => {
    expect(
      serviceSchemas.buy.parse({
        service_id: id,
        amount: '1',
        reputation_points: 999,
        payout_address: 'attacker',
      }),
    ).toEqual({ service_id: id });
  });
  it('separates service, QR and self-reported activity evidence', () => {
    const wallet = Keypair.random().publicKey();
    const hashes = [2, 4, 5].map((kind) =>
      activityEvidence(
        { id, destination_id: id, subject: id, kind } as never,
        wallet,
        'ab'.repeat(32),
      ).event_id.toString('hex'),
    );
    expect(new Set(hashes).size).toBe(3);
    expect(
      activitySchema.parse({
        reputation: '0',
        purchases: 0,
        stamps: 1,
        redemptions: 0,
        exploration_stamps: 1,
      }).exploration_stamps,
    ).toBe(1);
  });
});
