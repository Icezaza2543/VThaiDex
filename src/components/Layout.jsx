import { useEffect, useState } from 'react';
import { Menu, X, PenLine, Orbit, BarChart3, ListFilter, Compass, Info, Sun, Moon, Coffee, Shield, Gavel, Code, FileText, Database, Eye } from 'lucide-react';
import { DONATE_URL, SOURCE_URL, fetchVisits, fmt } from '../lib/api.js';
import Backdrop, { StageBeams } from './Backdrop.jsx';
import StageMotion from './Motion.jsx';

const NAV = [
  { href: '/', label: 'หน้าแรก', icon: Orbit },
  { href: '/analytics', label: 'ข้อมูลวงการ', icon: BarChart3 },
  { href: '/directory', label: 'รายชื่อ', icon: ListFilter },
  { href: '/discover', label: 'ค้นพบ', icon: Compass },
  { href: '/about', label: 'เกี่ยวกับ', icon: Info },
];

export const LEGAL_LINKS = [
  { href: '/terms', label: 'ข้อกำหนดการให้บริการ' },
  { href: '/terms-of-use', label: 'เงื่อนไขการใช้งาน' },
  { href: '/privacy', label: 'ความเป็นส่วนตัว' },
  { href: '/data-license', label: 'สัญญาอนุญาต' },
];

const ROUND_BTN = 'grid size-10 shrink-0 place-items-center rounded-full border border-line bg-card text-muted transition hover:border-brand hover:text-ink';

function currentPath() {
  if (typeof location === 'undefined') return '/';
  return location.pathname.replace(/\.html$/, '').replace(/\/index$/, '/').replace(/(.)\/$/, '$1') || '/';
}

function ThemeToggle() {
  const [theme, setTheme] = useState(() => (typeof document !== 'undefined' && document.documentElement.dataset.theme) || 'dark');
  const next = theme === 'dark' ? 'light' : 'dark';
  const toggle = () => {
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('vthaidex-theme', next); } catch { /* private mode */ }
    setTheme(next);
  };
  return (
    <button type="button" onClick={toggle} className={ROUND_BTN} aria-label={next === 'light' ? 'เปลี่ยนเป็นธีมสว่าง' : 'เปลี่ยนเป็นธีมมืด'} title={next === 'light' ? 'ธีมสว่าง' : 'ธีมมืด'}>
      {theme === 'dark' ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
    </button>
  );
}

/** Logo: the mark on a small glowing stage tile, then the wordmark. */
function Logo({ small = false }) {
  return (
    <>
      <span className={`grid shrink-0 place-items-center border border-line bg-raised shadow-[0_0_14px_-3px_var(--color-brand)] logo-tile transition group-hover:border-brand ${small ? 'size-8 rounded-lg' : 'size-10 rounded-xl'}`}>
        <img src="/assets/logo.svg" alt="" width={small ? 20 : 24} height={small ? 20 : 24} />
      </span>
      <span className={`font-display leading-none ${small ? 'text-xl' : 'text-[1.375rem]'}`}>VThai<span className="text-brand">Dex</span></span>
    </>
  );
}

function Header() {
  const [open, setOpen] = useState(false);
  const path = currentPath();
  return (
    <header className="glass-bar sticky top-0 z-40 border-b border-line/80 bg-deep/90 shadow-[0_8px_30px_-12px_rgb(14_10_42/0.8)] backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1920px] items-center gap-3 px-4 sm:px-6 lg:px-8">
        <a href="/" className="group mr-auto flex items-center gap-2.5" aria-label="VThaiDex หน้าแรก">
          <Logo />
        </a>
        <nav aria-label="เมนูหลัก" className="hidden items-center gap-1 rounded-full border border-line bg-well p-1 md:flex">
          {NAV.map(({ href, label }) => (
            <a
              key={href}
              href={href}
              aria-current={path === href ? 'page' : undefined}
              className="rounded-full px-4 py-1.5 text-sm font-medium text-muted transition hover:text-ink aria-[current=page]:bg-brand aria-[current=page]:font-semibold aria-[current=page]:text-on-brand aria-[current=page]:shadow-[0_0_16px_-2px_var(--color-brand)]"
            >
              {label}
            </a>
          ))}
        </nav>
        <a
          href="/contribute"
          aria-current={path === '/contribute' ? 'page' : undefined}
          className="hidden h-10 items-center gap-1.5 rounded-full border border-line bg-card px-4 text-sm font-medium text-muted transition hover:border-brand hover:text-ink aria-[current=page]:border-brand aria-[current=page]:text-ink md:inline-flex"
        >
          <PenLine size={16} className="text-brand" aria-hidden="true" />
          แจ้งข้อมูล
        </a>
        <ThemeToggle />
        <button
          type="button"
          className={`${ROUND_BTN} md:hidden`}
          aria-expanded={open}
          aria-controls="mobile-nav"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
          <span className="sr-only">เมนู</span>
        </button>
      </div>
      {open && (
        <nav id="mobile-nav" aria-label="เมนูหลัก" className="mx-4 mb-4 space-y-1 rounded-2xl border border-line bg-well p-2 md:hidden">
          {[...NAV, { href: '/contribute', label: 'แจ้งข้อมูล', icon: PenLine }].map(({ href, label, icon: Icon }) => (
            <a
              key={href}
              href={href}
              aria-current={path === href ? 'page' : undefined}
              className="flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-ink aria-[current=page]:bg-brand aria-[current=page]:font-semibold aria-[current=page]:text-on-brand"
            >
              <Icon size={18} className="opacity-75" aria-hidden="true" />
              {label}
            </a>
          ))}
        </nav>
      )}
    </header>
  );
}

