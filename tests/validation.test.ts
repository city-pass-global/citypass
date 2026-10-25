import { describe, it, expect } from 'vitest';
import { commandSchemas, guestSchema, extractToken, safeLocale } from '../src/lib/validation';
import es from '../messages/es.json';
import en from '../messages/en.json';
import pt from '../messages/pt.json';
describe('boundary validation', () => {
  it('global activation takes no caller-selected user or destination', () => {
    expect(
      commandSchemas.activate_traveler.parse({
        user_id: 'another-user',
        destination_id: 'another-city',
      }),
    ).toEqual({});
  });
  it('rejects foreign-origin QR links', () => {
    const token = 'a'.repeat(64);
    expect(
      extractToken(`https://evil.example/es/claim#token=${token}`, 'https://passport.example'),
    ).toBe('');
    expect(
      extractToken(`https://passport.example/es/claim#token=${token}`, 'https://passport.example'),
    ).toBe(token);
  });
  it('rejects invalid reservation dates and fractional guest counts', () => {
    const base = {
      organization_id: '10000000-0000-4000-8000-000000000001',
      reference: 'REF',
      email: 'guest@example.com',
      arrival: '2026-10-12',
      departure: '2026-10-11',
      guest_count: 2,
    };
    expect(commandSchemas.create_reservation.safeParse(base).success).toBe(false);
    expect(
      commandSchemas.create_reservation.safeParse({
        ...base,
        departure: '2026-10-14',
        guest_count: 1.5,
      }).success,
    ).toBe(false);
  });
  it('requires explicit operational consent and valid times', () => {
    const base = {
      token: 'a'.repeat(64),
      email: 'guest@example.com',
      full_name: 'Guest Name',
      phone: '123456',
      nationality: 'Argentina',
      residence: 'Argentina',
      arrival_time: '25:00',
      requests: '',
      consent: true,
    };
    expect(guestSchema.safeParse(base).success).toBe(false);
    expect(guestSchema.safeParse({ ...base, arrival_time: '14:00', consent: false }).success).toBe(
      false,
    );
    expect(guestSchema.safeParse({ ...base, arrival_time: '14:00' }).success).toBe(true);
  });
  it('never accepts an OAuth redirect as locale', () =>
    expect(safeLocale('//evil.example')).toBe('es'));
  it('all locales contain the same messages', () => {
    const keys = (obj: object, prefix = ''): string[] =>
      Object.entries(obj)
        .flatMap(([k, v]) => (typeof v === 'object' ? keys(v, `${prefix}${k}.`) : [prefix + k]))
        .sort();
    expect(keys(en)).toEqual(keys(es));
    expect(keys(pt)).toEqual(keys(es));
  });
});
