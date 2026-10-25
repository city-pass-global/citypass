import { describe, expect, it } from 'vitest';
import { reviewSchema, reviewFilterSchema } from '../src/lib/review/validation';
const input = {
  organization_id: '80000000-0000-4000-8000-000000000091',
  command_id: '90000000-0000-4000-8000-000000000091',
  expected_version: '0',
  decision: 'approved',
  reason: '  Ownership verified independently  ',
};
describe('merchant review validation', () => {
  it('normalizes reason and accepts only explicit supported decisions', () => {
    expect(reviewSchema.parse(input)).toMatchObject({
      expected_version: 0,
      reason: 'Ownership verified independently',
    });
    for (const changed of [
      { decision: 'pending' },
      { reason: 'short' },
      { reason: 'x'.repeat(1001) },
      { expected_version: -1 },
      { organization_id: 'not-an-id' },
    ])
      expect(reviewSchema.safeParse({ ...input, ...changed }).success).toBe(false);
  });
  it('bounds filters and rejects unknown statuses', () => {
    expect(reviewFilterSchema.parse({})).toEqual({ status: 'pending', offset: 0 });
    for (const changed of [
      { status: 'deleted' },
      { offset: -1 },
      { offset: 100001 },
      { offset: 1.1 },
      { destination: 'unknown' },
    ])
      expect(reviewFilterSchema.safeParse(changed).success).toBe(false);
  });
});
