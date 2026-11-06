import Link from 'next/link';
import { ArrowUpRight, BrainCircuit, Code2, Gamepad2, Globe, Landmark, MessageSquare, Monitor, Palette, ShieldCheck, Smartphone, Sparkles, Terminal, Wrench } from 'lucide-react';
import { CATEGORIES } from '@/lib/discovery';
import { CURATED_APPS } from '@/lib/data';
export const metadata = { title: 'Explore categories' };
const icons = [Code2, BrainCircuit, Sparkles, Globe, Palette, Wrench, ShieldCheck, Terminal, MessageSquare, Smartphone, Monitor, Landmark, Gamepad2];
export default function CategoriesPage() {
  return <div className="standard-page"><div className="page-heading"><div><h1>Find your corner of open source.</h1><p>Browse by what you want to do, from writing code to making something creative.</p></div></div><div className="category-overview">{CATEGORIES.map((category, index) => { const Icon = icons[index]; return <Link key={category.id} href={`/apps?category=${category.id}`} className="category-overview-card"><Icon size={29} strokeWidth={1.5} /><h2>{category.name}</h2><p>{category.description}</p><span>{CURATED_APPS.filter(app => app.category === category.id).length} curated projects<ArrowUpRight size={18} /></span></Link>; })}</div></div>;
}
