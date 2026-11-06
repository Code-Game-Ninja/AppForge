'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Github, Loader2, Sparkles } from 'lucide-react';
import { parseRepository } from '@/lib/ai/security';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function SubmitPage() {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const submit = (event: React.FormEvent) => {
    event.preventDefault(); open(true);
  };
  const open = (assistant: boolean) => {
    setError('');
    try {
      const { owner, repo, fullName } = parseRepository(url);
      setBusy(true); router.push(assistant ? `/assistant?repo=${encodeURIComponent(fullName)}&auto=1` : `/apps/${owner}/${repo}`);
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Check the repository URL and try again.'); }
  };
  return <div className="standard-page"><div className="page-heading"><div><h1>Bring your own discovery.</h1><p>Explore a public GitHub repository or let the assistant explain how it works.</p></div></div><form className="repository-form" onSubmit={submit}><Github size={30} className="text-primary mb-6" /><label htmlFor="repository-url">GitHub repository</label><Input id="repository-url" className="input" placeholder="https://github.com/owner/repository" value={url} onChange={event => { setUrl(event.target.value); setError(''); }} maxLength={300} required autoComplete="off" aria-describedby={error ? 'repository-error' : 'repository-help'} aria-invalid={!!error} /><p id="repository-help">Paste a repository URL or use the owner/repository format. AI analysis explains its purpose, capabilities, and setup using selected public source files.</p>{error && <p id="repository-error" className="!text-red-600" role="alert">{error}</p>}<div className="repository-form-actions"><Button variant="default" className="btn-primary" disabled={busy}>{busy ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}{busy ? 'Opening repository...' : 'Explain with AI'}</Button><Button variant="neo" type="button" className="btn-outline" onClick={() => open(false)} disabled={busy}>Explore repository<ArrowRight size={15} /></Button></div></form><p className="text-xs text-muted-foreground max-w-xl leading-6">Opening a project here does not add it to the curated catalog. Save it to your library to keep it handy.</p></div>;
}
