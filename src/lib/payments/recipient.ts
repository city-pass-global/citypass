import { z } from 'zod';
import { amountToStroops, TESTNET_USDC_ISSUER } from './validation';
const balanceSchema = z.object({
  asset_type: z.string(),
  asset_code: z.string().optional(),
  asset_issuer: z.string().optional(),
  balance: z.string(),
  limit: z.string().optional(),
  buying_liabilities: z.string().optional(),
  selling_liabilities: z.string().optional(),
  is_authorized: z.boolean().optional(),
});
function units(value: string): bigint {
  if (value === '0' || /^0\.0{1,7}$/.test(value)) return 0n;
  return amountToStroops(value);
}
export function canPayTestnetUsdc(balances: unknown, amount: string): boolean {
  const parsed = z.array(balanceSchema).safeParse(balances);
  if (!parsed.success) return false;
  const trustline = parsed.data.find(
    (b) =>
      b.asset_type !== 'native' &&
      b.asset_code === 'USDC' &&
      b.asset_issuer === TESTNET_USDC_ISSUER,
  );
  if (!trustline?.is_authorized) return false;
  try {
    return (
      units(trustline.balance) - units(trustline.selling_liabilities ?? '0') >=
      amountToStroops(amount)
    );
  } catch {
    return false;
  }
}
export function canReceiveTestnetUsdc(balances: unknown, amount: string): boolean {
  const parsed = z.array(balanceSchema).safeParse(balances);
  if (!parsed.success) return false;
  const trustline = parsed.data.find(
    (b) =>
      b.asset_type !== 'native' &&
      b.asset_code === 'USDC' &&
      b.asset_issuer === TESTNET_USDC_ISSUER,
  );
  if (!trustline?.is_authorized || !trustline.limit) return false;
  try {
    return (
      units(trustline.limit) -
        units(trustline.balance) -
        units(trustline.buying_liabilities ?? '0') >=
      amountToStroops(amount)
    );
  } catch {
    return false;
  }
}
