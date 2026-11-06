import Link from 'next/link';
import { Compass } from 'lucide-react';
export default function NotFound() { return <div className="standard-page"><div className="empty-state"><Compass size={35} /><h1 className="text-2xl font-semibold">Let’s find your way back.</h1><p>This page or project is not available. There are plenty of useful projects to explore in the catalog.</p><Link href="/apps" className="btn-primary px-5 py-3">Explore projects</Link></div></div>; }