function SupportBand() {
  return (
    <section aria-label="สนับสนุนคนทำ VThaiDex" className="mx-auto mt-20 max-w-[1920px] px-4 sm:px-6 lg:px-8">
      <div className="card card-well glow-follow flex flex-col items-start gap-6 p-6 sm:p-8 md:flex-row md:items-center md:justify-between lg:p-10">
        <div className="flex items-start gap-5 md:items-center">
          <span className="icon-tile size-14 text-peach"><Coffee size={28} aria-hidden="true" /></span>
          <div>
            <p className="font-display text-xl sm:text-2xl">สนับสนุนคนทำ VThaiDex</p>
            <p className="mt-1 max-w-[60ch] text-muted">เว็บนี้ทำโดยคนคนเดียว ไม่มีโฆษณา ถ้าชอบที่นี่ เลี้ยงกาแฟหนึ่งแก้วช่วยค่าเซิร์ฟเวอร์และเวลาทำข้อมูลได้ เงินนี้ไม่ได้ไปถึงวีในรายชื่อ</p>
          </div>
        </div>
        <a href={DONATE_URL} target="_blank" rel="noopener noreferrer" className="btn btn-primary w-full shrink-0 md:w-auto">
          <Coffee size={18} aria-hidden="true" /> เลี้ยงกาแฟผ่าน EasyDonate
        </a>
      </div>
    </section>
  );
}

function VisitCounter() {
  const [visits, setVisits] = useState(null);
  useEffect(() => { fetchVisits().then(setVisits).catch(() => {}); }, []);
  if (!visits) return null;
  return (
    <p className="flex items-center gap-1.5" aria-label={`ผู้เข้าชมวันนี้ ${fmt(visits.today)} คน ทั้งหมด ${fmt(visits.total)} คน`}>
      <Eye size={15} className="text-sky" aria-hidden="true" />
      <span>วันนี้ <span className="font-semibold text-muted tabular-nums">{fmt(visits.today)}</span></span>
      <span aria-hidden="true">·</span>
      <span>ทั้งหมด <span className="font-semibold text-muted tabular-nums">{fmt(visits.total)}</span></span>
    </p>
  );
}

