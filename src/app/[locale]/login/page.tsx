import { redirect } from 'next/navigation';
import { session } from '@/lib/supabase/server';
import { AuthGate } from '@/components/auth-gate';

export default async function Login({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (await session()) redirect(`/${locale}/passport`);
  return (
    <section className="section app-page passport-login">
      <AuthGate locale={locale} variant="passport" />
    </section>
  );
}
