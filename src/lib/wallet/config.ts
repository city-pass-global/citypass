import { z } from 'zod';
export const pollarPublicKeySchema = z.string().regex(/^pub_(testnet|mainnet)_[A-Za-z0-9_-]+$/);
export function pollarConfig(value: unknown) {
  const result = pollarPublicKeySchema.safeParse(value);
  if (!result.success) return null;
  return {
    apiKey: result.data,
    network: result.data.startsWith('pub_testnet_') ? ('testnet' as const) : ('mainnet' as const),
  };
}
