import DataError from '../components/DataError.js';
import { useApiData } from '../lib/useApiData.js';
import { useState } from 'react';
import { ArrowRight, CalendarDays } from 'lucide-react';
import Layout, { PageTitle } from '../components/Layout.jsx';
import { SectionHeading } from '../components/brand.jsx';
import PlatformIcon from '../components/PlatformIcon.jsx';
import Insights from './insights.jsx';
import { BRAND, HelpTip, Legend, NEUTRAL, platformColor, RAMP, ShareBars, YearBars } from '../components/ui.jsx';
import { fetchOverview, fmt, formatDate, pct, platformLabel, STATUS_LABELS } from '../lib/api.js';
import { INCOMPLETE_YEAR_NOTE, countKnown, knownPercent, subsetNote } from '../lib/coverage.js';
import { ChangeBars, Donut, Heatmap, Lollipop, MultiLine, StackedShare, Treemap } from '../components/charts.jsx';

const icon = (p, size = 16) => <PlatformIcon name={p} size={size} />;
const byYear = (rows, key = 'count') => Object.fromEntries((rows || []).map((r) => [r.year, r[key]]));

function Section({ title, help, children }) {
  return (
    <section className="mx-auto mt-14 max-w-[1920px] px-4 sm:px-6 lg:px-8">
      <SectionHeading extra={help && <HelpTip>{help}</HelpTip>}>{title}</SectionHeading>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function Card({ title, help, aside, sub, className = '', children }) {
  return (
    <div className={`card card-hover p-5 sm:p-6 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-1 text-base">{title}{help && <HelpTip>{help}</HelpTip>}</h3>
        {aside}
      </div>
      {sub && <p className="mt-1 text-xs text-faint">{sub}</p>}
      <div className="mt-4">{children}</div>
    </div>
  );
}

function debutSub(d) {
  const known = d.known_debut_year_count;
  const total = d.total_vtubers;
  const coverage = Number.isFinite(known) && Number.isFinite(total) ? subsetNote(known, total, Math.max(total - known, 0)) : '';
  return [coverage, INCOMPLETE_YEAR_NOTE].filter(Boolean).join(' ');
}

const READ_THIS = [
  'นับเฉพาะ VTuber ที่สารบบรู้จัก คนที่อยู่แพลตฟอร์มเดียว (เช่น TikTok หรือ Facebook) อาจถูกนับน้อยกว่าจริง',
  'ช่องที่ถูกลบไปก่อนเราเริ่มเก็บข้อมูลไม่อยู่ในสถิติ ปีเก่าจึงอาจดูน้อยกว่าจริง',
  'ปีล่าสุดยังไม่ครบ ตัวเลขจะเพิ่มขึ้นเมื่อพบคนใหม่',
  'ขนาดและความเคลื่อนไหววัดจาก YouTube เป็นหลัก',
  'ตัวเลขบอกสิ่งที่เกิดขึ้น ไม่ได้บอกสาเหตุ',
];

function ReadThis() {
  return (
    <details className="card mx-auto mt-8 max-w-[1920px] px-5 py-4 sm:px-6 lg:px-8">
      <summary className="cursor-pointer text-base font-semibold text-ink">อ่านข้อมูลนี้อย่างไร</summary>
      <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-muted">
        {READ_THIS.map((line) => <li key={line}>{line}</li>)}
      </ul>
    </details>
  );
}

function KeyNumbers({ d }) {
  const span = d.platform_span || [];
  const multi = span.filter((r) => r.platforms >= 2).reduce((a, r) => a + r.count, 0);
  const spanTotal = span.reduce((a, r) => a + r.count, 0);
  const years = (d.debut_trend || []).filter((r) => r.year < new Date().getFullYear() && r.known_debuts > 0);
  const last = years.at(-1);
  const known = d.known_debut_year_count;
  const members = Number.isFinite(d.independent_count) ? d.total_vtubers - d.independent_count : null;
  const cards = [
    { value: fmt(d.total_vtubers), label: 'VTuber ไทยทั้งหมด' },
    Number.isFinite(d.independent_count) && { value: fmt(d.independent_count), label: 'วีอิสระ', badge: `${pct(d.independent_count, d.total_vtubers)}% ของทั้งหมด`, sub: subsetNote(d.independent_count, d.total_vtubers), hero: true },
    Number.isFinite(d.agency_total) && { value: fmt(d.agency_total), label: 'สังกัด', sub: [`มีสมาชิก ${fmt(members)} คน`, subsetNote(members, d.total_vtubers)].filter(Boolean).join(' ') },
    last && { value: fmt(last.known_debuts), label: `เดบิวต์ปี ${last.year}`, sub: ['เท่าที่ทราบปีเดบิวต์', subsetNote(last.known_debuts, d.total_vtubers, Number.isFinite(known) ? Math.max(d.total_vtubers - known, 0) : 0)].filter(Boolean).join(' ') },
    span.length > 0 && { value: `${pct(multi, d.total_vtubers)}%`, label: 'มีมากกว่าหนึ่งช่องทาง', sub: subsetNote(spanTotal, d.total_vtubers), sky: true },
  ].filter(Boolean);
  return (
    <ul className="mx-auto mt-8 grid max-w-[1920px] grid-flow-row-dense grid-cols-2 gap-4 px-4 sm:px-6 md:grid-cols-3 lg:grid-cols-5 lg:px-8">
      {cards.map((c) => (
        <li key={c.label} className={`card card-hover tilt relative overflow-hidden p-5 ${c.hero ? 'tile-hero col-span-2 md:col-span-1' : 'tile'}`}>
          {c.hero && <span className="pointer-events-none absolute -bottom-4 -right-4 size-20 rounded-full bg-brand/15 blur-xl" aria-hidden="true" />}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className={`text-sm font-semibold ${c.hero ? 'text-brand' : 'text-muted'}`}>{c.label}</p>
            {c.badge && <span className="rounded-full border border-brand/40 bg-brand/15 px-2 py-0.5 text-[11px] font-bold text-brand">{c.badge}</span>}
          </div>
          <p data-countup className={`mt-1 font-display text-[2.5rem] leading-tight tabular-nums ${c.hero ? 'text-brand' : c.sky ? 'text-sky' : 'text-ink'}`}>{c.value}</p>
          {c.sub && <p className="mt-0.5 text-xs text-faint">{c.sub}</p>}
        </li>
      ))}
    </ul>
  );
}

function GrowthLine({ rows, openYear }) {
  const pts = (rows || []).filter((r) => r.cumulative_known_debuts > 0);
  if (pts.length < 2) return <p className="text-sm text-muted">ข้อมูลยังไม่พอวาดกราฟ</p>;
  const W = 600, H = 200, pad = 8;
  const max = pts.at(-1).cumulative_known_debuts;
  const xy = pts.map((r, i) => [pad + (i * (W - 2 * pad)) / (pts.length - 1), H - pad - (r.cumulative_known_debuts / max) * (H - 2 * pad)]);
  const lastOpen = openYear != null && Number(pts.at(-1).year) === Number(openYear);
  const solid = lastOpen ? xy.slice(0, -1) : xy;
  const line = xy.map((p) => p.join(',')).join(' ');
  const solidLine = solid.map((p) => p.join(',')).join(' ');
  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-36 w-full" role="img" aria-label={`จำนวนสะสมเพิ่มจาก ${fmt(pts[0].cumulative_known_debuts)} เป็น ${fmt(max)} คน`}>
        <defs>
          <linearGradient id="growth" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor={BRAND} stopOpacity="0.35" />
            <stop offset="1" stopColor={BRAND} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={`${xy[0][0]},${H - pad} ${line} ${xy.at(-1)[0]},${H - pad}`} fill="url(#growth)" opacity={lastOpen ? 0.55 : 1} />
        {solid.length > 1 && <polyline points={solidLine} fill="none" stroke={BRAND} strokeWidth="2.5" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />}
        {lastOpen && <line x1={xy.at(-2)[0]} y1={xy.at(-2)[1]} x2={xy.at(-1)[0]} y2={xy.at(-1)[1]} stroke={BRAND} strokeWidth="2.5" strokeDasharray="5 4" opacity="0.45" vectorEffect="non-scaling-stroke" />}
        {xy.map(([x, y], i) => <circle key={pts[i].year} cx={x} cy={y} r="3.5" fill={BRAND} opacity={lastOpen && i === xy.length - 1 ? 0.45 : 1}><title>{`${pts[i].year}: ${fmt(pts[i].cumulative_known_debuts)}`}</title></circle>)}
      </svg>
      <div className="mt-1 flex justify-between text-[11px] tabular-nums text-faint" aria-hidden="true">
        <span>{pts[0].year}</span><span>{pts.at(-1).year}</span>
      </div>
    </figure>
  );
}

function WholeIndustry({ d }) {
  const all = byYear(d.debut_trend, 'known_debuts');
  const indie = byYear(d.independent_debut_trend);
  const years = Object.keys(all).map(Number).filter((y) => all[y] > 0).sort();
  const split = (d.independent_debut_trend || []).length > 0;
  const agency = Object.fromEntries(years.map((y) => [y, Math.max((all[y] || 0) - (indie[y] || 0), 0)]));
  const breakdown = d.platform_breakdown || (d.platforms || []).map((p) => ({ platform: p.platform, count: p.count }));
  const openYear = new Date().getFullYear();
  const yearNote = debutSub(d);
  const members = (d.agency_sizes || []).reduce((a, r) => a + (r.members || 0), 0);
  return (
    <Section title="ทั้งวงการ">
      <div className="grid gap-4 md:grid-cols-3 2xl:grid-cols-4">
        <Card
          title="เดบิวต์ต่อปี"
          sub={yearNote}
          aside={split && <Legend items={[{ label: 'วีอิสระ', color: BRAND }, { label: 'มีสังกัด', color: NEUTRAL }]} />}
        >
          <YearBars label="เดบิวต์ต่อปี" years={years} openYear={openYear} series={split ? [{ key: 'i', color: BRAND, values: indie }, { key: 'a', color: NEUTRAL, values: agency }] : [{ key: 'all', color: BRAND, values: all }]} />
        </Card>
        <Card title="จำนวนสะสม" help="จำนวนวีที่ทราบปีเดบิวต์ รวมสะสมตั้งแต่ปีแรก" sub={yearNote}>
          <GrowthLine rows={d.debut_trend} openYear={openYear} />
        </Card>
        <Card title="เปลี่ยนแปลงจากปีก่อน" help="จำนวนเดบิวต์ปีนี้ลบปีก่อน แท่งสีชมพูคือปีที่เดบิวต์น้อยลง" sub={yearNote}>
          <ChangeBars label="จำนวนเดบิวต์ที่เพิ่มหรือลดจากปีก่อน" openYear={openYear} points={years.map((y) => ({ year: y, value: all[y] }))} />
        </Card>
        <Card title="สัดส่วนวีอิสระในคนเดบิวต์แต่ละปี" help="วีอิสระที่เดบิวต์ปีนั้น หารด้วยทุกคนที่เดบิวต์ปีนั้น (เท่าที่ทราบปีเดบิวต์)" sub={yearNote} className="md:col-span-3 2xl:col-span-1">
          <IndieShareBars years={years} all={all} indie={indie} openYear={openYear} />
        </Card>
        <Card
          className="md:col-span-3"
          title="อยู่บนแพลตฟอร์มไหน"
          help="หนึ่งคนอยู่ได้หลายแพลตฟอร์ม ผลรวมจึงเกินจำนวนวีทั้งหมด"
          aside={d.platform_breakdown && <Legend items={[{ label: 'สีเข้ม = วีอิสระ', color: 'var(--color-ink)' }, { label: 'สีจาง = มีสังกัด', color: 'var(--color-ink)', faded: true }]} />}
        >
          <div className="grid gap-x-12 gap-y-3 md:grid-cols-2">
            {[breakdown.slice(0, 6), breakdown.slice(6, 12)].map((rows, col) => (
              <ShareBars
                key={col}
                max={breakdown[0]?.count}
                rows={rows.map((r, i) => ({ key: r.platform, name: platformLabel(r.platform), label: icon(r.platform), value: r.count, part: r.independent, color: platformColor(r.platform) }))}
              />
            ))}
          </div>
        </Card>
        <Card title="ค่ายมีขนาดแค่ไหน" help="จำนวนสังกัดแบ่งตามจำนวนสมาชิกในทะเบียน" sub={subsetNote(members, d.total_vtubers)} className="md:col-span-3 2xl:col-span-1">
          <Donut
            size={150}
            label="จำนวนสังกัดตามขนาด"
            center={fmt(d.agency_total)}
            sub="สังกัด"
            segments={(d.agency_sizes || []).map((r, i) => ({ label: `สมาชิก ${r.size} คน`, value: r.agencies, color: RAMP[i % RAMP.length] }))}
          />
        </Card>
      </div>
    </Section>
  );
}

/** Independent share of each year's known debuts, as labelled vertical bars. */
function IndieShareBars({ years, all, indie, openYear }) {
  const rows = years.filter((y) => all[y] >= 5).map((y) => ({ y, v: Math.round(((indie[y] || 0) / all[y]) * 100) }));
  return (
    <div className="flex h-40 items-end gap-1.5" role="img" aria-label="สัดส่วนวีอิสระในคนเดบิวต์แต่ละปี">
      {rows.map((r) => {
        const open = openYear != null && Number(r.y) === Number(openYear);
        return (
          <div key={r.y} className="flex flex-1 flex-col items-center gap-1" data-incomplete-year={open ? 'true' : undefined}>
            <span className="text-[11px] tabular-nums text-muted">{r.v}%</span>
            <span className="w-full rounded-t-md bg-brand" style={{ height: `${Math.max(2, r.v * 1.05)}px`, opacity: open ? 0.35 : 0.45 + r.v / 200, outline: open ? '1px dashed var(--color-faint)' : undefined }} />
            <span className="text-[11px] text-faint">{String(r.y).slice(2)}</span>
          </div>
        );
      })}
    </div>
  );
}

function PlatformInsights({ d }) {
  const rows = d.platform_breakdown || [];
  if (!rows.length) return null;
  const top = rows.slice(0, 6);
  const years = [...new Set(top.flatMap((r) => (r.debut_years || []).map((y) => y.year)))].sort();
  const colorOf = (r) => platformColor(r.platform);
  const openYear = new Date().getFullYear();
  const yearNote = debutSub(d);
  const cumulative = top.slice(0, 5).map((r, i) => {
    let run = 0;
    const m = byYear(r.debut_years);
    return { key: r.platform, name: platformLabel(r.platform), label: icon(r.platform, 14), color: colorOf(r, i), points: years.map((y) => ({ x: y, y: (run += m[y] || 0) })) };
  });
  return (
    <Section title="ภาพรวมแพลตฟอร์ม">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        <Card title="ขนาดของแต่ละแพลตฟอร์ม" help="พื้นที่ของแต่ละช่องตามจำนวนวีไทยที่อยู่บนแพลตฟอร์มนั้น">
          <Treemap label="จำนวนวีไทยต่อแพลตฟอร์ม" items={rows.slice(0, 10).map((r, i) => ({ key: r.platform, name: platformLabel(r.platform), icon: <PlatformIcon name={r.platform} size={18} mono />, value: r.count, color: colorOf(r, i) }))} />
        </Card>
        <Card title="แพลตฟอร์มไหนวีอิสระเยอะ" help="สัดส่วนวีอิสระในแต่ละแพลตฟอร์ม เรียงจากมากไปน้อย">
          <Lollipop
            label="สัดส่วนวีอิสระต่อแพลตฟอร์ม"
            rows={rows.slice(0, 10).map((r, i) => ({ key: r.platform, name: platformLabel(r.platform), label: icon(r.platform), value: pct(r.independent, r.count) ?? 0, color: colorOf(r, i) })).sort((a, b) => b.value - a.value)}
          />
        </Card>
        <Card title="โตสะสมบนแต่ละแพลตฟอร์ม" sub={yearNote} aside={<Legend items={cumulative.map((c) => ({ key: c.key, name: c.name, label: c.label, color: c.color }))} />}>
          <MultiLine label="จำนวนสะสมของวีที่ทราบปีเดบิวต์ แยกตามแพลตฟอร์ม" series={cumulative} openYear={openYear} />
        </Card>
        <Card className="md:col-span-2" title="เดบิวต์แต่ละปี บนแต่ละแพลตฟอร์ม" help="ตัวเลขในช่องคือจำนวนวีที่เดบิวต์ปีนั้นและมีช่องบนแพลตฟอร์มนั้น สีเข้มคือปีที่มากที่สุดของแพลตฟอร์มนั้น" sub={yearNote}>
          <Heatmap label="ตารางความร้อน แพลตฟอร์มกับปีเดบิวต์" cols={years} openYear={openYear} rows={top.map((r) => ({ key: r.platform, name: platformLabel(r.platform), label: icon(r.platform), color: colorOf(r), values: byYear(r.debut_years) }))} />
        </Card>
        <Card title="สัดส่วนแพลตฟอร์มของรุ่นเดบิวต์" help="ในวีที่เดบิวต์แต่ละปี มีช่องทางบนแพลตฟอร์มไหนบ้าง คิดเป็นสัดส่วนเต็ม 100%" sub={yearNote} aside={<Legend items={top.slice(0, 5).map((r) => ({ key: r.platform, name: platformLabel(r.platform), label: icon(r.platform, 14), color: colorOf(r) }))} />}>
          <StackedShare label="สัดส่วนแพลตฟอร์มในแต่ละปีเดบิวต์" openYear={openYear} xs={years.filter((y) => top.some((r) => byYear(r.debut_years)[y] > 2))} layers={top.slice(0, 5).map((r) => ({ key: r.platform, name: platformLabel(r.platform), label: r.platform, color: colorOf(r), values: byYear(r.debut_years) }))} />
        </Card>
      </div>
    </Section>
  );
}

function ByPlatform({ d }) {
  const rows = (d.platform_breakdown || []).slice(0, 8);
  const [sel, setSel] = useState(rows[0]?.platform);
  if (!rows.length) return null;
  const r = rows.find((x) => x.platform === sel) || rows[0];
  const i = rows.indexOf(r);
  const color = platformColor(r.platform);
  const years = (r.debut_years || []).filter((y) => y.count > 0);
  const yearCount = years.reduce((a, y) => a + y.count, 0);
  const openYear = new Date().getFullYear();
  return (
    <Section title="แยกตามแพลตฟอร์ม">
      <div role="tablist" aria-label="แพลตฟอร์ม" className="flex flex-wrap gap-2">
        {rows.map((x) => (
          <button key={x.platform} role="tab" type="button" id={`tab-${x.platform}`} aria-selected={x.platform === r.platform} aria-controls="platform-panel" className="chip !min-h-10 !px-3.5" title={platformLabel(x.platform)} onClick={() => setSel(x.platform)}>
            <PlatformIcon name={x.platform} size={16} mono={x.platform === r.platform} />
            <span className="hidden sm:inline">{platformLabel(x.platform)}</span>
            <span className="text-xs tabular-nums opacity-70">{fmt(x.count)}</span>
          </button>
        ))}
      </div>
      <div id="platform-panel" role="tabpanel" aria-labelledby={`tab-${r.platform}`} className="card mt-4 grid gap-6 p-5 sm:p-6 lg:grid-cols-[2fr_3fr]">
        <div>
          <p className="flex items-center gap-2 text-lg"><PlatformIcon name={r.platform} size={22} />{platformLabel(r.platform)}</p>
          <p className="mt-2 font-display text-[2.5rem] leading-tight tabular-nums text-brand">{fmt(r.count)}</p>
          <p className="text-muted">วีไทยบน {platformLabel(r.platform)} คิดเป็น {pct(r.count, d.total_vtubers)}% ของทั้งหมด</p>
          <p className="mt-1 text-xs text-faint">{subsetNote(r.count, d.total_vtubers)}</p>
          <div className="mt-6">
            <Donut size={132} label={`วีอิสระกับวีมีสังกัดบน ${platformLabel(r.platform)}`} center={`${pct(r.independent, r.count)}%`} sub="วีอิสระ" segments={[{ label: 'วีอิสระ', value: r.independent, color }, { label: 'มีสังกัด', value: r.count - r.independent, color: NEUTRAL }]} />
          </div>
          <a href={`/directory?platform=${encodeURIComponent(r.platform)}&scope=independent`} className="btn btn-secondary mt-6">
            ดูวีอิสระบน {platformLabel(r.platform)} <ArrowRight size={15} aria-hidden="true" />
          </a>
        </div>
        <div>
          <h3 className="flex items-center gap-1.5 text-base">เดบิวต์ต่อปีบน {platformLabel(r.platform)}<HelpTip>นับเฉพาะคนที่ทราบปีเดบิวต์</HelpTip></h3>
          <p className="mt-1 text-xs text-faint">{[subsetNote(yearCount, d.total_vtubers, Math.max(r.count - yearCount, 0)), INCOMPLETE_YEAR_NOTE].filter(Boolean).join(' ')}</p>
          <div className="mt-5">
            {years.length ? <YearBars label={`เดบิวต์ต่อปีบน ${platformLabel(r.platform)}`} years={years.map((y) => y.year)} openYear={openYear} series={[{ key: 'p', color, values: byYear(years) }]} height={170} /> : <p className="text-sm text-muted">ยังไม่มีข้อมูลปีเดบิวต์บนแพลตฟอร์มนี้</p>}
          </div>
        </div>
      </div>
    </Section>
  );
}

function IndieVsAgency({ d }) {
  const sizes = d.agency_sizes || [];
  const maxMembers = Math.max(...sizes.map((s) => s.members), d.independent_count || 0, 1);
  const span = d.platform_span || [];
  const spanTotal = span.reduce((a, r) => a + r.count, 0) || 1;
  const life = (d.lifecycle || []).filter((r) => r.count > 0);
  const placed = (d.independent_count || 0) + sizes.reduce((a, s) => a + (s.members || 0), 0);
  const { counted: knownStatus, unknown: unknownStatus } = countKnown(life);
  return (
    <Section title="วีอิสระกับค่าย" help="ไม่มีการจัดอันดับค่าย เราแสดงเฉพาะว่าค่ายขนาดไหนมีกี่แห่ง เพราะอยากให้คนเห็นวีตัวเล็กมากกว่า">
      <div className="grid gap-4 lg:grid-cols-3">
        {sizes.length > 0 && (
          <Card title="วีอยู่ที่ไหนกันบ้าง" sub={subsetNote(placed, d.total_vtubers)} className="lg:col-span-2">
            <ul className="space-y-4">
              {[{ label: 'ไม่มีสังกัด', note: 'วีอิสระ', members: d.independent_count, color: BRAND },
                ...sizes.map((s, i) => ({ label: `ค่าย ${s.size} คน`, note: `${fmt(s.agencies)} ค่าย`, members: s.members, color: NEUTRAL }))].map((row) => (
                <li key={row.label} className="grid grid-cols-[7rem_1fr_4rem] items-center gap-3 text-sm">
                  <span>{row.label}<span className="block text-xs text-faint">{row.note}</span></span>
                  <span className="h-2.5 rounded-full bg-deep" aria-hidden="true"><span className="bar-grow block h-full rounded-full" style={{ width: `${(row.members / maxMembers) * 100}%`, background: row.color }} /></span>
                  <span className="text-right tabular-nums text-muted">{fmt(row.members)} คน</span>
                </li>
              ))}
            </ul>
          </Card>
        )}
        <div className="flex flex-col gap-4">
        {span.length > 0 && (
          <Card title="มีกี่ช่องทาง" help="นับช่องทางทางการที่ตรวจแล้วของแต่ละคน" sub={subsetNote(spanTotal, d.total_vtubers)}>
            <Donut size={132} label="จำนวนช่องทางต่อคน" center={`${knownPercent(span.filter((r) => r.platforms >= 2).reduce((x, r) => x + r.count, 0), spanTotal)}%`} sub="มีหลายช่องทาง" segments={span.map((r, i) => ({ label: r.platforms >= 5 ? '5 ช่องทางขึ้นไป' : `${r.platforms} ช่องทาง`, value: r.count, color: RAMP[Math.min(i, RAMP.length - 1)] }))} />
          </Card>
        )}
        <Card title="สถานะ" help="จากสถานะที่ตรวจแล้ว ไม่ได้เดาจากโพสต์ล่าสุด คนที่จบกิจกรรมยังอยู่ในสารบบ เพราะเป็นส่วนหนึ่งของประวัติวงการ" sub={subsetNote(knownStatus, d.total_vtubers, unknownStatus)}>
          <ul className="space-y-2 text-sm">
            {life.map((r) => (
              <li key={r.status} className="flex justify-between"><span>{STATUS_LABELS[r.status] || r.status}</span><span className="tabular-nums text-muted">{fmt(r.count)}</span></li>
            ))}
          </ul>
        </Card>
        </div>
      </div>
    </Section>
  );
}

export default function Analytics() {
  const { data: d, error, retry: load } = useApiData(fetchOverview);
  const updated = formatDate(d?.meta?.generated_at);
  return (
    <Layout>
      <PageTitle
        title="ข้อมูลวงการ VTuber ไทย"
        aside={updated ? <p className="flex w-fit items-center gap-2 rounded-xl border border-line bg-card px-4 py-2 text-sm text-muted"><CalendarDays size={16} className="text-brand" aria-hidden="true" />อัปเดต {updated}</p> : null}
      />
      <ReadThis />
      {error && (
        <div className="mx-auto mt-8 max-w-[1920px] px-4 sm:px-6 lg:px-8">
          <DataError onRetry={load} />
        </div>
      )}
      {!d && !error && <div className="mx-auto mt-8 max-w-[1920px] px-4 sm:px-6 lg:px-8"><div className="h-96 animate-pulse rounded-[1.25rem] bg-card" aria-label="กำลังโหลดข้อมูล" /></div>}
      {d && (
        <>
          <KeyNumbers d={d} />
          {d.insights && <Section title="สิ่งที่ข้อมูลบอก"><Insights ins={d.insights} d={d} /></Section>}
          <WholeIndustry d={d} />
          <ByPlatform d={d} />
          <IndieVsAgency d={d} />
        </>
      )}
    </Layout>
  );
}
