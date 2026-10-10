import test from 'node:test';
import assert from 'node:assert/strict';
import { createMemoryStorage } from './storage-fake.js';
import { handleDiscover } from '../api/discover.js';
import { handleCreators } from '../api/creators.js';
import { daysBefore, inActiveWindow, inDebutWindow, monthsBefore, shuffleBySeed } from '../lib/discover.js';
import { buildDiscoverUrl, primaryChannel } from '../src/lib/api.js';
import { validateSnapshot } from '../lib/public-schema.js';

const cursorSecret = Buffer.alloc(32, 9).toString('base64url');
const now = Date.parse('2026-10-11T03:00:00Z');
const json = async (response) => JSON.parse(await response.text());

function creator(name, extra = {}) {
  return {
    name,
    status: 'active',
    platforms: [{ name: 'youtube', url: `https://example.com/${encodeURIComponent(name)}` }],
    ...extra,
  };
}

function snapshot(creators) {
  return {
    schema_version: 2,
    snapshot_id: 'snap-discover',
    meta: { generated_at: '2026-10-11T00:00:00Z' },
    summary: { total_vtubers: creators.length, platforms: [], lifecycle: [], debut_trend: [], known_debut_year_count: 0 },
    creators,
  };
}

function ask(path, storage) {
  return handleDiscover(new Request(`https://vthaidex.test${path}`), { storage, cursorSecret, now });
}

test('shuffle is deterministic per seed and does not rank by followers', () => {
  const items = Array.from({ length: 12 }, (_, i) => creator(`N${String(i).padStart(2, '0')}`, { followers: 1000 - i }));
  const first = shuffleBySeed(items, '2026-10-11|debut||').map((item) => item.name);
  assert.deepEqual(first, shuffleBySeed(items, '2026-10-11|debut||').map((item) => item.name));
  assert.notDeepEqual(first, shuffleBySeed(items, '2026-10-12|debut|reshuffle').map((item) => item.name));
  assert.notDeepEqual(first, [...items].sort((a, b) => b.followers - a.followers).map((item) => item.name));
});

test('each item appears in roughly equal share across seeds', () => {
  const items = Array.from({ length: 20 }, (_, i) => creator(`P${i}`));
  const window = 8;
  const seeds = 300;
  const counts = Object.fromEntries(items.map((item) => [item.name, 0]));
  for (let i = 0; i < seeds; i += 1) {
    for (const item of shuffleBySeed(items, `seed-${i}`).slice(0, window)) counts[item.name] += 1;
  }
  const expected = seeds * window / items.length;
  for (const count of Object.values(counts)) {
    assert.ok(Math.abs(count - expected) / expected < 0.35, `${count} vs ${expected}`);
  }
});

test('debut and activity windows use the Bangkok calendar', () => {
  assert.equal(monthsBefore('2026-03-31', 1), '2026-02-28');
  assert.equal(daysBefore('2026-10-11', 30), '2026-09-11');
  assert.equal(inDebutWindow('2026-02-01', '2026-10-11'), true);
  assert.equal(inDebutWindow('2025-10-10', '2026-10-11'), false);
  assert.equal(inDebutWindow('2025-10', '2026-10-11'), true);
  assert.equal(inDebutWindow('2025-09', '2026-10-11'), false);
  assert.equal(inActiveWindow('2026-09-11', '2026-10-11'), true);
  assert.equal(inActiveWindow('2026-09-10', '2026-10-11'), false);
});

