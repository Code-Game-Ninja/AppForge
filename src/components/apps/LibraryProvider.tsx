'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { App } from '@/types';
import { appKey } from '@/lib/discovery';

interface LibraryState { saved: App[]; ready: boolean; storageError: string; toggle: (app: App) => void; isSaved: (app: App) => boolean }
const LibraryContext = createContext<LibraryState>({ saved: [], ready: false, storageError: '', toggle: () => {}, isSaved: () => false });
const KEY = 'appforge-library-v2';
const isApp = (value: unknown): value is App => {
  if (!value || typeof value !== 'object') return false;
  const app = value as App;
  return typeof app.slug === 'string' && typeof app.name === 'string' && typeof app.maintainer?.username === 'string' && Array.isArray(app.topics) && Array.isArray(app.platforms) && typeof app.stats?.stars === 'number';
};
export function LibraryProvider({ children }: { children: React.ReactNode }) {
  const [saved, setSaved] = useState<App[]>([]);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState('');
  useEffect(() => {
    const read = () => {
      try { const data: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]'); setSaved(Array.isArray(data) ? data.filter(isApp) : []); }
      catch { setSaved([]); }
      setReady(true);
    };
    read();
    const handleStorage = (event: StorageEvent) => { if (event.key === KEY) read(); };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);
  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(KEY, JSON.stringify(saved)); setStorageError(''); }
    catch { setStorageError('Your browser could not save your library. These changes will last for this visit.'); }
  }, [ready, saved]);
  const toggle = useCallback((app: App) => {
    setSaved(current => {
      const next = current.some(item => appKey(item) === appKey(app)) ? current.filter(item => appKey(item) !== appKey(app)) : [...current, app];
      return next;
    });
  }, []);
  return <LibraryContext.Provider value={{ saved, ready, storageError, toggle, isSaved: app => saved.some(item => appKey(item) === appKey(app)) }}>{children}</LibraryContext.Provider>;
}
export const useLibrary = () => useContext(LibraryContext);
