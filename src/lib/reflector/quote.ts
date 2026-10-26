import { amountToStroops } from '@/lib/payments/validation';

export type EuroFeed = {
  price: bigint;
  decimals: number;
  timestamp: number;
  resolution: number;
};

const FUTURE_TOLERANCE_SECONDS = 120;

export function interpretEuroFeed(
  snapshot: {
    base: { tag: string; values: readonly string[] };
    assets: readonly { tag: string; values: readonly string[] }[];
    decimals: number;
    resolution: number;
    price?: { price: bigint; timestamp: bigint };
    expires?: bigint;
  },
  now: number,
): EuroFeed | null {
  const listed = snapshot.assets.some(
    (asset) => asset.tag === 'Other' && asset.values[0] === 'EUR',
  );
  if (
    !listed ||
    snapshot.base.tag !== 'Other' ||
    snapshot.base.values[0] !== 'USD' ||
    !Number.isInteger(snapshot.decimals) ||
    snapshot.decimals < 0 ||
    snapshot.decimals > 18 ||
    !Number.isInteger(snapshot.resolution) ||
    snapshot.resolution <= 0 ||
    !snapshot.price ||
    snapshot.price.price <= 0n
  )
    return null;
  const timestamp = Number(snapshot.price.timestamp);
  const expires = snapshot.expires === undefined ? undefined : Number(snapshot.expires);
  if (
    !Number.isSafeInteger(timestamp) ||
    timestamp > now + FUTURE_TOLERANCE_SECONDS ||
    now - timestamp > snapshot.resolution * 3 ||
    (expires !== undefined && (!Number.isSafeInteger(expires) || expires < now))
  )
    return null;
  return {
    price: snapshot.price.price,
    decimals: snapshot.decimals,
    timestamp,
    resolution: snapshot.resolution,
  };
}

export function euroAmount(usdc: string, feed: EuroFeed): string | null {
  let stroops: bigint;
  try {
    stroops = amountToStroops(usdc);
  } catch {
    return null;
  }
  const scale = 10n ** BigInt(feed.decimals);
  const numerator = stroops * scale * 100n;
  const denominator = feed.price * 10000000n;
  if (denominator <= 0n) return null;
  const cents = (numerator + denominator / 2n) / denominator;
  const whole = cents / 100n;
  const fraction = (cents % 100n).toString().padStart(2, '0');
  return `${whole}.${fraction}`;
}
