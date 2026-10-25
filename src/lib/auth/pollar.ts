import { z } from 'zod';
// Only the server verification response supplies identity. SDK/client profile fields are ignored.
const identitySchema = z.object({
  userId: z.string().min(1).max(255),
  applicationId: z.string().min(1).max(255),
  expiresAt: z.union([z.number(), z.string()]),
  network: z.enum(['testnet', 'mainnet']),
  profile: z
    .object({
      email: z.email().max(254).optional(),
      mail: z.email().max(254).optional(),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      first_name: z.string().optional(),
      last_name: z.string().optional(),
    })
    .nullish(),
  wallet: z.object({ address: z.string().optional(), publicKey: z.string().optional() }).nullish(),
});
export function verifiedPollarIdentity(
  value: unknown,
  network: 'testnet' | 'mainnet',
  now = Math.floor(Date.now() / 1000),
) {
  const envelope = z
    .object({
      success: z.literal(true),
      code: z.literal('SERVER_TOKEN_VERIFIED'),
      content: identitySchema,
    })
    .parse(value);
  const identity = envelope.content;
  if (identity.network !== network) throw new Error('wrong_network');
  const raw = identity.expiresAt;
  const numeric =
    typeof raw === 'number' ? raw : /^\d+$/.test(raw) ? Number(raw) : Date.parse(raw) / 1000;
  const expires = Math.floor(numeric > 1e12 ? numeric / 1000 : numeric);
  if (!Number.isSafeInteger(expires) || expires <= now) throw new Error('expired');
  const candidate = identity.wallet?.address ?? identity.wallet?.publicKey;
  const wallet = candidate && /^G[A-Z2-7]{55}$/.test(candidate) ? candidate : null;
  return {
    subject: identity.userId,
    application: identity.applicationId,
    expires: Math.min(expires, now + 3600),
    network,
    email: identity.profile?.email ?? identity.profile?.mail ?? null,
    name:
      [
        identity.profile?.firstName ?? identity.profile?.first_name,
        identity.profile?.lastName ?? identity.profile?.last_name,
      ]
        .filter(Boolean)
        .join(' ')
        .slice(0, 120) || null,
    wallet,
  };
}
