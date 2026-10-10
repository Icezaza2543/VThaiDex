import DataError from '../components/DataError.js';
import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import Layout, { PageTitle } from '../components/Layout.jsx';
import { CreatorCard } from '../components/ui.jsx';
import { fetchDiscover, fmt, platformLabel } from '../lib/api.js';

const SHELVES = [
  ['debut', 'เพิ่งเดบิวต์'],
  ['under_1k', 'ยังไม่ถึง 1K'],
  ['active', 'ยังทำอยู่'],
];
const PLATFORMS = ['', 'youtube', 'twitch', 'tiktok'];

function newSeed() {
  const bytes = globalThis.crypto?.randomUUID?.();
  if (bytes) return bytes.replace(/-/g, '').slice(0, 16);
  return String(Date.now());
}

export default function Discover() {
  const [platform, setPlatform] = useState('');
  const [seed, setSeed] = useState('');
  const [shelf, setShelf] = useState('debut');
  const [retryToken, setRetryToken] = useState(0);
  const [view, setView] = useState({ status: 'loading', shelves: {}, mode: 'shelves' });
  const [more, setMore] = useState('idle');

  useEffect(() => {
    let cancel = false;
    setMore('idle');
    setView((current) => ({ ...current, status: 'loading' }));
    (async () => {
      try {
        const entries = await Promise.all(SHELVES.map(async ([id]) => [id, await fetchDiscover({ shelf: id, platform, seed })]));
        if (cancel) return;
        const shelves = Object.fromEntries(entries);
        const available = SHELVES.map(([id]) => id).filter((id) => shelves[id].available);
        if (available.length === 0) {
          shelves.all = await fetchDiscover({ shelf: 'all', platform, seed });
          if (cancel) return;
          setShelf('all');
          setView({ status: 'ready', shelves, mode: 'all' });
          return;
        }
        setShelf((current) => (available.includes(current) ? current : available[0]));
        setView({ status: 'ready', shelves, mode: 'shelves' });
      } catch {
        if (!cancel) setView((current) => ({ ...current, status: 'error' }));
      }
    })();
    return () => { cancel = true; };
  }, [platform, seed, retryToken]);

  const page = view.shelves[shelf];
  const visibleShelves = SHELVES.filter(([id]) => view.shelves[id]?.available);

  async function loadMore() {
    if (!page?.next_cursor || more === 'loading') return;
    setMore('loading');
    try {
      const next = await fetchDiscover({ shelf, platform, seed, cursor: page.next_cursor });
      setView((current) => {
        const previous = current.shelves[shelf];
        if (!previous) return current;
        return {
          ...current,
          shelves: {
            ...current.shelves,
            [shelf]: { ...next, items: [...previous.items, ...next.items], available: previous.available },
          },
        };
      });
      setMore('idle');
    } catch {
      setMore('error');
    }
  }

  return (
    <Layout>
      <PageTitle center title={<><span className="text-sky" aria-hidden="true">✦ </span>ค้นพบ VTuber อิสระ<span className="text-brand" aria-hidden="true"> ✦</span></>}>
        การสุ่มเลือกเฉพาะวีอิสระ และทุกคนมีโอกาสถูกสุ่มเท่ากัน
      </PageTitle>

      <div className="mx-auto mt-10 max-w-[1920px] px-4 sm:px-6 lg:px-8">
        <div className="card relative overflow-hidden p-5 sm:p-6">
          <span className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-brand to-transparent opacity-80" aria-hidden="true" />
          <div className="flex flex-col items-start justify-between gap-4 lg:flex-row lg:items-center">
            {view.mode === 'shelves' && visibleShelves.length > 0 ? (
              <div className="seg" role="tablist" aria-label="ชั้น">
                {visibleShelves.map(([id, label]) => (
                  <button key={id} type="button" role="tab" aria-pressed={shelf === id} aria-selected={shelf === id} onClick={() => setShelf(id)}>{label}</button>
                ))}
              </div>
            ) : <span />}
            <div className="flex w-full flex-wrap items-center gap-2 sm:gap-3 lg:w-auto">
              <div className="flex flex-wrap gap-2" role="group" aria-label="แพลตฟอร์ม">
                {PLATFORMS.map((name) => (
                  <button key={name || 'all'} type="button" className="chip" aria-pressed={platform === name} onClick={() => setPlatform(name)}>
                    {name ? platformLabel(name) : 'ทุกแพลตฟอร์ม'}
                  </button>
                ))}
              </div>
              <button type="button" onClick={() => setSeed(newSeed())} className="btn btn-primary ml-auto lg:ml-2">
                <RefreshCw size={17} aria-hidden="true" /> สุ่มใหม่
              </button>
            </div>
          </div>
        </div>
      </div>

      <section className="mx-auto mt-6 max-w-[1920px] px-4 sm:px-6 lg:px-8" aria-busy={view.status === 'loading'}>
        {view.status === 'error' ? (
          <DataError onRetry={() => setRetryToken((n) => n + 1)} />
        ) : view.status === 'loading' ? (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="card card-well h-44 animate-pulse" />)}
          </div>
        ) : page?.items?.length ? (
          <>
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3" aria-live="polite">
              {page.items.map((creator, index) => <CreatorCard key={`${creator.name}-${index}`} creator={creator} variant={index} discover />)}
            </div>
            {page.next_cursor && (
              <div className="mt-8 flex justify-center">
                <button type="button" onClick={loadMore} disabled={more === 'loading'} className="btn btn-secondary px-8">
                  <span className="size-2 rounded-full bg-brand shadow-[0_0_8px_var(--color-brand)]" aria-hidden="true" />
                  {more === 'loading' ? 'กำลังโหลด…' : 'โหลดเพิ่มอีก 24 คน'}
                </button>
              </div>
            )}
            {more === 'error' && <DataError className="mt-4" onRetry={loadMore} />}
            <p className="mt-4 text-center text-sm text-muted" aria-live="polite">แสดง {fmt(page.items.length)} คน</p>
          </>
        ) : (
          <div className="card p-6">
            <p className="font-semibold">ไม่เจอใครตรงกับตัวกรองนี้</p>
            {platform && (
              <button type="button" onClick={() => setPlatform('')} className="btn btn-secondary mt-4">ทุกแพลตฟอร์ม</button>
            )}
          </div>
        )}
      </section>
    </Layout>
  );
}
