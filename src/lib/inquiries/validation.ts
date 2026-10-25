import { z } from 'zod';
const base = z.object({ command_id: z.uuid(), consent: z.literal('on') });
const transition = base.extend({
  request_id: z.uuid(),
  expected_version: z.coerce.number().int().min(0).max(2147483646),
});
export const inquirySchemas = {
  create: base.extend({
    experience_id: z.uuid(),
    preferred_date: z.iso.date(),
    party_size: z.coerce.number().int().min(1).max(20),
    message: z.string().trim().min(10).max(1000),
  }),
  reply: transition.extend({ response: z.string().trim().min(10).max(2000) }),
  cancel: transition,
  close: transition,
};
export const inquirySchema = z.object({
  is_demo: z.boolean().default(false),
  id: z.uuid(),
  experience_id: z.uuid(),
  destination_id: z.uuid(),
  titles: z.object({ es: z.string(), en: z.string(), pt: z.string() }),
  preferred_date: z.iso.date(),
  party_size: z.number().int().min(1).max(20),
  message: z.string(),
  response: z.string().nullable(),
  responded_at: z.string().nullable(),
  status: z.enum(['open', 'replied', 'closed', 'cancelled']),
  version: z.number().int().nonnegative(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type Inquiry = z.infer<typeof inquirySchema>;
export const inquiryFiltersSchema = z.object({
  destination: z.uuid().optional(),
  status: z.enum(['all', 'open', 'replied', 'closed', 'cancelled']).default('all'),
  offset: z.coerce.number().int().min(0).max(100000).default(0),
});
export const inquiryQueueSchema = z.object({
  total: z.number().int().nonnegative(),
  inquiries: z.array(inquirySchema),
});
export const inquiryDetailSchema = z.object({
  inquiry: inquirySchema,
  is_owner: z.boolean(),
  can_handle: z.boolean(),
});
