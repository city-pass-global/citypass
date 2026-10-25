import { describe, expect, it } from 'vitest';
import { inquirySchemas, inquiryFiltersSchema } from '../src/lib/inquiries/validation';
import { localeHref } from '../src/lib/destination-context/validation';
const input = {
  command_id: 'b1000000-0000-4000-8000-000000000001',
  experience_id: 'a1000000-0000-4000-8000-000000000001',
  preferred_date: '2027-01-01',
  party_size: '2',
  message: '  Test information request only.  ',
  consent: 'on',
};
describe('experience inquiry validation', () => {
  it('normalizes message/count and requires explicit sharing consent', () => {
    expect(inquirySchemas.create.parse(input)).toMatchObject({
      party_size: 2,
      message: 'Test information request only.',
    });
    for (const changed of [
      { party_size: 0 },
      { party_size: 21 },
      { party_size: 1.5 },
      { message: 'short' },
      { message: 'x'.repeat(1001) },
      { consent: 'off' },
      { preferred_date: '2027-02-30' },
    ])
      expect(inquirySchemas.create.safeParse({ ...input, ...changed }).success).toBe(false);
  });
  it('requires a bounded response, version and confirmation', () => {
    const reply = {
      request_id: input.command_id,
      command_id: input.command_id,
      expected_version: 0,
      response: 'No reservation is confirmed.',
      consent: 'on',
    };
    expect(inquirySchemas.reply.safeParse(reply).success).toBe(true);
    for (const changed of [
      { expected_version: -1 },
      { response: 'short' },
      { response: 'x'.repeat(2001) },
      { consent: 'no' },
    ])
      expect(inquirySchemas.reply.safeParse({ ...reply, ...changed }).success).toBe(false);
    expect(inquiryFiltersSchema.safeParse({ status: 'confirmed' }).success).toBe(false);
    expect(inquiryFiltersSchema.safeParse({ offset: -1 }).success).toBe(false);
  });
  it('keeps the public experience reference across language navigation without credentials', () => {
    expect(
      localeHref('/es/inquiries/new', `experience=${input.experience_id}&token=private`, 'en'),
    ).toBe(`/en/inquiries/new?experience=${input.experience_id}`);
  });
});
