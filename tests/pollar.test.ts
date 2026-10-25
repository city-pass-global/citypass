import { expect, it } from 'vitest';
import { verifiedPollarIdentity } from '../src/lib/auth/pollar';
import { pollarConfig } from '../src/lib/wallet/config';
const response = {
  success: true,
  code: 'SERVER_TOKEN_VERIFIED',
  content: {
    userId: 'pollar-user',
    applicationId: 'app',
    expiresAt: 2000000600,
    network: 'testnet',
    profile: { mail: 'traveler@example.invalid', first_name: 'Traveler' },
  },
};
it('uses server-verified identity and bounds app-session lifetime', () => {
  const identity = verifiedPollarIdentity(response, 'testnet', 2000000000);
  expect(identity.subject).toBe('pollar-user');
  expect(identity.expires).toBe(2000000600);
  expect(
    verifiedPollarIdentity(
      { ...response, content: { ...response.content, expiresAt: 2000099999 } },
      'testnet',
      2000000000,
    ).expires,
  ).toBe(2000003600);
  expect(() =>
    verifiedPollarIdentity({ ...response, success: false }, 'testnet', 2000000000),
  ).toThrow();
  expect(() => verifiedPollarIdentity(response, 'mainnet', 2000000000)).toThrow();
  expect(() => verifiedPollarIdentity(response, 'testnet', 2000000601)).toThrow();
});
it('never passes a Pollar secret key into browser configuration', () => {
  expect(pollarConfig('sec_testnet_not-a-public-key')).toBeNull();
  expect(pollarConfig('pub_testnet_test')?.network).toBe('testnet');
  expect(pollarConfig('pub_mainnet_test')?.network).toBe('mainnet');
});
