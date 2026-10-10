// "What the data says" cards for /analytics: each card's headline is the finding, computed from
// summary.insights (count-only aggregates published by ThaiVtuberMaster). Definitions follow Master's insights.
import { ArrowRight } from 'lucide-react';
import { BRAND, NEUTRAL, RAMP } from '../components/ui.jsx';
import PlatformIcon from '../components/PlatformIcon.jsx';
import { Donut, Waffle } from '../components/charts.jsx';
import { fmt, pct, STATUS_LABELS } from '../lib/api.js';
import { INCOMPLETE_YEAR_NOTE, YOUTUBE_MEASURE_NOTE, isIncompleteYear, knownPercent, subsetNote } from '../lib/coverage.js';

const TIERS = ['independent', 'small', 'mid', 'big'];
const TIER_LABEL = { independent: 'วีอิสระ', small: 'ค่ายเล็ก', mid: 'ค่ายกลาง', big: 'ค่ายใหญ่' };
const TIER_COLOR = { independent: BRAND, small: 'var(--color-lilac)', mid: 'var(--color-lemon)', big: 'var(--color-sky)' };
const TIER_NOTE = `ระดับค่ายดูจากยอดผู้ติดตาม YouTube รวมของสมาชิก: ใหญ่ 1M ขึ้นไป · กลาง 100K–1M · เล็กต่ำกว่า 100K ${YOUTUBE_MEASURE_NOTE}`;
const BAND_LABEL = { '<1K': 'ต่ำกว่า 1K', '1K-10K': '1K–10K', '10K-100K': '10K–100K', '100K+': '100K ขึ้นไป' };
const sumTiers = (r) => TIERS.reduce((a, t) => a + (r[t] || 0), 0);
const Hi = ({ children }) => <span className="text-brand">{children}</span>;

function TierLegend({ tiers = TIERS }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
      {tiers.map((t) => (
        <li key={t} className="flex items-center gap-1.5"><span className="size-2.5 rounded-full" style={{ background: TIER_COLOR[t] }} aria-hidden="true" />{TIER_LABEL[t]}</li>
      ))}
    </ul>
  );
}

function InsightCard({ title, children, note, coverage, className = '' }) {
  const foot = [coverage, note].filter(Boolean).join(' ');
  return (
    <article className={`card card-hover flex flex-col p-6 ${className}`}>
      <h3 className="font-display text-[1.375rem] font-normal leading-snug sm:text-2xl">{title}</h3>
      <div className="mt-5 flex-1">{children}</div>
      {foot && <p className="mt-5 border-t border-line pt-3 text-xs text-faint">{foot}</p>}
    </article>
  );
}

