'use client';
import { useState } from 'react';
import { ArrowUpRight, Download } from 'lucide-react';
import type { GitHubAsset } from '@/lib/github';

export function assetPlatform(name: string) {
  const filename = name.toLowerCase();
  if (/\.(apk|aab)$/.test(filename)) return 'Android';
  if (/\.(exe|msi|msix)$/.test(filename) || /windows|win32|win64/.test(filename)) return 'Windows';
  if (/\.(dmg|pkg)$/.test(filename) || /macos|darwin|osx/.test(filename)) return 'macOS';
  if (/\.(appimage|deb|rpm|snap)$/.test(filename) || /linux/.test(filename)) return 'Linux';
  return 'Other / see filename';
}
export function ReleaseDownloads({ assets, releaseUrl, version }: { assets: GitHubAsset[]; releaseUrl: string; version: string }) {
  const [platform, setPlatform] = useState('');
  const packages = assets.filter(asset => /\.(apk|aab|exe|msi|msix|dmg|pkg|appimage|deb|rpm|snap|zip|tar\.gz|tar\.xz|tgz)$/i.test(asset.name));
  const platforms = Array.from(new Set(packages.map(asset => assetPlatform(asset.name))));
  const filtered = packages.filter(asset => !platform || assetPlatform(asset.name) === platform);
  return <section className="detail-panel"><h2>Downloads <span className="text-xs font-normal text-muted-foreground">{version}</span></h2>{packages.length > 0 ? <><label className="sr-only" htmlFor="download-platform">Download platform</label><select id="download-platform" className="download-platform-select" value={platform} onChange={event => setPlatform(event.target.value)}><option value="">All platforms</option>{platforms.map(item => <option key={item}>{item}</option>)}</select><div className="download-list">{filtered.map(asset => <a key={asset.id} href={asset.browser_download_url} target="_blank" rel="noreferrer"><div><span>{asset.name}</span><span className="block text-muted-foreground mt-1">{asset.size ? `${(asset.size / 1024 / 1024).toFixed(1)} MB` : 'Size unavailable'}</span></div><Download size={15} /></a>)}</div></> : <p>Installation instructions and available packages are on the project’s release page.</p>}<a className="link text-xs inline-flex items-center gap-2 mt-5" href={releaseUrl} target="_blank" rel="noreferrer">View release notes<ArrowUpRight size={13} /></a></section>;
}
