import { useEffect, useId, useRef, useState } from 'react';
import { CircleHelp, ExternalLink } from 'lucide-react';
import { creatorSummary, fmt, primaryChannel } from '../lib/api.js';
import PlatformIcon from './PlatformIcon.jsx';

// Colour discipline: BRAND marks what matters (independent creators, the main series), NEUTRAL (lilac) is agency
// creators and everything else, RAMP runs pink → lilac → sky for ordered categories, and platforms use their own
// brand colour.
export const BRAND = 'var(--color-brand)';
export const NEUTRAL = 'var(--color-neutral)';
export const RAMP = [
  'var(--color-brand)',
  'color-mix(in srgb, var(--color-brand) 50%, var(--color-lilac))',
  'var(--color-lilac)',
  'color-mix(in srgb, var(--color-lilac) 50%, var(--color-sky))',
  'var(--color-sky)',
];
const PLATFORM_COLORS = {
  youtube: '#ff0033', twitch: '#9146ff', bluesky: '#1185fe', facebook: '#0866ff', instagram: '#e1306c',
  tiktok: '#00c2ba', soop: '#3d8bff', kofi: '#ff6433', buymeacoffee: '#e6b800', streamlabs: '#31c3a2', x: 'var(--color-ink)',
};
export const platformColor = (name) => PLATFORM_COLORS[name] || NEUTRAL;

/** Help icon that opens on click/tap (hover does not exist on touch screens). */
export function HelpTip({ children, label = 'คำอธิบาย' }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', esc); };
  }, [open]);
  return (
    <span ref={ref} className="relative inline-flex align-middle">
      <button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen((v) => !v)} className="grid size-7 place-items-center rounded-full text-faint transition hover:bg-raised hover:text-ink">
        <CircleHelp size={16} aria-hidden="true" />
        <span className="sr-only">{label}</span>
      </button>
      {open && (
        <span id={id} role="note" className="absolute left-1/2 top-8 z-30 w-64 -translate-x-1/2 rounded-xl border border-line bg-raised p-3 font-sans text-sm font-normal leading-relaxed text-ink shadow-xl">
          {children}
        </span>
      )}
    </span>
  );
}

/** Agency pill; an independent creator gets the sky "วีอิสระ" tag (a classification, never "unknown"). */
export function AgencyTag({ agency }) {
  if (!agency || agency === 'Independent') {
    return <span className="tag tag-indie"><span className="size-1.5 rounded-full bg-sky" aria-hidden="true" />วีอิสระ</span>;
  }
  return <span className="tag">{agency}</span>;
}

/** Status chip, shown only for a verified status (e.g. graduated); quiet, never alarming. */
export function StatusChip({ label }) {
  if (!label) return null;
  return <span className="tag border-faint/60 bg-transparent">{label}</span>;
}

/** A channel link tinted with its platform colour. */
export function PlatformLink({ link, creatorName }) {
  return (
    <a href={link.url} target="_blank" rel="noopener noreferrer" className="pchip" style={{ '--pc': platformColor(link.name) }} aria-label={creatorName ? `${link.label} ของ ${creatorName} (เปิดในแท็บใหม่)` : undefined}>
      {link.label}
      <ExternalLink size={12} className="opacity-70" aria-hidden="true" />
    </a>
  );
}

const CARD_ACCENTS = [
  'from-brand via-brand-deep to-brand',
  'from-brand via-lilac to-brand',
  'from-brand via-peach to-brand',
];

/** One creator as a stage "sticker" card: tag + debut, the name (wraps, never cut) and real channel buttons.
 * `discover` keeps the same card and shows a name monogram (no portrait is published; CSP blocks remote images),
 * platform marks, and a single channel link. */