/** One 100%-stacked bar per row; segments labelled with their % when wide enough. */
function StackRows({ rows, keys, colors, labelWidth = '6.5rem' }) {
  return (
    <ul className="space-y-3">
      {rows.map((r) => {
        const total = keys.reduce((a, k) => a + (r.values[k] || 0), 0) || 1;
        return (
          <li key={r.label} className="grid items-center gap-3 text-sm" style={{ gridTemplateColumns: `${labelWidth} 1fr` }}>
            <span className="font-medium">{r.label}</span>
            <span className="flex h-8 overflow-hidden rounded-lg bg-deep" title={keys.map((k) => `${k}: ${fmt(r.values[k] || 0)}`).join(' / ')}>
              {keys.map((k) => {
                const p = ((r.values[k] || 0) / total) * 100;
                return (
                  <span key={k} className="@container flex items-center px-1.5 text-xs font-bold" style={{ width: `${p}%`, background: colors[k], color: 'var(--color-on-brand)' }}>
                    {/* The label shows only when its own segment is wide enough, at any screen width. */}
                    {p > 0 && <span className="hidden @min-[1.5rem]:inline">{Math.round(p)}%</span>}
                  </span>
                );
              })}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function TierShare({ ins, total }) {
  const c = Object.fromEntries(ins.tiers.map((t) => [t.tier, t.count]));
  const tierTotal = sumTiers(c);
  const notBig = 100 - (pct(c.big, tierTotal) ?? 0);
  return (
    <InsightCard title={<><Hi>{notBig}%</Hi> ของวีไทย<br />ไม่ได้อยู่ค่ายใหญ่</>} coverage={subsetNote(tierTotal, total)} note={`${TIER_NOTE} (ตอนนี้มีค่ายใหญ่ ${ins.big_agency_count} ค่าย) · 1 ช่อง = 1%`}>
      <Waffle label="สัดส่วนวีตามประเภทสังกัด" parts={TIERS.map((t) => ({ label: TIER_LABEL[t], value: c[t], color: TIER_COLOR[t] }))} />
    </InsightCard>
  );
}

function StillActive({ ins, total }) {
  const rows = ins.activity;
  const active = rows.reduce((a, r) => a + r.active, 0);
  const indie = rows.find((r) => r.tier === 'independent');
  const max = Math.max(...rows.map((r) => r.scanned), 1);
  return (
    <InsightCard title={<>วีที่ยังทำอยู่ <Hi>{pct(indie.active, active)}%</Hi><br />เป็นวีอิสระ</>} coverage={subsetNote(ins.basis.activity_scanned, total)} note={`ยังทำอยู่ = มีคลิปใหม่ใน 90 วัน · นับเฉพาะ ${fmt(ins.basis.activity_scanned)} ช่องที่ระบบตรวจการลงคลิปได้ ${YOUTUBE_MEASURE_NOTE}`}>
      <div className="flex h-56 items-end justify-around gap-4">
        {rows.map((r) => (
          <div key={r.tier} className="flex h-full w-full max-w-28 flex-col items-center justify-end">
            <span className="mb-1 font-display text-lg tabular-nums">{fmt(r.active)}</span>
            <div className="relative w-full rounded-t-md" style={{ height: `${(r.scanned / max) * 82}%`, background: `color-mix(in srgb, ${TIER_COLOR[r.tier]} 22%, transparent)` }} title={`ตรวจได้ ${fmt(r.scanned)} · ยังทำอยู่ ${fmt(r.active)}`}>
              <span className="absolute inset-x-0 bottom-0 rounded-t-md" style={{ height: `${(r.active / r.scanned) * 100}%`, background: TIER_COLOR[r.tier] }} />
            </div>
            <span className="mt-2 text-center text-sm">{TIER_LABEL[r.tier]}</span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-sm text-muted">สีเข้ม = มีคลิปใหม่ใน 90 วัน · สีจาง = ทั้งหมดที่ตรวจได้</p>
    </InsightCard>
  );
}

function ActiveDots({ ins, total }) {
  const a = Object.fromEntries(ins.activity.map((r) => [r.tier, r.active]));
  const times = a.big ? Math.round(a.independent / a.big) : null;
  const dots = (n) => Math.round(n / 10);
  return (
    <InsightCard title={<>วีอิสระที่ยังทำอยู่<br />มากกว่าค่ายใหญ่ <Hi>{times ?? '—'} เท่า</Hi></>} coverage={subsetNote(ins.basis.activity_scanned, total)} note={`1 จุด = 10 คน · นับคนที่มีคลิปใหม่ใน 90 วัน ${YOUTUBE_MEASURE_NOTE}`}>
      {['independent', 'big'].map((t) => (
        <div key={t} className="mb-5">
          <p className="flex justify-between text-sm"><span className="font-medium">{TIER_LABEL[t]}ที่ยังทำอยู่</span><span className="font-display text-lg tabular-nums">{fmt(a[t])}</span></p>
          <div className="mt-2 flex flex-wrap gap-1.5" role="img" aria-label={`${TIER_LABEL[t]} ${a[t]} คน`}>
            {Array.from({ length: Math.max(dots(a[t]), a[t] ? 1 : 0) }, (_, i) => <span key={i} className="size-3 rounded-full" style={{ background: TIER_COLOR[t] }} />)}
          </div>
        </div>
      ))}
    </InsightCard>
  );
}

function BandsByTier({ ins, total }) {
  const rows = ins.size_bands.map((b) => ({ label: BAND_LABEL[b.band] || b.band, values: b }));
  const small = ins.size_bands.filter((b) => b.band === '<1K' || b.band === '1K-10K');
  const smallTotal = small.reduce((a, b) => a + sumTiers(b), 0);
  const smallNotBig = small.reduce((a, b) => a + b.independent + b.small + b.mid, 0);
  return (
    <InsightCard title={<>ช่องเล็ก <Hi>{pct(smallNotBig, smallTotal)}%</Hi><br />ไม่ใช่ค่ายใหญ่</>} coverage={subsetNote(ins.basis.with_youtube_followers, total)} note={`ใช้ช่อง YouTube ที่มีผู้ติดตามมากที่สุดของแต่ละคน · ${fmt(ins.basis.with_youtube_followers)} ช่องที่มียอดผู้ติดตาม ${YOUTUBE_MEASURE_NOTE}`}>
      <TierLegend />
      <div className="mt-4"><StackRows rows={rows} keys={TIERS} colors={TIER_COLOR} /></div>
    </InsightCard>
  );
}

function BandLines({ ins, total }) {
  const bands = ins.size_bands;
  const share = (b, t) => (sumTiers(b) ? (b[t] / sumTiers(b)) * 100 : 0);
  const last = bands.at(-1);
  const indieLeads = share(last, 'independent') >= share(last, 'big');
  const W = 560, H = 220, padL = 34, padR = 118, padY = 14; // padR fits the longest end label, "11% ค่ายเล็ก/กลาง"
  const X = (i) => padL + (i * (W - padL - padR)) / (bands.length - 1);
  const Y = (v) => H - padY - (v / 100) * (H - 2 * padY);
  return (
    <InsightCard title={<>ช่องที่ใหญ่มักอยู่ในค่ายใหญ่<br />{indieLeads ? <>แต่<Hi>วีอิสระยังนำ</Hi></> : <>และ<Hi>ค่ายใหญ่นำ</Hi></>}</>} coverage={subsetNote(ins.basis.with_youtube_followers, total)} note={`สัดส่วนของช่องในแต่ละช่วงยอดผู้ติดตาม YouTube ${YOUTUBE_MEASURE_NOTE}`}>
      <svg viewBox={`0 0 ${W} ${H + 24}`} className="w-full" role="img" aria-label="สัดส่วนประเภทสังกัดในแต่ละช่วงยอดผู้ติดตาม">
        {[0, 25, 50, 75, 100].map((v) => (
          <g key={v}><line x1={padL} x2={W - padR} y1={Y(v)} y2={Y(v)} stroke="var(--color-line)" /><text x={padL - 6} y={Y(v) + 4} textAnchor="end" fontSize="11" fill="var(--color-faint)">{v}%</text></g>
        ))}
        {bands.map((b, i) => <text key={b.band} x={X(i)} y={H + 18} textAnchor="middle" fontSize="12" fill="var(--color-muted)">{BAND_LABEL[b.band] || b.band}</text>)}
        {TIERS.map((t) => (
          <g key={t}>
            <polyline points={bands.map((b, i) => `${X(i)},${Y(share(b, t))}`).join(' ')} fill="none" stroke={TIER_COLOR[t]} strokeWidth="2.75" strokeLinejoin="round" />
            {bands.map((b, i) => <circle key={b.band} cx={X(i)} cy={Y(share(b, t))} r="4.5" fill={TIER_COLOR[t]} />)}
            <text x={X(bands.length - 1) + 10} y={Y(share(last, t)) + 4} fontSize="13" fontWeight="600" fill="var(--color-ink)">{Math.round(share(last, t))}% <tspan fontWeight="400" fill="var(--color-muted)" fontSize="11">{TIER_LABEL[t]}</tspan></text>
          </g>
        ))}
      </svg>
    </InsightCard>
  );
}

function TierBands({ ins, total }) {
  const order = ['<1K', '1K-10K', '10K-100K', '100K+'];
  const colors = Object.fromEntries(order.map((b, i) => [b, RAMP[RAMP.length - 1 - i] ?? RAMP[0]]));
  colors['100K+'] = RAMP[0];
  const rows = TIERS.map((t) => ({ label: TIER_LABEL[t], values: Object.fromEntries(ins.size_bands.map((b) => [b.band, b[t]])) }));
  const big = rows[2].values;
  const bigTotal = order.reduce((a, b) => a + (big[b] || 0), 0);
  return (
    <InsightCard title={<>ช่องค่ายใหญ่ <Hi>{pct((big['10K-100K'] || 0) + (big['100K+'] || 0), bigTotal)}%</Hi><br />อยู่ระดับ 10K ขึ้นไป</>} coverage={subsetNote(ins.basis.with_youtube_followers, total)} note={`ช่วงยอดผู้ติดตามของช่อง YouTube หลัก แยกตามประเภทสังกัด ${YOUTUBE_MEASURE_NOTE}`}>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
        {order.map((b) => <li key={b} className="flex items-center gap-1.5"><span className="size-2.5 rounded-full" style={{ background: colors[b] }} aria-hidden="true" />{BAND_LABEL[b]}</li>)}
      </ul>
      <div className="mt-4"><StackRows rows={rows} keys={order} colors={colors} labelWidth="7rem" /></div>
    </InsightCard>
  );
}

function SmallChoices({ ins, total }) {
  const small = ins.size_bands.filter((b) => b.band === '<1K' || b.band === '1K-10K');
  const notBig = small.reduce((a, b) => a + b.independent + b.small + b.mid, 0);
  const indie = small.reduce((a, b) => a + b.independent, 0);
  const big = small.reduce((a, b) => a + b.big, 0);
  const rounded = Math.floor(notBig / 100) * 100;
  return (
    <InsightCard title={<>อยากจุ่มวีตัวเล็ก<br />มีให้เลือก<Hi>เกือบ {fmt(rounded + 100)} ช่อง</Hi></>} coverage={subsetNote(ins.basis.with_youtube_followers, total)} note={`ช่องที่มีผู้ติดตาม YouTube ต่ำกว่า 10K ${YOUTUBE_MEASURE_NOTE}`}>
      <p className="text-sm font-medium">ช่องต่ำกว่า 10K ที่ไม่ใช่ค่ายใหญ่</p>
      <div className="mt-2 flex items-center gap-3">
        <div className="flex h-12 flex-1 overflow-hidden rounded-md">
          <span style={{ width: `${(indie / notBig) * 100}%`, background: TIER_COLOR.independent }} />
          <span style={{ width: `${((notBig - indie) / notBig) * 100}%`, background: TIER_COLOR.small }} />
        </div>
        <span className="font-display text-2xl tabular-nums">{fmt(notBig)}</span>
      </div>
      <p className="mt-5 text-sm font-medium">ช่องต่ำกว่า 10K ของค่ายใหญ่</p>
      <div className="mt-2 flex items-center gap-3">
        <span className="h-12 w-1.5 rounded-full" style={{ background: TIER_COLOR.big }} />
        <span className="font-display text-2xl tabular-nums">{fmt(big)}</span>
      </div>
      <a href="/directory?scope=independent" className="btn btn-secondary mt-5">ดูวีอิสระทั้งหมด <ArrowRight size={15} aria-hidden="true" /></a>
    </InsightCard>
  );
}

function NewDebuts({ ins, total, knownDebut }) {
  const thisYear = new Date().getFullYear();
  const rows = ins.debuts_by_tier.filter((r) => r.year <= thisYear && sumTiers(r) > 0);
  const complete = rows.filter((r) => r.year < thisYear);
  const show = rows.slice(-4);
  const last = complete.at(-1) || rows.at(-1);
  if (!last) return null;
  const max = Math.max(...show.map(sumTiers), 1);
  const unknownDebut = Number.isFinite(knownDebut) && Number.isFinite(total) ? Math.max(total - knownDebut, 0) : 0;
  return (
    <InsightCard title={<>วีหน้าใหม่ปี {last.year}<br /><Hi>{pct(last.independent, sumTiers(last))}%</Hi> เป็นวีอิสระ</>} coverage={subsetNote(Number.isFinite(knownDebut) ? knownDebut : rows.reduce((a, r) => a + sumTiers(r), 0), total, unknownDebut)} note={`ปีเดบิวต์จากเหตุการณ์เดบิวต์ที่มีหลักฐาน · ใช้สังกัดปัจจุบัน สมาชิกใหม่ของค่ายอาจยังไม่ถูกบันทึก ${INCOMPLETE_YEAR_NOTE}`}>
      <TierLegend />
      <div className="mt-4 flex h-56 items-end justify-around gap-4">
        {show.map((r) => {
          const total = sumTiers(r);
          return (
            <div key={r.year} className="flex h-full w-full max-w-24 flex-col items-center justify-end" data-incomplete-year={r.year === thisYear ? 'true' : undefined}>
              <span className="mb-1 text-sm tabular-nums text-muted" style={{ opacity: r.year === thisYear ? 0.55 : 1 }}>{fmt(total)}</span>
              <div className="flex w-full flex-col-reverse overflow-hidden rounded-t-md" style={{ height: `${(total / max) * 85}%`, opacity: r.year === thisYear ? 0.4 : 1, outline: r.year === thisYear ? '1px dashed var(--color-faint)' : undefined }}>
                {TIERS.map((t) => <span key={t} className="block w-full shrink-0" style={{ height: `${(r[t] / total) * 100}%`, background: TIER_COLOR[t] }} title={`${TIER_LABEL[t]}: ${fmt(r[t])}`} />)}
              </div>
              <span className="mt-2 text-sm font-medium">ปี {r.year}</span>
            </div>
          );
        })}
      </div>
    </InsightCard>
  );
}

function LiveWhere({ ins, total }) {
  const combos = [...ins.live_combos].sort((a, b) => b.count - a.count);
  const comboTotal = combos.reduce((a, c) => a + c.count, 0);
  const ytOnly = combos.find((c) => c.platforms.length === 1 && c.platforms[0] === 'youtube');
  const multi = combos.filter((c) => c.platforms.length > 1).reduce((a, c) => a + c.count, 0);
  const max = Math.max(...combos.map((c) => c.count), 1);
  return (
    <InsightCard className="md:col-span-2" title={<>วีไทย <Hi>{pct(ytOnly?.count, comboTotal)}%</Hi> อยู่บน YouTube อย่างเดียว<br />อีก <Hi>{pct(multi, comboTotal)}%</Hi> อยู่หลายแพลตฟอร์มพร้อมกัน</>} coverage={subsetNote(comboTotal, total)} note={`นับจากบัญชี YouTube / Twitch / TikTok ที่ยืนยันแล้ว ไม่ได้ดูว่าไลฟ์พร้อมกันจริงไหม · อีก ${fmt(ins.no_live_platform)} คนไม่มีบัญชีบนสามแพลตฟอร์มนี้`}>
      <ul className="grid gap-x-10 gap-y-3 md:grid-cols-2">
        {combos.filter((c) => c.count > 0).map((c) => (
          <li key={c.platforms.join('+')} className="grid grid-cols-[5.5rem_1fr_3.5rem] items-center gap-3 text-sm" title={`${fmt(c.count)} คน · วีอิสระ ${fmt(c.independent)}`}>
            <span className="flex items-center gap-1.5">{c.platforms.map((p) => <PlatformIcon key={p} name={p} size={17} />)}</span>
            <span className="relative h-3 rounded-full bg-deep" aria-hidden="true">
              <span className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${(c.count / max) * 100}%`, background: NEUTRAL }} />
              <span className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${(c.independent / max) * 100}%`, background: BRAND }} />
            </span>
            <span className="text-right tabular-nums text-muted">{fmt(c.count)}</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 flex flex-wrap gap-x-4 text-sm text-muted">
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-brand" aria-hidden="true" />วีอิสระ</span>
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full" style={{ background: NEUTRAL }} aria-hidden="true" />มีสังกัด</span>
      </p>
    </InsightCard>
  );
}

/** The whole "what the data says" block; renders nothing until the snapshot carries insights. */

// ---- More views (computed from the same public summary; no new data sources) ----
const PLATFORM_NAME = { youtube: 'YouTube', twitch: 'Twitch', tiktok: 'TikTok', x: 'X', facebook: 'Facebook', bluesky: 'Bluesky', instagram: 'Instagram', easydonate: 'EasyDonate', website: 'เว็บไซต์', tipme: 'Tipme', tipjai: 'Tipjai', ganknow: 'Gank' };
const pname = (p) => PLATFORM_NAME[p] || p;
// Livestream platforms only (owner 2026-10-08): donation, social and website links are not counted here.
const LIVE_PLATFORMS = ['youtube', 'twitch', 'tiktok', 'facebook', 'kick'];

function Bars({ rows, color = BRAND, unit = '' }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => (
        <li key={r.label} className="grid grid-cols-[minmax(0,8rem)_1fr_3.75rem] items-center gap-3 text-sm">
          <span className="truncate font-medium" title={r.label}>{r.label}</span>
          <span className="h-2.5 overflow-hidden rounded-full bg-deep"><span className="block h-full rounded-full" style={{ width: `${(r.value / max) * 100}%`, background: r.color || color }} /></span>
          <span className="text-right tabular-nums text-muted">{fmt(r.value)}{unit}</span>
        </li>
      ))}
    </ul>
  );
}

/** Vertical bars with value labels; the highlighted bar is brand pink, the rest lilac. */
function VBars({ rows, highlight, label, openYear }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="flex h-44 items-end gap-1.5" role="img" aria-label={label}>
      {rows.map((r) => {
        const open = openYear != null && String(r.label) === String(openYear);
        return (
          <div key={r.label} className="flex min-w-0 flex-1 flex-col items-center gap-1" data-incomplete-year={open ? 'true' : undefined}>
            <span className="text-[11px] tabular-nums text-muted">{fmt(r.value)}</span>
            <span className="w-full rounded-t-md" style={{ height: `${Math.max(2, (r.value / max) * 120)}px`, background: r.label === highlight ? BRAND : 'var(--color-lilac)', opacity: open ? 0.4 : (r.label === highlight ? 1 : 0.7), outline: open ? '1px dashed var(--color-faint)' : undefined }} />
            <span className="truncate text-[11px] text-faint">{r.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function TopAgencies({ d, total }) {
  const rows = (d.agencies || []).slice(0, 8).map((a) => ({ label: a.name, value: a.count }));
  if (!rows.length) return null;
  const members = rows.reduce((a, r) => a + r.value, 0);
  return (
    <InsightCard title={<>ค่ายที่สมาชิกเยอะที่สุด<br /><Hi>{rows[0].label}</Hi></>} coverage={subsetNote(members, total)} note="นับสมาชิกในทะเบียนของแต่ละสังกัด ไม่ใช่ยอดผู้ติดตาม">
      <Bars rows={rows} color="var(--color-lilac)" />
    </InsightCard>
  );
}

function IndieByPlatform({ d }) {
  const rows = (d.platform_breakdown || []).filter((r) => LIVE_PLATFORMS.includes(r.platform) && r.count >= 50 && Number.isFinite(r.independent))
    .map((r) => ({ label: pname(r.platform), value: Math.round((r.independent / r.count) * 100) }))
    .sort((a, b) => b.value - a.value).slice(0, 8);
  if (!rows.length) return null;
  return (
    <InsightCard title={<>แพลตฟอร์มที่วีอิสระเยอะสุด<br /><Hi>{rows[0].label} {rows[0].value}%</Hi></>} note="เฉพาะแพลตฟอร์มไลฟ์ (YouTube, Twitch, TikTok, Facebook, Kick) ที่มี 50 คนขึ้นไป ไม่นับแพลตฟอร์มโดเนต">
      <Bars rows={rows} unit="%" />
    </InsightCard>
  );
}

function FastestPlatform({ d, total }) {
  const yr = (r, y) => (r.debut_years || []).find((x) => x.year === y)?.count || 0;
  const years = (d.debut_trend || []).map((r) => r.year);
  const newest = years.at(-1);
  const skipOpen = isIncompleteYear(newest);
  const last = skipOpen ? years.at(-2) : newest;
  const prev = skipOpen ? years.at(-3) : years.at(-2);
  if (!last || !prev) return null;
  const rows = (d.platform_breakdown || []).filter((r) => LIVE_PLATFORMS.includes(r.platform))
    .map((r) => ({ label: pname(r.platform), a: yr(r, prev), b: yr(r, last) }))
    .filter((r) => r.a >= 5).map((r) => ({ ...r, value: Math.round(((r.b - r.a) / r.a) * 100) }))
    .sort((x, y) => y.value - x.value);
  if (!rows.length) return null;
  const sign = (v) => (v > 0 ? `+${v}` : `${v}`);
  return (
    <InsightCard title={rows[0].value > 0 ? <>เดบิวต์ปี {last} เทียบปี {prev}<br />โตสุดบน <Hi>{rows[0].label}</Hi></> : <>ปี {last} วีเดบิวต์น้อยลงเกือบทุกที่<br /><Hi>{rows[0].label}</Hi> ทรงตัวที่สุด</>} coverage={subsetNote(d.known_debut_year_count, total, Number.isFinite(d.known_debut_year_count) ? Math.max(total - d.known_debut_year_count, 0) : 0)} note={`เฉพาะแพลตฟอร์มไลฟ์ · จำนวนวีที่เดบิวต์บนแพลตฟอร์มนั้น (เท่าที่ทราบปีเดบิวต์) ${INCOMPLETE_YEAR_NOTE}`}>
      <ul className="space-y-2.5 text-sm">
        {rows.map((r) => (
          <li key={r.label} className="flex items-center justify-between gap-3 rounded-lg bg-deep/60 px-3 py-2">
            <span className="font-medium">{r.label}</span>
            <span className="tabular-nums text-muted">{fmt(r.a)} → {fmt(r.b)} <b className={r.value >= 0 ? 'text-mint' : 'text-peach'}>{sign(r.value)}%</b></span>
          </li>
        ))}
      </ul>
    </InsightCard>
  );
}

function PeakYear({ d, total }) {
  const t = (d.debut_trend || []).filter((r) => r.known_debuts > 0);
  if (!t.length) return null;
  const openYear = new Date().getFullYear();
  const pool = t.filter((r) => !isIncompleteYear(r.year));
  const peak = (pool.length ? pool : t).reduce((a, b) => (b.known_debuts > a.known_debuts ? b : a));
  return (
    <InsightCard title={<>ปีที่วีไทยเดบิวต์มากที่สุด<br />คือ <Hi>ปี {peak.year}</Hi> ({fmt(peak.known_debuts)} คน)</>} coverage={subsetNote(d.known_debut_year_count, total, Number.isFinite(d.known_debut_year_count) ? Math.max(total - d.known_debut_year_count, 0) : 0)} note={INCOMPLETE_YEAR_NOTE}>
      <VBars label="จำนวนเดบิวต์ต่อปี" highlight={String(peak.year)} openYear={openYear} rows={t.map((r) => ({ label: String(r.year), value: r.known_debuts }))} />
    </InsightCard>
  );
}

function SmallAgencies({ d, total }) {
  const sizes = d.agency_sizes || [];
  const agencies = sizes.reduce((a, r) => a + r.agencies, 0);
  const members = sizes.reduce((a, r) => a + (r.members || 0), 0);
  const one = sizes.find((r) => r.size === '1')?.agencies || 0;
  if (!agencies) return null;
  return (
    <InsightCard title={<>ค่าย <Hi>{pct(one, agencies)}%</Hi><br />มีสมาชิกคนเดียว</>} coverage={subsetNote(members, total)} note={`จากทั้งหมด ${fmt(agencies)} สังกัดที่มีสมาชิกในทะเบียน`}>
      <Bars rows={sizes.map((r) => ({ label: `${r.size} คน`, value: r.agencies }))} color="var(--color-sky)" unit=" ค่าย" />
    </InsightCard>
  );
}

function BigAgencyAvg({ ins, total }) {
  const c = Object.fromEntries(ins.tiers.map((t) => [t.tier, t.count]));
  const n = ins.big_agency_count || 0;
  if (!n) return null;
  return (
    <InsightCard title={<>ค่ายใหญ่ {n} ค่าย<br />รวมกันมี <Hi>{fmt(c.big)}</Hi> คน (เฉลี่ย {(c.big / n).toFixed(1)})</>} coverage={subsetNote(sumTiers(c), total)} note={TIER_NOTE}>
      <Donut size={140} label="สัดส่วนคนตามประเภทสังกัด" center={`${pct(c.big, sumTiers(c))}%`} sub="ค่ายใหญ่" segments={TIERS.map((t) => ({ label: TIER_LABEL[t], value: c[t] || 0, color: TIER_COLOR[t] }))} />
    </InsightCard>
  );
}

function UnderOneK({ ins, total }) {
  const order = ['<1K', '1K-10K', '10K-100K', '100K+'];
  const colors = { '<1K': BRAND, '1K-10K': 'var(--color-lilac)', '10K-100K': 'var(--color-sky)', '100K+': 'var(--color-lemon)' };
  const by = Object.fromEntries(ins.size_bands.map((x) => [x.band, sumTiers(x)]));
  const bandTotal = order.reduce((a, b) => a + (by[b] || 0), 0);
  if (!bandTotal) return null;
  return (
    <InsightCard title={<>ช่อง YouTube <Hi>{pct(by['<1K'], bandTotal)}%</Hi><br />ยังมีผู้ติดตามไม่ถึง 1K</>} coverage={subsetNote(bandTotal, total)} note={`ช่อง YouTube หลักของแต่ละคน ${fmt(bandTotal)} ช่อง · ทุกคนเริ่มจากศูนย์ ไปกดติดตามกันได้ ${YOUTUBE_MEASURE_NOTE}`}>
      <Donut size={140} label="ช่วงยอดผู้ติดตาม YouTube" center={fmt(by['<1K'])} sub="ช่องต่ำกว่า 1K" segments={order.map((b) => ({ label: BAND_LABEL[b], value: by[b] || 0, color: colors[b] }))} />
    </InsightCard>
  );
}

function AvgChannels({ d, total }) {
  const span = d.platform_span || [];
  const people = span.reduce((a, r) => a + r.count, 0);
  if (!people) return null;
  const avg = span.reduce((a, r) => a + r.platforms * r.count, 0) / people;
  const last = span.at(-1)?.platforms;
  return (
    <InsightCard title={<>วีไทยหนึ่งคน<br />มีเฉลี่ย <Hi>{avg.toFixed(1)}</Hi> ช่องทาง</>} coverage={subsetNote(people, total)} note="นับทุกแพลตฟอร์มที่ยืนยันแล้วของแต่ละคน">
      <VBars label="จำนวนช่องทางต่อคน" highlight="1" rows={span.map((r) => ({ label: r.platforms === last ? `${r.platforms}+` : String(r.platforms), value: r.count }))} />
      <p className="mt-2 text-center text-xs text-faint">จำนวนช่องทางต่อคน</p>
    </InsightCard>
  );
}

function Graduated({ d, total }) {
  const rows = (d.lifecycle || []).filter((r) => r.count > 0);
  const unknown = rows.filter((r) => r.status === 'unknown').reduce((a, r) => a + r.count, 0);
  const known = rows.filter((r) => r.status !== 'unknown');
  const knownTotal = known.reduce((a, r) => a + r.count, 0);
  const g = known.find((r) => r.status === 'graduated')?.count || 0;
  if (!g) return null;
  return (
    <InsightCard title={<>จบกิจกรรมแล้ว<br />อย่างน้อย <Hi>{fmt(g)}</Hi> คน</>} coverage={subsetNote(knownTotal, total || d.total_vtubers, unknown)} note="นับเฉพาะที่มีหลักฐานว่าจบกิจกรรม คนที่ไม่ทราบสถานะไม่ได้นับว่ายังทำอยู่">
      <Donut size={140} label="สถานะในทะเบียน" center={`${knownPercent(g, knownTotal)}%`} sub="จบกิจกรรม" segments={known.map((r) => ({ label: STATUS_LABELS[r.status] || r.status, value: r.count, color: r.status === 'graduated' ? 'var(--color-peach)' : 'var(--color-raised)' }))} />
    </InsightCard>
  );
}

function DebutCoverage({ d, total }) {
  const known = d.known_debut_year_count || 0;
  const all = total || d.total_vtubers;
  if (!all) return null;
  return (
    <InsightCard title={<>รู้ปีเดบิวต์แล้ว<br /><Hi>{pct(known, all)}%</Hi> ของทะเบียน</>} coverage={subsetNote(known, all, Math.max(all - known, 0))} note="ช่วยเติมปีเดบิวต์ได้ที่หน้าแจ้งข้อมูล">
      <Donut size={140} label="ความครบของปีเดบิวต์" center={fmt(known)} sub="คนที่รู้ปี" segments={[{ label: 'รู้ปีเดบิวต์', value: known, color: 'var(--color-mint)' }, { label: 'ยังไม่รู้', value: d.total_vtubers - known, color: 'var(--color-raised)' }]} />
    </InsightCard>
  );
}

export default function Insights({ ins, d }) {
  if (!ins) return null;
  const total = d?.total_vtubers;
  const knownDebut = d?.known_debut_year_count;
  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        <TierShare ins={ins} total={total} />
        <StillActive ins={ins} total={total} />
        <ActiveDots ins={ins} total={total} />
        <SmallChoices ins={ins} total={total} />
        <BandsByTier ins={ins} total={total} />
        <BandLines ins={ins} total={total} />
        <TierBands ins={ins} total={total} />
        <NewDebuts ins={ins} total={total} knownDebut={knownDebut} />
        <LiveWhere ins={ins} total={total} />
        {d && <>
          <TopAgencies d={d} total={total} />
          <IndieByPlatform d={d} />
          <FastestPlatform d={d} total={total} />
          <PeakYear d={d} total={total} />
          <SmallAgencies d={d} total={total} />
          <BigAgencyAvg ins={ins} total={total} />
          <UnderOneK ins={ins} total={total} />
          <AvgChannels d={d} total={total} />
          <Graduated d={d} total={total} />
          <DebutCoverage d={d} total={total} />
        </>}
      </div>
      <p className="mt-3 text-right text-xs text-faint">ข้อมูลประมาณการ ณ {ins.basis.data_as_of} · ไม่ควรใช้อ้างอิงทางวิชาการ</p>
    </>
  );
}
