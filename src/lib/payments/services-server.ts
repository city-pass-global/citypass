import 'server-only';
import { cache } from 'react';
import { configured, createClient, session } from '@/lib/supabase/server';
export const getServiceCatalog = cache(async () => {
  if (!configured()) return { available: false, services: [], acquisitions: [], user: null };
  const db = await createClient();
  const [user, services, acquisitions] = await Promise.all([
    session(),
    db.from('merchant_services').select('*').eq('published', true),
    db.from('merchant_service_acquisitions').select('service_id,request_id'),
  ]);
  const available = !services.error && !acquisitions.error;
  return {
    available,
    services: available ? (services.data ?? []) : [],
    acquisitions: available ? (acquisitions.data ?? []) : [],
    user,
  };
});
