import { Discovery } from '@/components/apps/Discovery';
import { getApps } from '@/lib/apps';
export const metadata = { title: 'Your saved projects' };
export default async function SavedPage() { return <Discovery initialApps={await getApps()} mode="saved" />; }
