import { Discovery } from '@/components/apps/Discovery';
import { getApps } from '@/lib/apps';
export const metadata = { title: 'Popular projects' };
export default async function TrendingPage() { return <Discovery initialApps={await getApps()} mode="popular" />; }
