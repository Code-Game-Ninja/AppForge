'use client';
import { RefreshCw } from 'lucide-react';
export default function ErrorPage({ reset }: { reset: () => void }) { return <div className="standard-page"><div className="empty-state"><RefreshCw size={30} /><h2>Something interrupted this page.</h2><p>Try loading it again to get back to exploring.</p><button className="btn-primary px-5 py-3" onClick={reset}>Try again</button></div></div>; }
