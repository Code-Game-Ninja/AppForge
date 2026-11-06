import { Discovery } from '@/components/apps/Discovery';
import { getApps } from '@/lib/apps';
import { CATEGORIES } from '@/lib/discovery';
export const metadata = { title: 'Explore apps and repositories' };
export default async function AppsPage({ searchParams }: { searchParams: { q?: string; category?: string } }) {
  const category = CATEGORIES.some(item => item.id === searchParams.category) ? searchParams.category! : '';
  return <Discovery initialApps={await getApps()} mode="all" initialQuery={(searchParams.q ?? '').trim().slice(0, 120)} initialCategory={category} />;
}