test('discover excludes agency, adult and other-v, caps at 24, and keeps shelf cursors', async () => {
  const creators = [
    creator('Indie', { debut_estimate: '2026-02-01', last_public_upload: '2026-10-01', reach_band: 'under_1k' }),
    creator('Named Indie', { agency: 'Independent', debut_estimate: '2026-03-01', reach_band: 'under_1k', last_public_upload: '2026-10-02' }),
    creator('Unknown agency', { agency: 'unknown', debut_estimate: '2026-04-01', reach_band: '1k_plus', last_public_upload: '2026-08-01' }),
    creator('Agency', { agency: 'ค่ายใหญ่', debut_estimate: '2026-01-01', reach_band: 'under_1k', last_public_upload: '2026-10-05' }),
    creator('Adult', { content_rating: 'adult', debut_estimate: '2026-01-02', reach_band: 'under_1k', last_public_upload: '2026-10-05' }),
    creator('PNG', { persona_type: 'pngtuber', debut_estimate: '2026-01-03', reach_band: 'under_1k', last_public_upload: '2026-10-05' }),
    creator('Singer', { v_type: 'vsinger', debut_estimate: '2026-01-04', reach_band: 'under_1k', last_public_upload: '2026-10-05' }),
    creator('Old debut', { debut_estimate: '2020-01-01', reach_band: 'under_1k', last_public_upload: '2026-10-01' }),
    creator('Quiet', { debut_estimate: '2026-05-01', reach_band: 'under_1k', last_public_upload: '2024-01-01' }),
    creator('Twitch only', { platforms: [{ name: 'twitch', url: 'https://example.com/twitch' }], debut_estimate: '2026-06-01', reach_band: 'under_1k', last_public_upload: '2026-10-03' }),
    ...Array.from({ length: 30 }, (_, i) => creator(`Pool ${String(i).padStart(2, '0')}`, { debut_estimate: '2026-07-01', reach_band: 'under_1k', last_public_upload: '2026-10-04', followers: i })),
  ];
  const storage = createMemoryStorage();
  await storage.writeSnapshot(snapshot(creators));

  const debut = await json(await ask('/api/discover?shelf=debut', storage));
  assert.equal(debut.available, true);
  assert.equal(debut.items.length, 24);
  assert.ok(debut.next_cursor);
  assert.equal(debut.items.some((item) => ['Agency', 'Adult', 'PNG', 'Singer', 'Old debut'].includes(item.name)), false);
  assert.equal(JSON.stringify(debut).includes('followers'), false);
  assert.equal(JSON.stringify(debut).includes('reach_band'), false);
  assert.equal(JSON.stringify(debut).includes('content_rating'), false);
  assert.equal(debut.items.some((item) => item.persona_type || item.v_type), false);

  const second = await json(await ask(`/api/discover?shelf=debut&cursor=${encodeURIComponent(debut.next_cursor)}`, storage));
  assert.equal(second.items.length, 11);
  const names = [...debut.items, ...second.items].map((item) => item.name);
  assert.equal(new Set(names).size, names.length);
  assert.equal((await ask(`/api/discover?shelf=active&cursor=${encodeURIComponent(debut.next_cursor)}`, storage)).status, 400);

  const small = await json(await ask('/api/discover?shelf=under_1k&limit=24', storage));
  assert.equal(small.items.some((item) => item.name === 'Unknown agency'), false);
  assert.ok(small.items.some((item) => item.name === 'Indie'));

  const active = await json(await ask('/api/discover?shelf=active&platform=twitch', storage));
  assert.deepEqual(active.items.map((item) => item.name), ['Twitch only']);

  const again = await json(await ask('/api/discover?shelf=debut&seed=same', storage));
  const other = await json(await ask('/api/discover?shelf=debut&seed=other', storage));
  assert.deepEqual(again.items.map((item) => item.name), (await json(await ask('/api/discover?shelf=debut&seed=same', storage))).items.map((item) => item.name));
  assert.notDeepEqual(again.items.map((item) => item.name), other.items.map((item) => item.name));

  assert.equal((await ask('/api/discover?shelf=debut&sort=followers', storage)).status, 400);
  assert.equal((await ask('/api/discover?shelf=debut&limit=25', storage)).status, 400);
  assert.equal((await ask('/api/discover?shelf=debut&platform=x', storage)).status, 400);
});

test('a shelf whose field is absent is unavailable and the directory does not leak reach bands', async () => {
  const storage = createMemoryStorage();
  await storage.writeSnapshot(snapshot([
    creator('Plain', { reach_band: 'under_1k', followers: 12 }),
  ]));
  const debut = await json(await ask('/api/discover?shelf=debut', storage));
  assert.equal(debut.available, false);
  assert.deepEqual(debut.items, []);
  const listed = await json(await handleCreators(new Request('https://vthaidex.test/api/creators'), { storage, cursorSecret, now }));
  assert.equal(JSON.stringify(listed).includes('reach_band'), false);
  assert.equal(JSON.stringify(listed).includes('followers'), false);
});

test('discover client stays within 24 and picks one main channel', () => {
  assert.equal(buildDiscoverUrl({ shelf: 'debut', platform: 'youtube', seed: 'abc', limit: 24 }), '/api/discover?shelf=debut&limit=24&platform=youtube&seed=abc');
  assert.throws(() => buildDiscoverUrl({ shelf: 'debut', limit: 25 }), /24/);
  const links = [
    { name: 'twitch', url: 'https://twitch.tv/a' },
    { name: 'youtube', url: 'https://youtube.com/@a' },
  ];
  assert.equal(primaryChannel(links).name, 'youtube');
  assert.equal(primaryChannel([{ name: 'x', url: 'https://x.com/a' }]).name, 'x');
});

test('snapshot accepts estimate fields and still rejects follower counts', () => {
  const ok = {
    schema_version: 2,
    snapshot_id: 'snap-1',
    meta: { generated_at: '2026-10-11T00:00:00Z' },
    summary: { total_vtubers: 1, platforms: [{ platform: 'youtube', count: 1 }], lifecycle: [{ status: 'active', count: 1 }], debut_trend: [], known_debut_year_count: 0 },
    creators: [{
      name: 'Alpha', status: 'active', debut_year: 2026, debut_estimate: '2026-02', last_public_upload: '2026-10-01', reach_band: 'under_1k',
      platforms: [{ name: 'youtube', url: 'https://youtube.com/@alpha' }],
    }],
  };
  const saved = validateSnapshot(ok);
  assert.equal(saved.creators[0].debut_estimate, '2026-02');
  assert.equal(saved.creators[0].reach_band, 'under_1k');
  const bad = structuredClone(ok);
  bad.creators[0].followers = 10;
  assert.throws(() => validateSnapshot(bad), /forbidden|allowlist/i);
});
