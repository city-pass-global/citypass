import { z } from 'zod';
export const bookingUrlSchema = z
  .string()
  .trim()
  .max(2048)
  .transform((value) => {
    if (!value) return null;
    try {
      return new URL(value).href;
    } catch {
      return value;
    }
  })
  .refine(
    (value) =>
      value === null ||
      /^https:\/\/([A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,63}(\/[^\s\x00-\x1f\x7f#]*)?$/.test(
        value,
      ),
  );
const localized = (min: number, max: number) =>
  z.strictObject({
    es: z.string().trim().min(min).max(max),
    en: z.string().trim().min(min).max(max),
    pt: z.string().trim().min(min).max(max),
  });
export const experienceContentSchema = z.object({
  titles: localized(2, 120),
  descriptions: localized(20, 3000),
  booking_url: bookingUrlSchema,
});
const commandId = z.object({ command_id: z.uuid() });
export const experienceSchemas = {
  create: experienceContentSchema.extend({ destination_id: z.uuid(), command_id: z.uuid() }),
  save: experienceContentSchema.extend({
    experience_id: z.uuid(),
    command_id: z.uuid(),
    expected_version: z.coerce.number().int().min(0).max(2147483646),
  }),
  publish: commandId.extend({
    experience_id: z.uuid(),
    expected_version: z.coerce.number().int().min(0).max(2147483646),
    confirmed: z.literal('on'),
  }),
  withdraw: commandId.extend({
    experience_id: z.uuid(),
    expected_version: z.coerce.number().int().min(0).max(2147483646),
    confirmed: z.literal('on'),
  }),
};
export const experienceSchema = z.object({
  id: z.uuid(),
  destination_id: z.uuid(),
  titles: localized(2, 120),
  descriptions: localized(20, 3000),
  is_demo: z.boolean().default(false),
  demo_key: z.string().nullable().default(null),
  booking_url: bookingUrlSchema.nullable(),
  status: z.enum(['draft', 'published', 'archived']),
  version: z.number().int().nonnegative(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type Experience = z.infer<typeof experienceSchema>;
export const operatorFiltersSchema = z.object({
  destination: z.uuid().optional(),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  offset: z.coerce.number().int().min(0).max(100000).default(0),
});
export const operatorQueueSchema = z.object({
  total: z.number().int().nonnegative(),
  experiences: z.array(experienceSchema),
});
