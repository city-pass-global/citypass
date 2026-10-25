'use server';
import { createHash, createHmac, randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient, APP_SESSION_COOKIE } from '@/lib/supabase/server';
import { bridgeSecret, walletConfiguration } from '@/lib/wallet/server';
import { verifiedPollarIdentity } from '@/lib/auth/pollar';
export async function exchangePollarSession(token: unknown) {
  try {
    const parsed = z.string().min(20).max(16384).safeParse(token);
    const config = walletConfiguration();
    const secret = process.env.POLLAR_SECRET_KEY;
    if (!parsed.success || !config || !secret?.startsWith(`sec_${config.network}_`))
      return { error: 'pollarUnavailable' };
    const response = await fetch('https://server.api.pollar.xyz/v1/tokens/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-pollar-api-key': secret },
      body: JSON.stringify({ token: parsed.data }),
      cache: 'no-store',
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) return { error: 'pollarSession' };
    const now = Math.floor(Date.now() / 1000);
    const identity = verifiedPollarIdentity(await response.json(), config.network, now);
    const cookieStore = await cookies();
    const previous = cookieStore.get(APP_SESSION_COOKIE)?.value;
    const raw = randomBytes(32).toString('hex');
    const payload = JSON.stringify({
      ...identity,
      issued: now,
      token_hash: createHash('sha256').update(raw).digest('hex'),
      previous_hash:
        previous && /^[a-f0-9]{64}$/.test(previous)
          ? createHash('sha256').update(previous).digest('hex')
          : null,
    });
    const mac = createHmac('sha256', Buffer.from(bridgeSecret(), 'hex'))
      .update(payload)
      .digest('hex');
    const db = await createClient();
    const { data, error } = await db.rpc('create_pollar_session', { payload, mac });
    if (
      error ||
      !data ||
      typeof data !== 'object' ||
      Array.isArray(data) ||
      typeof data.id !== 'string'
    )
      return { error: 'pollarSession' };
    cookieStore.set(APP_SESSION_COOKIE, raw, {
      httpOnly: true,
      secure: new URL(process.env.APP_ORIGIN!).protocol === 'https:',
      sameSite: 'lax',
      path: '/',
      maxAge: identity.expires - now,
    });
    revalidatePath('/[locale]', 'layout');
    return { success: true };
  } catch {
    return { error: 'pollarSession' };
  }
}
export async function closePollarSession() {
  const cookieStore = await cookies();
  try {
    const db = await createClient();
    const { error } = await db.rpc('end_app_session');
    if (error) return { error: 'pollarSession' };
  } catch {
    return { error: 'pollarSession' };
  }
  cookieStore.delete(APP_SESSION_COOKIE);
  revalidatePath('/[locale]', 'layout');
  return { success: true };
}
