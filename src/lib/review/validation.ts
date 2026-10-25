import { z } from 'zod';
export const reviewSchema = z.object({
  organization_id: z.uuid(),
  command_id: z.uuid(),
  expected_version: z.coerce.number().int().min(0).max(2147483646),
  decision: z.enum(['approved', 'suspended']),
  reason: z.string().trim().min(10).max(1000),
});
export const reviewFilterSchema = z.object({
  destination: z.uuid().optional(),
  status: z.enum(['pending', 'approved', 'suspended']).default('pending'),
  offset: z.coerce.number().int().min(0).max(100000).default(0),
});
export const reviewerContextSchema = z.object({
  destinations: z.array(z.object({ id: z.uuid(), names: z.record(z.string(), z.string()) })),
});
export const reviewQueueSchema = z.object({
  total: z.number().int().nonnegative(),
  merchants: z.array(
    z.object({
      id: z.uuid(),
      name: z.string(),
      status: z.enum(['pending', 'approved', 'suspended']),
      approval_version: z.number().int().nonnegative(),
      created_at: z.string(),
      own_business: z.boolean(),
      last_review: z
        .object({
          reason: z.string(),
          status: z.enum(['approved', 'suspended']),
          created_at: z.string(),
        })
        .nullable(),
    }),
  ),
});
