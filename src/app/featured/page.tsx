import { Discovery } from '@/components/apps/Discovery';
import { getApps } from '@/lib/apps';
export const metadata = { title: 'Featured projects' };
export default async function FeaturedPage() { return <Discovery initialApps={await getApps()} mode="featured" />; }