export function CreatorCard({ creator, variant = 0, discover = false }) {
  const c = creatorSummary(creator);
  if (discover) {
    const primary = primaryChannel(c.links);
    const mark = Array.from(c.name)[0] || '•';
    return (
      <article className="card card-well card-hover tilt relative flex h-full flex-col overflow-hidden p-6">
        <span className={`accent-flow absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${CARD_ACCENTS[variant % CARD_ACCENTS.length]}`} aria-hidden="true" />
        <div className="flex items-center gap-3 pt-2">
          <span aria-hidden="true" className="grid size-12 shrink-0 place-items-center rounded-full border border-line bg-raised font-display text-xl text-brand">{mark}</span>
          <div className="min-w-0">
            <h3 className="break-words text-lg [overflow-wrap:anywhere]">{c.name}</h3>
            {c.links.length > 0 && (
              <ul className="mt-1.5 flex flex-wrap items-center gap-2" aria-label={`ช่องทางของ ${c.name}`}>
                {c.links.map((link) => <li key={`${link.name}-${link.url}`}><PlatformIcon name={link.name} size={16} /></li>)}
              </ul>
            )}
          </div>
        </div>
        {primary && (
          <div className="mt-auto pt-6">
            <a href={primary.url} target="_blank" rel="noopener noreferrer" className="link-chip" aria-label={`ไปที่ช่องของ ${c.name} (เปิดในแท็บใหม่)`}>
              ไปที่ช่อง <ExternalLink size={13} aria-hidden="true" />
            </a>
          </div>
        )}
      </article>
    );
  }
  return (
    <article className="card card-well card-hover tilt relative flex h-full flex-col overflow-hidden p-6">
      <span className={`accent-flow absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${CARD_ACCENTS[variant % CARD_ACCENTS.length]}`} aria-hidden="true" />
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 pr-6">
        <AgencyTag agency={c.agency} />
        {c.debutYear && <span className="text-xs text-faint">เดบิวต์ {c.debutYear}</span>}
      </div>
      <h3 className="mt-4 break-words text-lg [overflow-wrap:anywhere]">{c.name}</h3>
      {c.statusLabel && <div className="mt-2"><StatusChip label={c.statusLabel} /></div>}
      <div className="mt-auto flex flex-wrap gap-2 pt-6">
        {c.links.slice(0, 3).map((l) => (
          <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer" className="link-chip">
            ไปที่ {l.label} <ExternalLink size={13} aria-hidden="true" />
          </a>
        ))}
      </div>
    </article>
  );
}

/** Vertical bars for discrete years. series: [{key, color, values: {year: n}}] stacked bottom-up. */
export function YearBars({ years, series, height = 150, label }) {
  const totals = years.map((y) => series.reduce((a, s) => a + (s.values[y] || 0), 0));
  const max = Math.max(...totals, 1);
  return (
    <figure aria-label={label}>
      <div className="flex items-end gap-1 sm:gap-1.5" style={{ height }}>
        {years.map((y, i) => (
          <div key={y} className="group relative flex h-full flex-1 flex-col justify-end" title={`${y}: ${fmt(totals[i])}`}>
            <span className="mb-1 text-center text-[11px] tabular-nums text-faint opacity-0 group-hover:opacity-100">{fmt(totals[i])}</span>
            <div className="flex w-full flex-col-reverse overflow-hidden rounded-t-md" style={{ height: `${(totals[i] / max) * 100}%` }}>
              {series.map((s) => (
                <span key={s.key} className="block w-full shrink-0" style={{ background: s.color, height: `${totals[i] ? ((s.values[y] || 0) / totals[i]) * 100 : 0}%` }} />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-1 sm:gap-1.5" aria-hidden="true">
        {years.map((y) => <span key={y} className="flex-1 text-center text-[11px] tabular-nums text-faint">{String(y).slice(2)}</span>)}
      </div>
      <table className="sr-only">
        <caption>{label}</caption>
        <tbody>{years.map((y, i) => <tr key={y}><th>{y}</th><td>{totals[i]}</td></tr>)}</tbody>
      </table>
    </figure>
  );
}

/** Horizontal share bars: rows [{key, label, value, color, part?}] where part is a highlighted sub-share. */
export function ShareBars({ rows, max }) {
  const top = max ?? Math.max(...rows.map((r) => r.value), 1);
  return (
    <ul className="space-y-3">
      {rows.map((r, i) => (
        <li key={r.key} className="grid grid-cols-[1.75rem_1fr_3.5rem] items-center gap-3 text-sm" title={r.name}>
          <span className="truncate">{r.label}</span>
          <span className="relative h-2.5 rounded-full bg-deep" aria-hidden="true">
            <span className="bar-grow absolute inset-y-0 left-0 rounded-full opacity-35" style={{ width: `${(r.value / top) * 100}%`, background: r.color, animationDelay: `${i * 40}ms` }} />
            {r.part != null && (
              <span className="bar-grow absolute inset-y-0 left-0 rounded-full" style={{ width: `${(r.part / top) * 100}%`, background: r.color, animationDelay: `${i * 40}ms` }} />
            )}
          </span>
          <span className="text-right tabular-nums text-muted">{fmt(r.value)}</span>
        </li>
      ))}
    </ul>
  );
}

export function Legend({ items }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
      {items.map((it) => (
        <li key={it.key ?? it.label} className="flex items-center gap-1.5" title={it.name}>
          <span className="size-2.5 rounded-full" style={{ background: it.color, opacity: it.faded ? 0.35 : 1 }} aria-hidden="true" />
          {it.label}
        </li>
      ))}
    </ul>
  );
}
