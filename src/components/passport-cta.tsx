import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { session } from '@/lib/supabase/server';
import { getPassAccount } from '@/lib/passes/server';
import type { ReactNode } from 'react';

export async function PassportCta({
  locale,
  className,
  children,
}: {
  locale: string;
  className?: string;
  children?: ReactNode;
}) {
  const [t, user] = await Promise.all([getTranslations(), session()]);
  const account = user ? await getPassAccount() : null;
  // A failed account lookup must not advertise creation to an existing user.
  const label = !user
    ? 'landing.getPassport'
    : account && !account.active
      ? 'destinationPass.activatePassport'
      : 'travelDesign.open';
  return (
    <Link className={className} href={`/${locale}/${user ? 'passport' : 'login'}`}>
      {t(label)}
      {children}
    </Link>
  );
}
