import { z } from 'zod';
import { amountSchema } from './validation';
export const serviceSchemas = {
  publish: z.object({
    service_id: z.uuid(),
    organization_id: z.uuid(),
    venue_id: z.uuid(),
    name: z.string().trim().min(2).max(180),
    stamp_name: z.string().trim().min(2).max(120),
    amount: amountSchema.refine((value) => Number(value) >= 25 && Number(value) <= 150),
  }),
  retire: z.object({ service_id: z.uuid() }),
  buy: z.object({ service_id: z.uuid() }),
};
