'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Code2, Terminal, Zap, Aperture, Brain, Hexagon, Layers, Boxes, NotebookPen, Video, Shield, Monitor, Paintbrush, Radio, ImageIcon, Send } from 'lucide-react';
import type { App } from '@/types';
import { appKey } from '@/lib/discovery';

const marks = {
  'microsoft/vscode': { icon: Code2, color: '#078bda', background: '#eaf6ff' },
  'ollama/ollama': { icon: Brain, color: '#252534', background: '#f1f1f5' },
  'supabase/supabase': { icon: Zap, color: '#22a97c', background: '#eafaf3' },
  'obsproject/obs-studio': { icon: Aperture, color: '#28282e', background: '#efeff3' },
  'vercel/next.js': { icon: TriangleMark, color: '#232329', background: '#f0f0f3' },
  'zed-industries/zed': { icon: Layers, color: '#35353d', background: '#f2f2f5' },
  'open-webui/open-webui': { icon: Boxes, color: '#4c607d', background: '#eef3fb' },
  'laurent22/joplin': { icon: NotebookPen, color: '#2373c8', background: '#edf4ff' },
  'hoppscotch/hoppscotch': { icon: Zap, color: '#16a678', background: '#ecfcf4' },
  'excalidraw/excalidraw': { icon: Paintbrush, color: '#7560ce', background: '#f2efff' },
  'bitwarden/clients': { icon: Shield, color: '#1766d1', background: '#eaf2ff' },
  'microsoft/powertoys': { icon: Monitor, color: '#9665b8', background: '#f7effd' },
  'immich-app/immich': { icon: ImageIcon, color: '#d7668f', background: '#fff0f5' },
  'localsend/localsend': { icon: Send, color: '#f29b37', background: '#fff5e6' },
  'godotengine/godot': { icon: Hexagon, color: '#408fbb', background: '#eaf5fc' },
  'jellyfin/jellyfin': { icon: Video, color: '#9462c8', background: '#f4edff' },
  'audacity/audacity': { icon: Radio, color: '#2978c7', background: '#edf5ff' },
  'junegunn/fzf': { icon: Terminal, color: '#7862c5', background: '#f3efff' },
};
function TriangleMark({ size = 24 }: { size?: number }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="m12 3 10 18H2L12 3Z" /></svg>; }
export function AppIcon({ app, size = 48 }: { app: App; size?: number }) {
  const [failed, setFailed] = useState(false);
  const mark = marks[appKey(app) as keyof typeof marks];
  return <div className="app-icon" style={{ width: size, height: size, color: mark?.color, background: mark?.background }}>
    {mark ? <mark.icon size={size * .54} /> : app.logo && !failed ? <Image src={app.logo} alt="" width={size} height={size} unoptimized className="h-full w-full object-cover" onError={() => setFailed(true)} /> : <span>{app.name.slice(0, 2)}</span>}
  </div>;
}
