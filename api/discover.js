import { requireCursorSecret } from '../lib/config.js';
import { logApiError } from '../lib/api-error.js';
import * as defaultStorage from '../lib/storage.js';
import { decodeCursor, encodeCursor } from '../lib/cursor.js';
import { jsonResponse, noIndexHeaders } from '../lib/http.js';
import { bangkokDay, isDiscoverable, matchesPlatform, matchesShelf, parseDiscoverQuery, shelfAvailable, shuffleBySeed, toPublicCreator } from '../lib/discover.js';

export async function handleDiscover(request, { storage = defaultStorage, cursorSecret = process.env.VTHAIDEX_CURSOR_SECRET, now = Date.now() } = {}) {
  if (request.method !== 'GET') return jsonResponse(405, { error: 'method_not_allowed' }, { ...noIndexHeaders(), Allow: 'GET' });
  let query;
  try { query = parseDiscoverQuery(new URL(request.url)); } catch { return jsonResponse(400, { error: 'invalid_query' }, noIndexHeaders()); }
  try { requireCursorSecret(cursorSecret); } catch (err) { logApiError('/api/discover', err); return jsonResponse(503, { error: 'data_unavailable' }, noIndexHeaders()); }
  let snapshot;
  try { snapshot = await storage.readCurrentSnapshot(); } catch (err) { logApiError('/api/discover', err); return jsonResponse(503, { error: 'data_unavailable' }, noIndexHeaders()); }
  if (!snapshot) { logApiError('/api/discover', new Error('snapshot unavailable')); return jsonResponse(503, { error: 'data_unavailable' }, noIndexHeaders()); }
  const day = bangkokDay(now);
  const eligible = (snapshot.creators || []).filter(isDiscoverable);
  const available = shelfAvailable(eligible, query.shelf);
  const expected = { snapshot: snapshot.snapshot_id, shelf: query.shelf, platform: query.platform, day, seed: query.seed };
  let pos = 0;
  if (query.cursor) {
    try { pos = decodeCursor(query.cursor, expected, { secret: cursorSecret, now }).pos; } catch { return jsonResponse(400, { error: 'invalid_cursor' }, noIndexHeaders()); }
  }
  const ordered = available
    ? shuffleBySeed(eligible.filter((creator) => matchesPlatform(creator, query.platform) && matchesShelf(creator, query.shelf, day)), `${day}|${query.shelf}|${query.platform}|${query.seed}`)
    : [];
  if (!Number.isInteger(pos) || pos < 0 || pos > ordered.length) return jsonResponse(400, { error: 'invalid_cursor' }, noIndexHeaders());
  const items = ordered.slice(pos, pos + query.limit).map(toPublicCreator);
  const nextPos = pos + items.length;
  const next_cursor = nextPos < ordered.length ? encodeCursor({ ...expected, v: 1, pos: nextPos, exp: Math.floor(now / 1000) + 900 }, { secret: cursorSecret, now }) : null;
  return jsonResponse(200, { shelf: query.shelf, available, items, next_cursor }, noIndexHeaders());
}

export function GET(request) { return handleDiscover(request); }
export default { fetch: GET };
