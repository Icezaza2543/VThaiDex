import { createHash } from 'node:crypto';

const UNKNOWN_AGENCY = new Set(['', 'independent', 'unknown', 'n/a', 'none', 'ไม่ทราบ']);
const PUBLIC_TYPES = new Set(['', 'vtuber', 'mixed', 'unknown']);
const SHELVES = new Set(['all', 'debut', 'under_1k', 'active']);
const PLATFORMS = new Set(['', 'youtube', 'twitch', 'tiktok']);
export function bangkokDay(now = Date.now()) {
  return new Date(now + 7 * 3600e3).toISOString().slice(0, 10);
}

export function monthsBefore(iso, months) {
  const [y, m, d] = iso.split('-').map(Number);
  const total = y * 12 + (m - 1) - months;
  const year = Math.floor(total / 12);
  const month = ((total % 12) + 12) % 12;
  const last = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const day = Math.min(d, last);
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function daysBefore(iso, days) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d - days)).toISOString().slice(0, 10);
}

export function inDebutWindow(estimate, today) {
  if (typeof estimate !== 'string' || !/^\d{4}-\d{2}(-\d{2})?$/.test(estimate)) return false;
  const cutoff = monthsBefore(today, 12);
  if (estimate.length === 7) {
    const [y, m] = estimate.split('-').map(Number);
    const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const end = `${estimate}-${String(last).padStart(2, '0')}`;
    return `${estimate}-01` <= today && end >= cutoff;
  }
  return estimate >= cutoff && estimate <= today;
}

export function inActiveWindow(iso, today) {
  if (typeof iso !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  return iso >= daysBefore(today, 30) && iso <= today;
}

export function isDiscoverable(creator) {
  if (!creator || typeof creator !== 'object') return false;
  const agency = String(creator.agency ?? '').trim().toLowerCase();
  if (!UNKNOWN_AGENCY.has(agency)) return false;
  if (String(creator.content_rating ?? '').trim().toLowerCase() === 'adult') return false;
  const type = String(creator.persona_type ?? creator.v_type ?? '').trim().toLowerCase();
  return PUBLIC_TYPES.has(type);
}

export function matchesPlatform(creator, platform) {
  const rows = creator.platforms || [];
  if (!platform) return rows.some((row) => row?.url);
  return rows.some((row) => row?.name === platform && row?.url);
}

export function matchesShelf(creator, shelf, today) {
  if (shelf === 'all') return true;
  if (shelf === 'debut') return inDebutWindow(creator.debut_estimate, today);
  if (shelf === 'under_1k') return creator.reach_band === 'under_1k';
  if (shelf === 'active') return inActiveWindow(creator.last_public_upload, today);
  return false;
}

export function shelfAvailable(creators, shelf) {
  if (shelf === 'all') return true;
  if (shelf === 'debut') return creators.some((creator) => typeof creator.debut_estimate === 'string' && creator.debut_estimate);
  if (shelf === 'under_1k') return creators.some((creator) => creator.reach_band === 'under_1k' || creator.reach_band === '1k_plus');
  if (shelf === 'active') return creators.some((creator) => typeof creator.last_public_upload === 'string' && creator.last_public_upload);
  return false;
}

function identity(creator, index) {
  const platforms = (creator.platforms || []).map((row) => `${row?.name || ''}:${row?.url || ''}`).join('|');
  return `${index}\0${creator.name || ''}\0${platforms}`;
}

/** Deterministic shuffle. Rank is a SHA-256 of the seed and identity, so each item is equally likely in every position. */
export function shuffleBySeed(items, seed) {
  return items
    .map((item, index) => ({ item, index, rank: createHash('sha256').update(`${seed}\0${identity(item, index)}`).digest() }))
    .sort((a, b) => Buffer.compare(a.rank, b.rank) || a.index - b.index)
    .map((row) => row.item);
}

export function toPublicCreator(creator) {
  const out = {
    name: creator.name,
    status: creator.status || 'unknown',
    platforms: (creator.platforms || []).map((row) => ({ name: row.name, url: row.url || null })),
  };
  const agency = String(creator.agency ?? '').trim();
  if (agency && !UNKNOWN_AGENCY.has(agency.toLowerCase())) out.agency = agency;
  if (Number.isInteger(creator.debut_year)) out.debut_year = creator.debut_year;
  if (typeof creator.debut_estimate === 'string' && creator.debut_estimate) out.debut_estimate = creator.debut_estimate;
  if (typeof creator.last_public_upload === 'string' && creator.last_public_upload) out.last_public_upload = creator.last_public_upload;
  return out;
}

export function parseDiscoverQuery(url) {
  const params = url.searchParams;
  if (params.has('sort')) throw new TypeError('sort is not supported');
  const shelf = (params.get('shelf') ?? '').trim().toLowerCase();
  if (!SHELVES.has(shelf)) throw new TypeError('invalid shelf');
  const platform = (params.get('platform') ?? '').trim().toLowerCase();
  if (!PLATFORMS.has(platform)) throw new TypeError('invalid platform');
  const seed = (params.get('seed') ?? '').trim();
  if (seed && !/^[A-Za-z0-9_-]{1,32}$/.test(seed)) throw new TypeError('invalid seed');
  let limit = 24;
  if (params.has('limit')) {
    const raw = params.get('limit');
    if (!/^\d+$/.test(raw ?? '')) throw new TypeError('limit must be an integer');
    limit = Number(raw);
    if (limit < 1 || limit > 24) throw new TypeError('limit must be between 1 and 24');
  }
  const cursor = (params.get('cursor') ?? '').trim();
  return { shelf, platform, seed, cursor, limit };
}

