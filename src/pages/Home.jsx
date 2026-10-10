import DataError from '../components/DataError.js';
import { useApiData } from '../lib/useApiData.js';
import { Component, lazy, Suspense, useCallback, useState } from 'react';
import { Search, Shuffle, X, BarChart3, ArrowRight, Sparkles, ListFilter, PenLine, ChevronDown, Scale, Dices, EyeOff, RefreshCw } from 'lucide-react';
import Layout from '../components/Layout.jsx';
import { SectionHeading } from '../components/brand.jsx';
import { CreatorCard } from '../components/ui.jsx';
import { fetchOverview, fetchSpotlight, platformLabel } from '../lib/api.js';

const Universe = lazy(() => import('../components/Universe.jsx'));
const SPOTLIGHT_PLATFORMS = ['', 'youtube', 'twitch', 'tiktok'];
// One line of personality per visit, in our own data-registry voice.

class WebGLBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return <p className="grid h-full place-items-center px-6 text-center text-sm text-muted">อุปกรณ์นี้แสดงภาพ 3 มิติไม่ได้ แต่ยังกด “สุ่มเจอวีอิสระ” ได้ตามปกติ</p>;
    return this.props.children;
  }
}

function usePicker() {
  const [picked, setPicked] = useState(null);
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState(false);
  const pick = useCallback(async () => {
    setPicking(true);
    setError(false);
    try { const [c] = await fetchSpotlight({ n: 1 }); if (c) setPicked(c); } catch { setError(true); }
    setPicking(false);
  }, []);
  return { picked, picking, error, pick, clear: () => setPicked(null) };
}

const TOGGLE = 'flex min-h-9 items-center gap-2 rounded-full px-3 text-xs font-semibold text-white/55 transition hover:text-white aria-pressed:bg-white/10 aria-pressed:text-white';

