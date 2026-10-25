import DestinationContent from '@/components/destination-content';
import { CountryContent } from '@/components/country-content';
import Explore from '@/components/explore-content';
export default async function Destination({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ category?: string; q?: string }>;
}) {
  const { locale, slug } = await params;
  if (/^[a-z]{2}$/.test(slug)) return <CountryContent locale={locale} code={slug} />;
  if (slug === 'puerto-iguazu')
    return (
      <Explore
        params={Promise.resolve({ locale })}
        searchParams={searchParams}
        destinationSlug={slug}
      />
    );
  return <DestinationContent locale={locale} slug={slug} filters={await searchParams} />;
}
