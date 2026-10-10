// Data access for the VThaiDex pages. Plain JS (no JSX) so node --test can import it directly.

export const PAGE_SIZE = 24;
export const SOURCE_URL = 'https://github.com/Icezaza2543/VThaiDex';
export const DONATE_URL = 'https://ezdn.app/icezaza';
// Paste the Google Form share link here once it exists; empty keeps the button disabled.
export const CONTRIBUTE_FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSfNPPagmSf9dv7flBl21iGwT0YDr6uKft9RNRlzTmb97khOeA/viewform';

export const PLATFORM_LABELS = {
  youtube: 'YouTube', x: 'X', twitch: 'Twitch', tiktok: 'TikTok', bluesky: 'Bluesky',
  facebook: 'Facebook', instagram: 'Instagram', website: 'เว็บไซต์', easydonate: 'EasyDonate',
  tipjai: 'Tipjai', tipme: 'Tipme', soop: 'SOOP', kofi: 'Ko-fi', ganknow: 'Gank', sociabuzz: 'Sociabuzz',
  buymeacoffee: 'Buy Me a Coffee', fansly: 'Fansly', streamlabs: 'Streamlabs',
  streamelements: 'StreamElements', other: 'อื่น ๆ',
};

export const STATUS_LABELS = {
  active: 'กำลังทำกิจกรรม', hiatus: 'พักกิจกรรม', inactive: 'ไม่พบกิจกรรมล่าสุด',
  graduated: 'จบกิจกรรมแล้ว', unknown: 'ไม่ระบุสถานะ',
};

export const platformLabel = (name) => PLATFORM_LABELS[name] || name;
export const fmt = (n) => (Number.isFinite(n) ? new Intl.NumberFormat('th-TH').format(n) : '—');
export const pct = (a, b) => (Number.isFinite(a) && Number.isFinite(b) && b > 0 ? Math.round((a / b) * 100) : null);

export function formatDate(iso) {
  if (!iso || Number.isNaN(Date.parse(iso))) return null;
  return new Date(iso).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });
}

async function json(response) {
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

export async function fetchOverview(fetchImpl = fetch) {
  return json(await fetchImpl('/api/stats', { headers: { Accept: 'application/json' } }));
}

export function buildCreatorUrl({ q = '', platform = '', status = '', scope = '', cursor = '', limit = PAGE_SIZE } = {}) {
  if (!Number.isInteger(limit) || limit < 1 || limit > PAGE_SIZE) throw new TypeError(`limit must be between 1 and ${PAGE_SIZE}`);
  const p = new URLSearchParams();
  if (q) p.set('q', q);
  if (platform) p.set('platform', platform);
  if (status) p.set('status', status);
  if (scope) p.set('scope', scope);
  if (cursor) p.set('cursor', cursor);
  p.set('limit', String(limit));
  return `/api/creators?${p.toString()}`;
}

export async function fetchCreatorsPage(query = {}, fetchImpl = fetch) {
  const payload = await json(await fetchImpl(buildCreatorUrl(query), { headers: { Accept: 'application/json' } }));
  if (!Array.isArray(payload.items)) throw new Error('invalid creators response');
  return { items: payload.items, next_cursor: payload.next_cursor || null };
}

/** What a directory row shows for one creator. Never invents an avatar or a value the API did not send. */
export function creatorSummary(c) {
  return {
    name: c.name,
    agency: c.agency || 'Independent',
    statusLabel: c.status && c.status !== 'unknown' ? STATUS_LABELS[c.status] || c.status : null,
    debutYear: c.debut_year || null,
    links: (c.platforms || []).filter((p) => p.url).map((p) => ({ name: p.name, label: platformLabel(p.name), url: p.url })),
  };
}

const MAIN_PLATFORMS = ['youtube', 'twitch', 'tiktok'];

/** The one channel a discover card links to: YouTube, then Twitch, then TikTok, then any other public URL. */
export function primaryChannel(links) {
  for (const name of MAIN_PLATFORMS) {
    const hit = (links || []).find((link) => link.name === name && link.url);
    if (hit) return hit;
  }
  return (links || []).find((link) => link.url) || null;
}

export function buildDiscoverUrl({ shelf, platform = '', seed = '', cursor = '', limit = PAGE_SIZE } = {}) {
  if (!Number.isInteger(limit) || limit < 1 || limit > PAGE_SIZE) throw new TypeError(`limit must be between 1 and ${PAGE_SIZE}`);
  const params = new URLSearchParams({ shelf, limit: String(limit) });
  if (platform) params.set('platform', platform);
  if (seed) params.set('seed', seed);
  if (cursor) params.set('cursor', cursor);
  return `/api/discover?${params.toString()}`;
}

export async function fetchDiscover(query = {}, fetchImpl = fetch) {
  const payload = await json(await fetchImpl(buildDiscoverUrl(query), { headers: { Accept: 'application/json' } }));
  if (!Array.isArray(payload.items)) throw new Error('invalid discover response');
  return { items: payload.items, next_cursor: payload.next_cursor || null, available: payload.available !== false, shelf: payload.shelf };
}

/** A few random independent creators (max 6). */
export async function fetchSpotlight({ n = 3, platform = '' } = {}, fetchImpl = fetch) {
  const p = new URLSearchParams({ n: String(n) });
  if (platform) p.set('platform', platform);
  const payload = await json(await fetchImpl(`/api/spotlight?${p}`, { headers: { Accept: 'application/json' } }));
  if (!Array.isArray(payload.items)) throw new Error('invalid spotlight response');
  return payload.items;
}

// Visitor counter: one POST per browser per Bangkok day (remembered in localStorage), otherwise GET.
const VISIT_KEY = 'vthaidex-visit-day';
export const bangkokDay = (now = new Date()) => new Date(now.getTime() + 7 * 3600e3).toISOString().slice(0, 10);
export async function fetchVisits(fetchImpl = fetch, store = globalThis.localStorage, now = new Date()) {
  const day = bangkokDay(now);
  let seen = null;
  try { seen = store?.getItem(VISIT_KEY); } catch { /* storage blocked */ }
  const isNew = seen !== day;
  const data = await json(await fetchImpl('/api/visits', { method: isNew ? 'POST' : 'GET', headers: { Accept: 'application/json' } }));
  if (isNew) { try { store?.setItem(VISIT_KEY, day); } catch { /* storage blocked */ } }
  return data;
}