/** Full-screen hero: the universe fills the screen and stays playable; copy sits on the left of the stage. */
function Hero() {
  const { data: stats, error: statsError, retry: retryStats } = useApiData(fetchOverview);
  const [showIndies, setShowIndies] = useState(true);
  const [showAgencies, setShowAgencies] = useState(true);
  const [hover, setHover] = useState(null);
  const [sunClicks, setSunClicks] = useState(0);
  const { picked, picking, error: pickerError, pick, clear } = usePicker();

  return (
    <section className="relative isolate h-[calc(100svh-4rem)] min-h-[640px] overflow-hidden border-b border-line/40 bg-[#0c0922] bg-clip-padding">
      <div className="absolute inset-0">
        {stats && (
          <WebGLBoundary>
            <Suspense fallback={null}>
              <Universe
                stats={stats}
                showIndies={showIndies}
                showAgencies={showAgencies}
                onPickIndie={pick}
                onHoverAgency={setHover}
                onSelectAgency={(a) => { location.href = `/directory?q=${encodeURIComponent(a.name)}`; }}
                onSun={() => setSunClicks((n) => n + 1)}
              />
            </Suspense>
          </WebGLBoundary>
        )}
      </div>
      {/* Stage lighting: a soft pink/sky haze behind the galaxy and a dark wash behind the copy. */}
      <div className="stage-breathe pointer-events-none absolute -right-24 top-1/2 size-[640px] -translate-y-1/2 rounded-full bg-gradient-to-tr from-[#ff5fa2]/15 via-[#2e2470]/30 to-[#43e0ff]/15 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-0 bg-[#0c0922]/55 sm:bg-transparent sm:bg-gradient-to-r sm:from-[#0c0922]/90 sm:via-[#0c0922]/30 sm:to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[var(--bg-top)] to-transparent" />

      <div className="pointer-events-none relative mx-auto flex h-full max-w-[1920px] flex-col justify-center px-4 sm:px-6 lg:justify-start lg:pl-[20%] lg:pr-8 lg:pt-[18vh]">
        <div data-hero-copy className="pointer-events-auto flex max-w-xl flex-col items-start gap-6 text-[#fbf9ff]">
          <h1 data-hero-item className="font-sans text-[2.25rem] font-bold leading-tight tracking-tight sm:text-5xl">
            ค้นพบ <span className="neon-text font-display font-normal text-[#ff5fa2] drop-shadow-[0_0_24px_rgba(255,95,162,0.6)]">VTuber ไทย</span><br />ที่คุณยังไม่รู้จัก
          </h1>
          <p data-hero-item className="max-w-[44ch] text-base leading-relaxed text-[#c9c0f2] sm:text-lg">
            ดาวทุกดวงในภาพนี้คือวีไทยหนึ่งคน คลิกดาวสักดวงแล้วไปทักทายเขา โดยเฉพาะวีตัวเล็กที่ยังไม่มีใครพาไปเจอ
          </p>
          <div data-hero-item className="flex flex-wrap gap-3 pt-1">
            <button type="button" onClick={pick} disabled={picking} className="btn btn-shine bg-[#ff5fa2] px-7 text-[#1a0b2e] shadow-[0_0_22px_rgba(255,95,162,0.5)] hover:bg-[#ff78b2]">
              <Shuffle size={18} aria-hidden="true" /> {picking ? 'กำลังสุ่ม…' : 'สุ่มเจอวีอิสระ'}
            </button>
            <a href="/directory" className="btn border border-[#3b3088] bg-[#1b1540]/85 px-7 text-[#c9c0f2] backdrop-blur hover:border-[#ff5fa2] hover:text-white">
              <Search size={18} aria-hidden="true" /> ค้นหาชื่อ
            </a>
          </div>
        </div>
      </div>

      {(statsError || pickerError) && (
        <DataError className="absolute bottom-28 right-4 z-10 sm:right-6 lg:right-8" onRetry={() => { if (statsError) retryStats(); if (pickerError) pick(); }} />
      )}

      {/* Universe controls and feedback */}
      <div className="absolute right-4 top-4 flex items-center gap-1 rounded-full border border-[#3b3088] bg-[#1b1540]/85 p-1 shadow-lg backdrop-blur-md sm:right-6 lg:right-8" role="group" aria-label="เลือกสิ่งที่แสดงในจักรวาล">
        <button type="button" className={TOGGLE} aria-pressed={showIndies} onClick={() => setShowIndies((v) => !v)}>
          <span className={`size-2.5 rounded-full bg-[#43e0ff] ${showIndies ? 'shadow-[0_0_8px_rgba(67,224,255,0.9)]' : 'opacity-40'}`} aria-hidden="true" />วีอิสระ
        </button>
        <span className="text-[#3b3088]" aria-hidden="true">/</span>
        <button type="button" className={TOGGLE} aria-pressed={showAgencies} onClick={() => setShowAgencies((v) => !v)}>
          <span className={`size-2.5 rounded-full bg-[#ff5fa2] ${showAgencies ? 'shadow-[0_0_8px_rgba(255,95,162,0.9)]' : 'opacity-40'}`} aria-hidden="true" />มีสังกัด
        </button>
      </div>
      {hover && !picked && (
        <div className="pointer-events-none absolute right-4 top-20 rounded-xl border border-[#3b3088] bg-[#1b1540]/95 px-3 py-2 text-sm text-white shadow-lg sm:right-6 lg:right-8">
          <p className="font-semibold">{hover.name}</p>
          <p className="text-[#c9c0f2]">คลิกเพื่อดูรายชื่อในสังกัด</p>
        </div>
      )}
      {sunClicks >= 3 && !picked && (
        <p role="status" className="absolute inset-x-4 top-20 mx-auto w-fit rounded-xl border border-[#3b3088] bg-[#1b1540]/95 px-3 py-2 text-sm text-white shadow-lg">
          <Sparkles size={14} className="mr-1 inline text-[#ffe45c]" aria-hidden="true" />
          ดวงอาทิตย์นี้คือทุกคนรวมกัน ถ้าไม่มีวีตัวเล็ก ก็ไม่มีจักรวาลนี้
        </p>
      )}
      {picked && (
        <div className="absolute bottom-28 right-4 w-[min(22rem,calc(100%-2rem))] sm:right-6 lg:right-8" aria-live="polite">
          <div className="relative">
            <button type="button" onClick={clear} className="absolute right-2 top-3 z-10 grid size-8 place-items-center rounded-full text-faint transition hover:bg-raised hover:text-ink">
              <X size={16} aria-hidden="true" /><span className="sr-only">ปิด</span>
            </button>
            <CreatorCard creator={picked} />
          </div>
          <button type="button" onClick={pick} disabled={picking} className="btn btn-secondary mt-2 w-full">
            <Shuffle size={16} aria-hidden="true" /> {picking ? 'กำลังสุ่ม…' : 'สุ่มอีกคน'}
          </button>
        </div>
      )}

      <a href="#explore" className="group absolute bottom-16 left-1/2 flex -translate-x-1/2 flex-col items-center gap-0.5 text-xs font-semibold tracking-wider text-[#9a90d0] transition hover:text-[#ff5fa2]">
        เลื่อนดูต่อ <ChevronDown size={22} className="motion-safe:animate-bounce" aria-hidden="true" />
      </a>
    </section>
  );
}

