import 'server-only';
import { z } from 'zod';
import { configured, createClient } from '@/lib/supabase/server';
import { experienceSchema } from './validation';
export async function getPublishedExperiences(destination: string) {
  if (!configured()) return [];
  const db = await createClient();
  const { data, error } = await db
    .from('experiences')
    .select('*')
    .eq('destination_id', destination)
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw new Error('experiences_unavailable');
  return z.array(experienceSchema).parse(data);
}
