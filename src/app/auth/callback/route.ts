import { NextResponse, type NextRequest } from 'next/server';
import { safeLocale } from '@/lib/validation';
// Legacy Supabase OAuth links no longer create application sessions.
export function GET(request: NextRequest) {
  const locale = safeLocale(request.nextUrl.searchParams.get('locale') ?? 'es');
  return NextResponse.redirect(
    new URL(`/${locale}/profile`, process.env.APP_ORIGIN ?? 'http://127.0.0.1:3000'),
  );
}
