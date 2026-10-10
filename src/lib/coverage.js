// Plain JS so node --test can import it. Copy for subset charts on the data page.
import { fmt, pct } from './api.js';

export const UNKNOWN_EXCLUDED = 'ไม่นับค่าที่ไม่ทราบ';
export const INCOMPLETE_YEAR_NOTE = 'ปีนี้ยังไม่จบ และคนที่เพิ่งเดบิวต์อาจยังไม่อยู่ในสารบบ';
export const YOUTUBE_MEASURE_NOTE = 'วัดจาก YouTube เป็นหลัก สายไลฟ์ Twitch/TikTok อาจดูเล็กหรือเงียบกว่าความจริง';

const UNKNOWN_LABELS = new Set(['unknown', 'ไม่ทราบ', 'ไม่ระบุ', 'ไม่ระบุสถานะ']);

export function isUnknownLabel(value) {
  if (value == null) return true;
  const text = String(value).trim();
  return text === '' || UNKNOWN_LABELS.has(text) || UNKNOWN_LABELS.has(text.toLowerCase());
}

/** True only for the calendar year that is still in progress. `today` may be a Date or YYYY-MM-DD. */
export function isIncompleteYear(year, today = new Date()) {
  const current = today instanceof Date ? today.getFullYear() : Number(String(today).slice(0, 4));
  return Number(year) === current;
}

/** N and its share of everyone. Unknown rows stay out of N, and the sentence says so when any were dropped. */
export function subsetLine(counted, total, unknown = 0) {
  const n = Number(counted);
  const share = pct(n, Number(total));
  const line = `นับจาก ${fmt(n)} คน (${share == null ? '—' : share}% ของทั้งหมด)`;
  return Number(unknown) > 0 ? `${line} ${UNKNOWN_EXCLUDED}` : line;
}

/** Empty when the chart already includes everyone and dropped nothing. */
export function subsetNote(counted, total, unknown = 0) {
  if (!Number.isFinite(counted) || !Number.isFinite(total) || total <= 0) return '';
  if (!(Number(unknown) > 0) && counted === total) return '';
  return subsetLine(counted, total, unknown);
}

/** Percent of `part` after unknown values are taken out of the denominator. */
export function knownPercent(part, total, unknown = 0) {
  return pct(Number(part), Number(total) - Number(unknown || 0));
}

export function countKnown(rows, { countKey = 'count', labelKey = 'status' } = {}) {
  let counted = 0;
  let unknown = 0;
  for (const row of rows || []) {
    const n = Number(row?.[countKey]) || 0;
    if (isUnknownLabel(row?.[labelKey])) unknown += n;
    else counted += n;
  }
  return { counted, unknown };
}
