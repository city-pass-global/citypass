import { describe, expect, it } from 'vitest';
import { euroAmount, interpretEuroFeed } from '../src/lib/reflector/quote';

const now = 1_793_011_300;
const price = 111930000000000n;
const fresh = {
  base: { tag: 'Other', values: ['USD'] },
  assets: [{ tag: 'Other', values: ['EUR'] }],
  decimals: 14,
  resolution: 300,
  price: { price, timestamp: BigInt(now - 100) },
};

describe('euro reference quote', () => {
  it('converts a USDC amount with the oracle scale and rounds half up', () => {
    const feed = interpretEuroFeed(fresh, now);
    expect(feed).not.toBeNull();
    expect(euroAmount('100', feed!)).toBe('89.34');
    expect(euroAmount('1.5', feed!)).toBe('1.34');
  });
  it('rejects a feed that is not a fresh dollar price of the euro', () => {
    expect(interpretEuroFeed({ ...fresh, base: { tag: 'Other', values: ['EUR'] } }, now)).toBeNull();
    expect(
      interpretEuroFeed({ ...fresh, assets: [{ tag: 'Other', values: ['GBP'] }] }, now),
    ).toBeNull();
    expect(
      interpretEuroFeed({ ...fresh, price: { price: 0n, timestamp: fresh.price.timestamp } }, now),
    ).toBeNull();
    expect(
      interpretEuroFeed(
        { ...fresh, price: { price, timestamp: BigInt(now - fresh.resolution * 3 - 1) } },
        now,
      ),
    ).toBeNull();
    expect(
      interpretEuroFeed({ ...fresh, price: { price, timestamp: BigInt(now + 121) } }, now),
    ).toBeNull();
    expect(interpretEuroFeed({ ...fresh, expires: BigInt(now - 1) }, now)).toBeNull();
    expect(euroAmount('0', fresh && interpretEuroFeed(fresh, now)!)).toBeNull();
  });
});
