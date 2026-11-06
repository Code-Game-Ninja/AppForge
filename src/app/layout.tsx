import type { Metadata } from 'next';
import { Suspense } from 'react';
import '@fontsource-variable/manrope';
import './globals.css';
import './neo-glass.css';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { LibraryProvider } from '@/components/apps/LibraryProvider';
import { TooltipProvider } from '@/components/ui/tooltip';

export const metadata: Metadata = {
  title: { default: 'AppForge — Discover your next favorite open-source project', template: '%s | AppForge' },
  description: 'Discover useful apps, popular repositories, frameworks, and tools. Explore curated collections and find an open-source stack for your next build.',
  icons: { icon: '/logo.svg' },
};
const themeScript = `(function(){try{var t=localStorage.getItem('appforge-theme');document.documentElement.classList.toggle('dark',t!=='light'&&(t!=='system'||window.matchMedia('(prefers-color-scheme: dark)').matches))}catch(e){}})()`;
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en" className="dark" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head><body><TooltipProvider delayDuration={350}><LibraryProvider><a href="#main-content" className="skip-link">Skip to content</a><Suspense fallback={<div className="topbar" />}><Navbar /></Suspense><div className="workspace"><main id="main-content">{children}</main><Footer /></div></LibraryProvider></TooltipProvider></body></html>;
}
