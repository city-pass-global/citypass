import { z } from 'zod';
const uuid = z.uuid();
const text = (max = 120) => z.string().trim().min(2).max(max);
export const tokenSchema = z.string().regex(/^[a-f0-9]{64}$/);
export const guestSchema = z.object({
  token: tokenSchema,
  email: z.email().max(254),
  full_name: text(),
  phone: z.string().trim().min(5).max(40),
  nationality: text(80),
  residence: text(80),
  arrival_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  requests: z.string().max(1000),
  consent: z.literal(true),
});
export type GuestInput = z.infer<typeof guestSchema>;
const date = z.iso.date();
export const commandSchemas = {
  activate_traveler: z.object({}),
  activate_passport: z.object({ destination_id: uuid }),
  create_hotel: z.object({ destination_id: uuid, name: text() }),
  create_reservation: z
    .object({
      organization_id: uuid,
      reference: text(60),
      email: z.email().max(254),
      arrival: date,
      departure: date,
      guest_count: z.coerce.number().int().min(1).max(20),
    })
    .refine((v) => v.departure >= v.arrival),
  issue_invitation: z.object({ reservation_id: uuid }),
  review_reservation: z.object({
    reservation_id: uuid,
    status: z.enum(['reviewed', 'ready_for_arrival', 'completed', 'cancelled']),
  }),
  claim_stamp: z.object({ token: tokenSchema }),
  issue_qr: z.object({ stamp_id: uuid }),
  revoke_qr: z.object({ stamp_id: uuid }),
};
export type Command = keyof typeof commandSchemas;
export function safeLocale(value: string) {
  return ['es', 'en', 'pt'].includes(value) ? value : 'es';
}
export function extractToken(value: string, origin: string): string {
  if (tokenSchema.safeParse(value).success) return value;
  try {
    const url = new URL(value);
    if (url.origin !== origin) return '';
    return tokenSchema.parse(new URLSearchParams(url.hash.slice(1)).get('token'));
  } catch {
    return '';
  }
}
