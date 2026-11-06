import Link from 'next/link';
import { Github, Heart } from 'lucide-react';
import { GITHUB_REPO } from '@/lib/constants';

export function Footer() {
  return <footer className="site-footer"><span>Made for people who love open source.<Heart size={12} /></span><div><Link href="/guidelines">Guidelines</Link><Link href="/privacy">Privacy</Link><a href={GITHUB_REPO} target="_blank" rel="noreferrer"><Github size={14} />GitHub</a></div></footer>;
}