const PATHS = [
  { icon: Dices, tone: 'text-brand', hover: 'hover:!border-brand', title: 'สุ่มเจอวีอิสระ', body: 'ไม่ต้องรู้ชื่อก่อน กดสุ่มแล้วไปเจอวีที่ยังไม่มีค่ายคอยดัน', cta: 'ลองสุ่มด้านล่าง', href: '#spotlight' },
  { icon: ListFilter, tone: 'text-sky', hover: 'hover:!border-sky', title: 'ค้นหาตามแพลตฟอร์ม', body: 'อยากดูวีบน Twitch หรือ TikTok เลือกแพลตฟอร์มแล้วกรองเฉพาะวีอิสระได้', cta: 'เปิดรายชื่อ', href: '/directory?scope=independent' },
  { icon: BarChart3, tone: 'text-lemon', hover: 'hover:!border-lemon', title: 'ดูภาพรวมทั้งวงการ', body: 'วงการโตแค่ไหน วีอยู่แพลตฟอร์มไหน ค่ายใหญ่แค่ไหน ดูเป็นกราฟได้ในหน้าเดียว', cta: 'ดูข้อมูลวงการ', href: '/analytics' },
  { icon: Sparkles, tone: 'text-mint', hover: 'hover:!border-mint', title: 'ค้นพบ VTuber อิสระ', body: 'การสุ่มเลือกเฉพาะวีอิสระ และทุกคนมีโอกาสถูกสุ่มเท่ากัน', cta: 'ค้นพบ', href: '/discover' },
];

