// Small dependency-free SVG/HTML charts for the analytics page. Every chart carries an accessible label
// and a visually hidden table so the numbers are readable without the picture.
import { fmt } from '../lib/api.js';

function SrTable({ caption, rows }) {
  return (
    <table className="sr-only">
      <caption>{caption}</caption>
      <tbody>{rows.map(([k, v]) => <tr key={k}><th>{k}</th><td>{v}</td></tr>)}</tbody>
    </table>
  );
}

/** Donut: segments [{label, value, color}], centre text optional. */
export function Donut({ segments, label, center, sub, size = 168 }) {
  const total = segments.reduce((a, s) => a + s.value, 0) || 1;
  const r = 15.915; // circumference 100
  let offset = 25;
  return (
    <figure className="flex flex-wrap items-center gap-6">
      <svg viewBox="0 0 42 42" width={size} height={size} role="img" aria-label={label} className="shrink-0">
        <circle cx="21" cy="21" r={r} fill="none" stroke="var(--color-deep)" strokeWidth="5.5" />
        {segments.map((s) => {
          const len = (s.value / total) * 100;
          const el = <circle key={s.label} cx="21" cy="21" r={r} fill="none" stroke={s.color} strokeWidth="5.5" strokeDasharray={`${len} ${100 - len}`} strokeDashoffset={offset}><title>{`${s.label}: ${fmt(s.value)}`}</title></circle>;
          offset -= len;
          return el;
        })}
        {center && <text x="21" y={sub ? 21 : 22.5} textAnchor="middle" className="fill-ink font-display" fontSize="6.5">{center}</text>}
        {sub && <text x="21" y="26.5" textAnchor="middle" className="fill-[var(--color-faint)]" fontSize="3">{sub}</text>}
      </svg>
      <ul className="min-w-36 flex-1 space-y-1.5 text-sm">
        {segments.map((s) => (
          <li key={s.label} className="flex items-center gap-2">
            <span className="size-2.5 shrink-0 rounded-full" style={{ background: s.color }} aria-hidden="true" />
            <span>{s.label}</span>
            <span className="ml-auto tabular-nums text-muted">{Math.round((s.value / total) * 100)}%</span>
          </li>
        ))}
      </ul>
      <SrTable caption={label} rows={segments.map((s) => [s.label, s.value])} />
    </figure>
  );
}

/** Waffle: 100 squares, parts [{label, value, color}]; each square ≈ 1%. */
export function Waffle({ parts, label }) {
  const total = parts.reduce((a, p) => a + p.value, 0) || 1;
  const cells = [];
  let acc = 0;
  parts.forEach((p, i) => {
    const target = i === parts.length - 1 ? 100 : Math.round(((acc + p.value) / total) * 100);
    while (cells.length < target) cells.push(p.color);
    acc += p.value;
  });
  return (
    <figure>
      <div className="w-fit rounded-xl border border-line bg-paper p-3">
        <div className="grid w-52 max-w-full grid-cols-10 gap-1" role="img" aria-label={label}>
          {cells.map((c, i) => <span key={i} className="aspect-square rounded-[3px]" style={{ background: c }} />)}
        </div>
      </div>
      <figcaption className="mt-3 space-y-1 text-sm">
        {parts.map((p) => (
          <p key={p.label} className="flex items-center gap-2">
            <span className="size-2.5 rounded-full" style={{ background: p.color }} aria-hidden="true" />
            {p.label}<span className="ml-auto pl-4 tabular-nums text-muted">{fmt(p.value)} คน</span>
          </p>
        ))}
      </figcaption>
    </figure>
  );
}

