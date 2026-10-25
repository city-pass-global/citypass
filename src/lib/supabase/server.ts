import 'server-only';
import { cache } from 'react';
import type { Database } from './database.types';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
export const APP_SESSION_COOKIE='citypassport_session';
export const configured=()=>Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL&&process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
export async function createClient(){
 if(!configured()) throw new Error('not_configured');
 const value=(await cookies()).get(APP_SESSION_COOKIE)?.value;
 const token=value && /^[a-f0-9]{64}$/.test(value) ? value : null;
 return createSupabaseClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,{
  auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},
  global:{headers:token?{'x-citypassport-session':token}:{}}
 });
}
export const session=cache(async()=>{
 if(!configured()||!(await cookies()).get(APP_SESSION_COOKIE))return null;
 const db=await createClient();
 const {data,error}=await db.from('user_profiles').select('id,email,display_name,wallet_address,network').maybeSingle();
 if(error)throw new Error('session_unavailable');
 return data;
});