function Explore() {
  return (
    <section id="explore" className="mx-auto max-w-[1920px] scroll-mt-20 px-4 sm:px-6 lg:px-8">
      <div data-reveal><SectionHeading>ทำอะไรได้ที่นี่</SectionHeading></div>
      <ul className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {PATHS.map(({ icon: Icon, tone, hover, title, body, cta, href }) => (
          <li key={title} className={`card card-well card-hover tilt group flex flex-col p-6 transition hover:bg-card ${hover}`}>
            <span className={`icon-tile size-14 transition group-hover:scale-105 ${tone}`}><Icon size={28} aria-hidden="true" /></span>
            <h3 className="mt-5 text-xl">{title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
            <a href={href} className={`mt-6 inline-flex min-h-11 items-center gap-1.5 self-start text-sm font-semibold transition hover:underline group-hover:translate-x-1 ${tone}`}>
              {cta} <ArrowRight size={16} aria-hidden="true" />
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Spotlight() {
  const [platform, setPlatform] = useState('');
  const fetchItems = useCallback(() => fetchSpotlight({ n: 3, platform }), [platform]);
  const { data: items, error, retry: load } = useApiData(fetchItems);
  const [spin, setSpin] = useState(0);
  const reroll = () => { setSpin((n) => n + 1); load(); };
  return (
    <section id="spotlight" aria-labelledby="spotlight-title" className="mx-auto max-w-[1920px] scroll-mt-20 px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
        <SectionHeading id="spotlight-title" tone="sky" sub="การสุ่มเลือกเฉพาะวีอิสระ และทุกคนมีโอกาสถูกสุ่มเท่ากัน">วีอิสระที่น่าทำความรู้จัก</SectionHeading>
        <div className="flex w-full flex-wrap items-center gap-2 sm:gap-3 lg:w-auto">
          <div className="flex flex-wrap gap-2" role="group" aria-label="แพลตฟอร์ม">
            {SPOTLIGHT_PLATFORMS.map((p) => (
              <button key={p || 'all'} type="button" className="chip" aria-pressed={platform === p} onClick={() => setPlatform(p)}>
                {p ? platformLabel(p) : 'ทุกแพลตฟอร์ม'}
              </button>
            ))}
          </div>
          <button type="button" onClick={reroll} className="btn btn-primary ml-auto lg:ml-2">
            <RefreshCw key={spin} size={17} className={spin ? 'spin-once' : ''} aria-hidden="true" /> สุ่มชุดใหม่
          </button>
        </div>
      </div>
      <div className="mt-8 grid gap-6 md:grid-cols-3" aria-live="polite">
        {error && <DataError onRetry={load} className="md:col-span-3" />}
        {!error && !items && [0, 1, 2].map((i) => <div key={i} data-no-reveal className="card card-well h-48 animate-pulse" />)}
        {!error && items?.map((c, i) => <CreatorCard key={`${c.name}-${i}`} creator={c} variant={i} />)}
      </div>
    </section>
  );
}

const PRINCIPLES = [
  { icon: Scale, tone: 'text-sky', title: 'ไม่จัดอันดับ', body: 'ไม่มีท็อป 10 ไม่มีใครได้ที่หนึ่ง ทุกคนอยู่ในสารบบเท่ากัน' },
  { icon: EyeOff, tone: 'text-brand', title: 'ไม่โชว์ยอดซับ', body: 'ยอดผู้ติดตามไม่ได้บอกว่าใครน่าดู เราเลยไม่เอามาตัดสิน' },
  { icon: Dices, tone: 'text-mint', title: 'สุ่มอย่างยุติธรรม', body: 'การสุ่มเลือกเฉพาะวีอิสระ และทุกคนมีโอกาสถูกสุ่มเท่ากัน' },
];

function Why() {
  return (
    <section className="mx-auto max-w-[1920px] px-4 sm:px-6 lg:px-8">
      <div className="card card-well flex flex-col gap-10 p-6 sm:p-8 lg:flex-row lg:items-center lg:p-12">
        <div className="flex flex-col gap-5 lg:w-1/2">
          <SectionHeading>ทำไมต้องมี VThaiDex</SectionHeading>
          <p className="max-w-[50ch] text-base leading-relaxed text-muted sm:text-lg">
            วีค่ายใหญ่มีคนดูแลและมีคนเห็นอยู่แล้ว แต่วีตัวเล็กอีกหลายพันคนทำคอนเทนต์ทุกวันโดยแทบไม่มีใครเจอ
            <span className="font-semibold text-brand drop-shadow-[0_0_10px_rgba(255,95,162,0.45)]"> เราทำที่นี่เพื่อให้พวกเขาถูกมองเห็น</span>
          </p>
        </div>
        <ul className="grid gap-4 sm:grid-cols-3 lg:w-1/2">
          {PRINCIPLES.map(({ icon: Icon, tone, title, body }) => (
            <li key={title} className="tilt glow-follow relative flex flex-col items-center gap-3 rounded-2xl border border-line bg-card p-5 text-center shadow-md">
              <span className={`icon-tile size-12 rounded-xl ${tone}`}><Icon size={24} aria-hidden="true" /></span>
              <h3 className="text-base">{title}</h3>
              <p className="text-sm text-muted">{body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function ContributeBox() {
  return (
    <section className="mx-auto max-w-[1920px] px-4 sm:px-6 lg:px-8">
      <div data-reveal className="glow-follow aurora-border relative overflow-hidden rounded-[1.5rem] border border-brand/40 bg-gradient-to-r from-well via-card to-well p-6 shadow-[0_0_30px_-6px_color-mix(in_srgb,var(--color-brand)_30%,transparent)] sm:p-8 lg:p-12">
        <div className="pointer-events-none absolute -left-16 -top-16 size-56 rounded-full bg-brand/15 blur-3xl" aria-hidden="true" />
        <div className="relative flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl sm:text-3xl">รู้จักวีที่ยังไม่อยู่ในนี้?</h2>
            <p className="mt-2 max-w-[56ch] text-muted">ส่งชื่อกับลิงก์ช่องมาได้เลย เราตรวจจากหน้าโปรไฟล์สาธารณะแล้วพาเขาเข้าจักรวาล ใช้เวลาไม่ถึง 3 นาที</p>
          </div>
          <a href="/contribute" className="btn btn-primary btn-shine shrink-0 px-7"><PenLine size={18} aria-hidden="true" /> แนะนำวีให้เรารู้จัก</a>
        </div>
      </div>
    </section>
  );
}

/** Full-width section band with a stage-line divider; every other band is slightly lighter (Stitch layout). */
function Band({ tint = false, children }) {
  return <div className={`border-b border-line/40 py-16 md:py-20 ${tint ? 'bg-paper/45' : ''}`}>{children}</div>;
}

export default function Home() {
  return (
    <Layout>
      <Hero />
      <Band><Explore /></Band>
      <Band tint><Spotlight /></Band>
      <Band><Why /></Band>
      <Band tint><ContributeBox /></Band>
    </Layout>
  );
}