/** Year-over-year change as bars above/below a zero line. points [{year, value}] */
export function ChangeBars({ points, label, color = 'var(--color-brand)', negative = 'var(--color-neutral)', height = 140, openYear }) {
  const deltas = points.slice(1).map((p, i) => ({ year: p.year, d: p.value - points[i].value }));
  const max = Math.max(...deltas.map((x) => Math.abs(x.d)), 1);
  const open = (year) => openYear != null && Number(year) === Number(openYear);
  return (
    <figure aria-label={label}>
      <div className="relative flex gap-1.5" style={{ height }}>
        <span className="absolute inset-x-0 top-1/2 h-px bg-line" aria-hidden="true" />
        {deltas.map((x) => (
          <div key={x.year} className="relative flex-1" title={`${x.year}: ${x.d > 0 ? '+' : ''}${fmt(x.d)}`} data-incomplete-year={open(x.year) ? 'true' : undefined}>
            <span
              className="absolute inset-x-0 mx-auto w-full max-w-9 rounded-sm"
              style={{ background: x.d >= 0 ? color : negative, height: `${(Math.abs(x.d) / max) * 50}%`, opacity: open(x.year) ? 0.4 : 1, outline: open(x.year) ? '1px dashed var(--color-faint)' : undefined, ...(x.d >= 0 ? { bottom: '50%' } : { top: '50%' }) }}
            />
            <span className={`absolute inset-x-0 text-center text-[11px] tabular-nums text-muted ${x.d >= 0 ? 'top-[52%]' : 'bottom-[52%]'}`} style={{ opacity: open(x.year) ? 0.55 : 1 }}>{x.d > 0 ? '+' : ''}{fmt(x.d)}</span>
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex gap-1.5" aria-hidden="true">
        {deltas.map((x) => <span key={x.year} className="flex-1 text-center text-[11px] tabular-nums text-faint" style={{ opacity: open(x.year) ? 0.55 : 1 }}>{String(x.year).slice(2)}</span>)}
      </div>
      <SrTable caption={label} rows={deltas.map((x) => [x.year, x.d])} />
    </figure>
  );
}

/** Treemap (squarified-ish slice layout): items [{label, value, color}] */
export function Treemap({ items, label, height = 200 }) {
  const total = items.reduce((a, i) => a + i.value, 0) || 1;
  // Split into two rows of roughly equal area so tiles stay readable.
  const rows = [[], []];
  let first = 0;
  for (const it of items) {
    if (first < total / 2 || rows[1].length === 0 && rows[0].length < 2) { rows[0].push(it); first += it.value; } else rows[1].push(it);
  }
  return (
    <figure aria-label={label}>
      <div className="flex flex-col gap-1" style={{ height }}>
        {rows.filter((r) => r.length).map((row, ri) => {
          const sum = row.reduce((a, i) => a + i.value, 0);
          return (
            <div key={ri} className="flex min-h-0 gap-1" style={{ flexGrow: sum }}>
              {row.map((it) => (
                <div key={it.key ?? it.label} className="flex min-w-0 flex-col justify-between overflow-hidden rounded-md p-2" style={{ flexGrow: it.value, background: it.color, color: 'var(--color-paper)' }} title={`${it.name ?? it.label}: ${fmt(it.value)}`}>
                  <span className="truncate text-sm font-semibold leading-tight">{it.icon ?? it.label}</span>
                  <span className="truncate text-xs tabular-nums opacity-80">{fmt(it.value)}</span>
                </div>
              ))}
            </div>
          );
        })}
      </div>
      <SrTable caption={label} rows={items.map((i) => [i.name ?? i.label, i.value])} />
    </figure>
  );
}

/** Lollipop: rows [{label, value (0-100), color}] sorted, with a shared 0–100% axis. */
export function Lollipop({ rows, label, unit = '%' }) {
  return (
    <figure aria-label={label}>
      <ul className="space-y-3">
        {rows.map((r) => (
          <li key={r.key ?? r.label} className="grid grid-cols-[1.75rem_1fr_2.75rem] items-center gap-3 text-sm" title={r.name}>
            <span className="truncate">{r.label}</span>
            <span className="relative h-px bg-line" aria-hidden="true">
              <span className="absolute left-0 top-0 h-px" style={{ width: `${r.value}%`, background: r.color }} />
              <span className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ left: `${r.value}%`, background: r.color }} />
            </span>
            <span className="text-right tabular-nums text-muted">{r.value}{unit}</span>
          </li>
        ))}
      </ul>
      <SrTable caption={label} rows={rows.map((r) => [r.name ?? r.label, `${r.value}${unit}`])} />
    </figure>
  );
}

/** Heatmap: rows [{label, color, values: {col: n}}] × cols. Cell opacity follows the row's own peak. */
export function Heatmap({ rows, cols, label, openYear }) {
  const open = (year) => openYear != null && Number(year) === Number(openYear);
  return (
    <figure aria-label={label} className="overflow-x-auto">
      <table className="w-full min-w-[420px] border-separate border-spacing-1 text-xs">
        <thead>
          <tr>
            <th className="w-10" />
            {cols.map((c) => <th key={c} scope="col" className="font-normal tabular-nums text-faint" style={{ opacity: open(c) ? 0.45 : 1 }}>{String(c).slice(2)}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const peak = Math.max(...cols.map((c) => r.values[c] || 0), 1);
            return (
              <tr key={r.key ?? r.label}>
                <th scope="row" className="pr-1 text-left text-sm font-normal" title={r.name}>{r.label}</th>
                {cols.map((c) => {
                  const v = r.values[c] || 0;
                  return (
                    <td key={c} className="h-7 rounded text-center tabular-nums" data-incomplete-year={open(c) ? 'true' : undefined} style={{ background: v ? r.color : 'var(--color-deep)', opacity: open(c) ? 0.35 : (v ? 0.25 + 0.75 * (v / peak) : 1), outline: open(c) ? '1px dashed var(--color-faint)' : undefined, color: v / peak > 0.55 ? 'var(--color-paper)' : 'var(--color-ink)' }} title={`${r.name ?? ''} ${c}: ${fmt(v)}`}>
                      {v ? fmt(v) : ''}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </figure>
  );
}

/** Multi-line chart: series [{label, color, points: [{x, y}]}] sharing x and a 0-based y. */
export function MultiLine({ series, label, height = 170, openYear }) {
  const xs = [...new Set(series.flatMap((s) => s.points.map((p) => p.x)))].sort((a, b) => a - b);
  if (xs.length < 2) return <p className="text-sm text-muted">ข้อมูลยังไม่พอวาดกราฟ</p>;
  const max = Math.max(...series.flatMap((s) => s.points.map((p) => p.y)), 1);
  const W = 600, H = 220, pad = 10;
  const X = (x) => pad + ((xs.indexOf(x)) * (W - 2 * pad)) / (xs.length - 1);
  const Y = (y) => H - pad - (y / max) * (H - 2 * pad);
  const lastOpen = openYear != null && Number(xs.at(-1)) === Number(openYear);
  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }} role="img" aria-label={label}>
        {[0.25, 0.5, 0.75].map((t) => <line key={t} x1={pad} x2={W - pad} y1={Y(max * t)} y2={Y(max * t)} stroke="var(--color-line)" strokeDasharray="3 5" />)}
        {series.map((s) => {
          const pts = s.points.map((p) => [X(p.x), Y(p.y)]);
          const solid = lastOpen ? pts.slice(0, -1) : pts;
          return (
            <g key={s.key ?? s.label}>
              {solid.length > 1 && <polyline points={solid.map((p) => p.join(',')).join(' ')} fill="none" stroke={s.color} strokeWidth="2.25" strokeLinejoin="round" vectorEffect="non-scaling-stroke"><title>{s.name ?? s.label}</title></polyline>}
              {lastOpen && pts.length > 1 && <line x1={pts.at(-2)[0]} y1={pts.at(-2)[1]} x2={pts.at(-1)[0]} y2={pts.at(-1)[1]} stroke={s.color} strokeWidth="2.25" strokeDasharray="5 4" opacity="0.45" vectorEffect="non-scaling-stroke" />}
            </g>
          );
        })}
      </svg>
      <div className="mt-1 flex justify-between text-[11px] tabular-nums text-faint" aria-hidden="true"><span>{xs[0]}</span><span>{xs.at(-1)}</span></div>
      <SrTable caption={label} rows={series.map((s) => [s.name ?? s.label, s.points.at(-1)?.y ?? 0])} />
    </figure>
  );
}

/** 100% stacked area: layers [{label, color, values: {x: n}}] over xs; each x column sums to 100%. */
export function StackedShare({ layers, xs, label, height = 170, openYear }) {
  const W = 600, H = 220;
  const totals = xs.map((x) => layers.reduce((a, l) => a + (l.values[x] || 0), 0) || 1);
  const X = (i) => xs.length < 2 ? 0 : (i * W) / (xs.length - 1);
  const openIndex = xs.findIndex((x) => openYear != null && Number(x) === Number(openYear));
  let base = xs.map(() => 0);
  const shapes = layers.map((l) => {
    const top = xs.map((x, i) => base[i] + (l.values[x] || 0) / totals[i]);
    const pts = [...xs.map((_, i) => `${X(i)},${H - top[i] * H}`), ...xs.map((_, i) => `${X(xs.length - 1 - i)},${H - base[xs.length - 1 - i] * H}`)].join(' ');
    base = top;
    return { l, pts };
  });
  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full rounded-md" style={{ height }} role="img" aria-label={label}>
        {shapes.map(({ l, pts }) => <polygon key={l.key ?? l.label} points={pts} fill={l.color} opacity="0.9"><title>{l.name ?? l.label}</title></polygon>)}
        {openIndex >= 0 && <line x1={X(openIndex)} x2={X(openIndex)} y1="0" y2={H} stroke="var(--color-faint)" strokeDasharray="4 4" strokeWidth="2" />}
      </svg>
      <div className="mt-1 flex justify-between text-[11px] tabular-nums text-faint" aria-hidden="true"><span>{xs[0]}</span><span style={{ opacity: openIndex === xs.length - 1 ? 0.55 : 1 }}>{xs.at(-1)}</span></div>
    </figure>
  );
}
