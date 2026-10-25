import { describe, expect, it } from 'vitest';
import { Keypair } from '@stellar/stellar-sdk';
import { activityEvidence } from '../src/lib/activity/validation';
const wallet = Keypair.random();
const other = Keypair.random();
describe('pseudonymous issuer evidence', () => {
  const source = {
    id: '10000000-0000-4000-8000-000000000001',
    destination_id: '20000000-0000-4000-8000-000000000001',
    subject: '30000000-0000-4000-8000-000000000001',
    kind: 1 as const,
  };
  it('keeps event identity stable across retries and wallet changes, so a changed wallet conflicts on-chain', () => {
    const first = activityEvidence(source, wallet.publicKey(), 'ab'.repeat(32));
    const moved = activityEvidence(source, other.publicKey(), 'ab'.repeat(32));
    expect(first.event_id).toEqual(moved.event_id);
    expect(first.record.user).not.toBe(moved.record.user);
    expect(first.event_id).not.toEqual(first.record.subject);
    expect(JSON.stringify(first)).not.toContain(source.id);
  });
  it('separates purchase and stamp namespaces and rejects unsupported activity', () => {
    expect(activityEvidence(source, wallet.publicKey(), 'ab'.repeat(32)).event_id).not.toEqual(
      activityEvidence({ ...source, kind: 2 }, wallet.publicKey(), 'ab'.repeat(32)).event_id,
    );
    expect(() =>
      activityEvidence({ ...source, kind: 3 } as never, wallet.publicKey(), 'ab'.repeat(32)),
    ).toThrow();
  });
});
