import { getApps } from '@/lib/apps';
import { BuildFinder } from '@/components/apps/BuildFinder';
export const metadata = { title: 'Find a stack for your next build' };
export default async function BuildPage() { return <BuildFinder apps={await getApps()} />; }
