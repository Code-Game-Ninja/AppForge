import { CollectionCards } from '@/components/apps/Discovery';
export const metadata = { title: 'Curated collections' };
export default function CollectionsPage() { return <div className="standard-page standalone-collections"><div className="page-heading"><div><h1>A good collection goes a long way.</h1><p>Thoughtful bundles of apps and tools for whatever you’re into.</p></div></div><CollectionCards /></div>; }
