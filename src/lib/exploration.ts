import { z } from 'zod';
import { getDestinationGuide } from './destination-guides';

export const explorationSchema = z
  .object({
    guide_slug: z.string().min(3).max(80),
    item_id: z.string().min(1).max(80),
  })
  .refine(
    ({ guide_slug, item_id }) =>
      getDestinationGuide(guide_slug)?.items.some((item) => item.id === item_id) === true,
  );
