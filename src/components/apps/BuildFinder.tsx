'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowUpRight, Bookmark, BrainCircuit, Check, Code2, Copy, Gamepad2, Server, Smartphone, Sparkles } from 'lucide-react';
import type { App } from '@/types';
import { appKey, BUILD_STACKS } from '@/lib/discovery';
import { useLibrary } from './LibraryProvider';
import { AppIcon } from './AppIcon';
import { SaveButton } from './AppCard';
import { AIWorkspace } from '@/components/ai/AIWorkspace';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const icons = { web: Code2, ai: BrainCircuit, mobile: Smartphone, hosting: Server, game: Gamepad2 };
export function BuildFinder({ apps }: { apps: App[] }) {
  const [selected, setSelected] = useState('web');
  const [message, setMessage] = useState('');
  const { isSaved, toggle, ready } = useLibrary();
  const stack = BUILD_STACKS.find(item => item.id === selected)!;
  const stackApps = stack.steps.map(step => apps.find(app => appKey(app) === step.repo.toLowerCase())!).filter(Boolean);
  const allSaved = stackApps.every(isSaved);
  const copy = async () => {
    const content = `# ${stack.name}\n\n${stack.description}\n\n${stack.steps.map(step => `- **${step.role}**: https://github.com/${step.repo}\n  ${step.reason}`).join('\n\n')}`;
    try { await navigator.clipboard.writeText(content); setMessage('Stack copied. Paste it into your notes or project plan.'); }
    catch { setMessage('Clipboard access is unavailable. You can open the repositories or save this stack to your library.'); }
  };
  return <div className="standard-page"><div className="page-heading"><div><h1>Good ideas deserve a good starting point.</h1><p>Pick what you want to build. Find a useful set of open-source tools to get going.</p></div></div><AIWorkspace compact /><div className="build-page-intro"><div><h2>What will you build next?</h2><p>A few well-chosen tools make the first step easier. These starter stacks explain what each project brings to your build.</p></div><Sparkles size={53} strokeWidth={1.5} /></div><Tabs value={selected} onValueChange={value => { setSelected(value); setMessage(""); }}><TabsList className="build-choices" aria-label="Choose a project type">{BUILD_STACKS.map(item => { const Icon = icons[item.id as keyof typeof icons]; return <TabsTrigger key={item.id} value={item.id}><Icon size={17} />{item.name}</TabsTrigger>; })}</TabsList><TabsContent value={selected} className="build-stack-panel"><div className="section-heading"><div><h2>Your starting stack: {stack.name.toLowerCase()}</h2><p>{stack.description}</p></div><Button variant="neo" className="btn-outline px-4 py-2" onClick={copy}><Copy size={14} />Copy stack</Button></div><div className="build-stack-grid">{stack.steps.map((step, index) => { const app = stackApps.find(item => appKey(item) === step.repo.toLowerCase()); return app ? <article className="build-step" key={step.repo}><div className="build-step-role"><span>{index + 1}</span>{step.role}</div><div className="build-step-main"><AppIcon app={app} size={51} /><div><h3>{app.name}</h3><p>{step.repo}</p></div></div><p>{step.reason}</p><div className="build-step-actions"><Link href={`/apps/${app.maintainer.username}/${app.slug}`}>Explore project<ArrowUpRight size={15} /></Link><SaveButton app={app} /></div></article> : null; })}</div><div className="stack-toolbar"><p>These are starting points you can adapt. Review each project’s documentation, license, and requirements before connecting the tools.</p><Button variant="default" className="btn-primary px-5 py-3" disabled={!ready || allSaved} onClick={() => { stackApps.forEach(app => { if (!isSaved(app)) toggle(app); }); setMessage('Stack saved to your library.'); }}>{allSaved ? <Check size={16} /> : <Bookmark size={16} />}{allSaved ? 'Stack saved' : 'Save this stack'}</Button></div>{message && <p className="catalog-notice mt-5" role="status">{message}</p>}</TabsContent></Tabs></div>;
}
