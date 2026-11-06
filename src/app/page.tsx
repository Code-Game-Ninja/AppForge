import { Discovery } from '@/components/apps/Discovery';
import { getApps } from '@/lib/apps';
export default async function Home() { return <Discovery initialApps={await getApps()} />; }
