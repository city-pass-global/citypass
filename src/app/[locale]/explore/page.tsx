import ExploreContent from '@/components/explore-content';
export default async function Explore({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ category?: string; q?: string }>;
}) {
  return <ExploreContent params={params} searchParams={searchParams} />;
}
