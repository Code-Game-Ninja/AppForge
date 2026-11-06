import { notFound } from 'next/navigation';
import { Discovery } from '@/components/apps/Discovery';
import { getApps } from '@/lib/apps';
import { COLLECTIONS } from '@/lib/discovery';

export function generateStaticParams() { return COLLECTIONS.map(collection => ({ id: collection.id })); }
export function generateMetadata({ params }: { params: { id: string } }) { const collection = COLLECTIONS.find(item => item.id === params.id); return { title: collection?.name ?? 'Collection not found', description: collection?.description }; }
export default async function CollectionPage({ params }: { params: { id: string } }) {
  if (!COLLECTIONS.some(item => item.id === params.id)) notFound();
  return <Discovery initialApps={await getApps()} mode="collection" collectionId={params.id} />;
}