function Footer() {
  return (
    <footer className="mt-14 border-t border-line bg-deep">
      <div className="mx-auto grid max-w-[1920px] gap-10 px-4 py-12 text-sm sm:px-6 md:grid-cols-12 md:gap-12 md:py-16 lg:px-8">
        <div className="md:col-span-5">
          <a href="/" className="group flex w-fit items-center gap-2" aria-label="VThaiDex หน้าแรก">
            <Logo small />
            <span className="ml-1 rounded-full border border-line bg-raised px-2.5 py-0.5 text-xs font-semibold text-muted">สารบบอิสระ</span>
          </a>
          <p className="mt-4 max-w-md text-muted">สารบบ VTuber ไทย ทำขึ้นเพื่อให้วีตัวเล็กถูกมองเห็นมากขึ้น ไม่เกี่ยวข้องกับครีเอเตอร์หรือแพลตฟอร์มใด</p>
        </div>
        <nav aria-label="นโยบาย" className="md:col-span-3">
          <p className="flex items-center gap-1.5 font-bold text-ink"><Shield size={16} className="text-sky" aria-hidden="true" />นโยบาย</p>
          <ul className="mt-4 space-y-2.5 text-muted">
            {LEGAL_LINKS.map((l) => (
              <li key={l.href}><a className="transition hover:text-brand" href={l.href}>{l.label}</a></li>
            ))}
          </ul>
        </nav>
        <div className="md:col-span-4">
          <p className="flex items-center gap-1.5 font-bold text-ink"><Gavel size={16} className="text-lemon" aria-hidden="true" />สิทธิ์การใช้งาน</p>
          <ul className="mt-4 space-y-3 rounded-xl border border-line bg-well p-4 text-muted">
            <li className="flex items-start gap-2"><Code size={16} className="mt-1 shrink-0 text-sky" aria-hidden="true" /><span>โค้ด: <a className="transition hover:text-brand hover:underline" href={SOURCE_URL} target="_blank" rel="noopener noreferrer">AGPL-3.0 บน GitHub</a></span></li>
            <li className="flex items-start gap-2"><FileText size={16} className="mt-1 shrink-0 text-brand" aria-hidden="true" /><span>ข้อความ: CC BY-NC-ND 4.0</span></li>
            <li className="flex items-start gap-2"><Database size={16} className="mt-1 shrink-0 text-lemon" aria-hidden="true" /><span>ฐานข้อมูล: สงวนสิทธิ์</span></li>
          </ul>
        </div>
      </div>
      <div className="mx-auto flex max-w-[1920px] flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-line/50 px-4 py-5 text-sm text-faint sm:px-6 lg:px-8">
        <p>© 2027 VThaiDex Project.</p>
        <VisitCounter />
      </div>
    </footer>
  );
}

export default function Layout({ children }) {
  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-ink focus:px-4 focus:py-2 focus:text-deep">
        ข้ามไปยังเนื้อหา
      </a>
      <Backdrop />
      <StageMotion />
      <Header />
      <main id="main">{children}</main>
      <SupportBand />
      <Footer />
    </>
  );
}

/**
 * Page title on the stage: display-face heading with a soft pink glow, stage-light haze and two light beams behind
 * it. `center` for hero-style pages, `aside` for a right-hand note (e.g. the data date), `eyebrow` for a small pill.
 */
export function PageTitle({ title, children, eyebrow, aside, center = false, wide = false }) {
  return (
    <div className="relative">
      {/* Behind the page content (same layer as <Backdrop>), fading out instead of ending in a hard edge. */}
      <div data-parallax="70" className="pointer-events-none absolute inset-x-0 -top-6 -z-10 h-80 overflow-hidden [mask-image:linear-gradient(to_bottom,black_50%,transparent)]" aria-hidden="true">
        <div className={`absolute top-0 h-56 w-[min(720px,90vw)] rounded-full bg-brand/15 blur-[100px] stage-breathe ${center ? 'left-1/2 -translate-x-1/2' : 'left-0 sm:left-[8%]'}`} />
        <div className={`absolute top-10 h-40 w-[min(460px,70vw)] rounded-full bg-sky/10 blur-[90px] ${center ? 'left-1/2 -translate-x-1/2' : 'left-[30%]'}`} />
        <StageBeams className={`absolute top-6 h-32 w-full max-w-4xl opacity-40 ${center ? 'left-1/2 -translate-x-1/2' : 'left-0'}`} />
      </div>
      <div className="relative mx-auto max-w-[1920px] px-4 pt-10 sm:px-6 sm:pt-14 lg:px-8">
        <div className={center ? 'flex flex-col items-center text-center' : 'flex flex-col gap-4 md:flex-row md:items-end md:justify-between'}>
          <div className={center ? 'flex flex-col items-center' : 'min-w-0'}>
            {eyebrow && <div data-hero-item className="mb-3">{eyebrow}</div>}
            <h1 data-hero-item className="title-glow text-[2rem] leading-tight drop-shadow-[0_2px_16px_rgb(255_95_162/0.35)] sm:text-[2.75rem]">{title}</h1>
            {children && <div data-hero-item className={`mt-2 text-muted ${wide ? "max-w-[110ch]" : "max-w-[62ch]"}`}>{children}</div>}
          </div>
          {aside && <div data-hero-item>{aside}</div>}
        </div>
      </div>
    </div>
  );
}
