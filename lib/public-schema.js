const LIFECYCLE = new Set(['active','hiatus','inactive','graduated','unknown']);
const CREATOR_ALLOWED = new Set(['name','agency','status','debut_year','debut_estimate','last_public_upload','reach_band','platforms']);
const PLATFORM_ALLOWED = new Set(['name','url']);
const META_ALLOWED = new Set(['generated_at','count_unit','notes']);
const SUMMARY_ALLOWED = new Set(['total_vtubers','platforms','lifecycle','debut_trend','known_debut_year_count','agencies','agency_total','independent_count','platform_span','platform_breakdown','agency_sizes','independent_debut_trend','insights']);
const SUMMARY_AGENCY_ALLOWED = new Set(['name','count']);
const SUMMARY_SPAN_ALLOWED = new Set(['platforms','count']);
const SUMMARY_PLATFORM_ALLOWED = new Set(['platform','count']);
const SUMMARY_LIFECYCLE_ALLOWED = new Set(['status','count']);
const SUMMARY_DEBUT_ALLOWED = new Set(['year','known_debuts','cumulative_known_debuts']);

function assertObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(`${label} must be an object`);
}

function assertOnlyKeys(value, allowed, label) {
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) throw new TypeError(`${label} contains forbidden/non-allowlisted field: ${key}`);
  }
}

function safeHttpUrl(value) {
  if (value == null || value === '') return null;
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

function nonNegativeInt(value, label) {
  if (!Number.isInteger(value) || value < 0) throw new TypeError(`${label} must be a non-negative integer`);
  return value;
}

function optionalCalendar(value, label, allowMonth) {
  if (value == null || value === '') return null;
  const text = String(value);
  if (!(allowMonth ? /^\d{4}-\d{2}(-\d{2})?$/ : /^\d{4}-\d{2}-\d{2}$/).test(text)) throw new TypeError(`invalid ${label}`);
  const [year, month, day] = text.split('-').map(Number);
  if (year < 1900 || year > 2100 || month < 1 || month > 12) throw new TypeError(`invalid ${label}`);
  if (day != null) {
    const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
    if (day < 1 || day > last) throw new TypeError(`invalid ${label}`);
  }
  return text;
}

export function sanitizeCreator(value) {
  assertObject(value, 'creator');
  assertOnlyKeys(value, CREATOR_ALLOWED, 'creator');
  const name = String(value.name ?? '').trim();
  if (!name) throw new TypeError('creator name is required');
  const status = String(value.status ?? 'unknown').trim().toLowerCase();
  if (!LIFECYCLE.has(status)) throw new TypeError(`invalid creator status: ${status}`);
  const creator = {name, status};
  if (value.agency != null && String(value.agency).trim()) creator.agency = String(value.agency).trim();
  if (value.debut_year != null) {
    if (!Number.isInteger(value.debut_year) || value.debut_year < 1900 || value.debut_year > 2100) throw new TypeError('invalid debut_year');
    creator.debut_year = value.debut_year;
  }
  const debutEstimate = optionalCalendar(value.debut_estimate, 'debut_estimate', true);
  if (debutEstimate) creator.debut_estimate = debutEstimate;
  const lastUpload = optionalCalendar(value.last_public_upload, 'last_public_upload', false);
  if (lastUpload) creator.last_public_upload = lastUpload;
  if (value.reach_band != null) {
    if (value.reach_band !== 'under_1k' && value.reach_band !== '1k_plus') throw new TypeError('invalid reach_band');
    creator.reach_band = value.reach_band;
  }
  if (!Array.isArray(value.platforms)) throw new TypeError('creator platforms must be an array');
  creator.platforms = value.platforms.map((platform) => {
    assertObject(platform, 'platform');
    assertOnlyKeys(platform, PLATFORM_ALLOWED, 'platform');
    const platformName = String(platform.name ?? '').trim().toLowerCase();
    if (!platformName) throw new TypeError('platform name is required');
    return {name: platformName, url: safeHttpUrl(platform.url)};
  });
  return creator;
}

function validateMeta(meta) {
  assertObject(meta, 'snapshot meta');
  assertOnlyKeys(meta, META_ALLOWED, 'snapshot meta');
  if (typeof meta.generated_at !== 'string' || Number.isNaN(Date.parse(meta.generated_at))) throw new TypeError('meta.generated_at must be an ISO date');
  const result = {generated_at: meta.generated_at};
  if (meta.count_unit != null) {
    if (typeof meta.count_unit !== 'string' || !meta.count_unit.trim()) throw new TypeError('meta.count_unit must be a non-empty string');
    result.count_unit = meta.count_unit.trim();
  }
  if (meta.notes != null) {
    if (!Array.isArray(meta.notes) || meta.notes.some(note => typeof note !== 'string')) throw new TypeError('meta.notes must be an array of strings');
    result.notes = meta.notes.map(note => note.trim()).filter(Boolean).slice(0, 20);
  }
  return result;
}

function validateSummary(summary) {
  assertObject(summary, 'summary');
  assertOnlyKeys(summary, SUMMARY_ALLOWED, 'summary');
  const total_vtubers = nonNegativeInt(summary.total_vtubers, 'summary.total_vtubers');
  for (const key of ['platforms','lifecycle','debut_trend']) if (!Array.isArray(summary[key])) throw new TypeError(`summary.${key} must be an array`);
  const known_debut_year_count = nonNegativeInt(summary.known_debut_year_count, 'summary.known_debut_year_count');
  if (known_debut_year_count > total_vtubers) throw new TypeError('summary.known_debut_year_count exceeds total_vtubers');

  const platforms = summary.platforms.map(row => {
    assertObject(row, 'summary platform row');
    assertOnlyKeys(row, SUMMARY_PLATFORM_ALLOWED, 'summary platform row');
    const platform = String(row.platform ?? '').trim().toLowerCase();
    if (!platform) throw new TypeError('summary platform row requires platform');
    const count = nonNegativeInt(row.count, 'summary platform count');
    if (count > total_vtubers) throw new TypeError('summary platform count exceeds total_vtubers');
    return {platform, count};
  });

  const lifecycle = summary.lifecycle.map(row => {
    assertObject(row,'summary lifecycle row');
    assertOnlyKeys(row, SUMMARY_LIFECYCLE_ALLOWED, 'summary lifecycle row');
    const status = String(row.status ?? '').toLowerCase();
    if (!LIFECYCLE.has(status)) throw new TypeError('invalid lifecycle status');
    const count = nonNegativeInt(row.count, 'summary lifecycle count');
    if (count > total_vtubers) throw new TypeError('summary lifecycle count exceeds total_vtubers');
    return {status, count};
  });

  const debut_trend = summary.debut_trend.map(row => {
    assertObject(row, 'summary debut row');
    assertOnlyKeys(row, SUMMARY_DEBUT_ALLOWED, 'summary debut row');
    if (!Number.isInteger(row.year) || row.year < 1900 || row.year > 2100) throw new TypeError('invalid summary debut year');
    const known_debuts = nonNegativeInt(row.known_debuts, 'summary known_debuts');
    const cumulative_known_debuts = nonNegativeInt(row.cumulative_known_debuts, 'summary cumulative_known_debuts');
    if (known_debuts > total_vtubers || cumulative_known_debuts > total_vtubers) throw new TypeError('summary debut count exceeds total_vtubers');
    return {year: row.year, known_debuts, cumulative_known_debuts};
  });

  const result = {total_vtubers, platforms, lifecycle, debut_trend, known_debut_year_count};
  // Optional aggregates (agency sizes, platform span). Counts only; no per-creator data.
  if (summary.agencies != null) {
    if (!Array.isArray(summary.agencies) || summary.agencies.length > 200) throw new TypeError('summary.agencies must be an array of at most 200 rows');
    result.agencies = summary.agencies.map(row => {
      assertObject(row, 'summary agency row');
      assertOnlyKeys(row, SUMMARY_AGENCY_ALLOWED, 'summary agency row');
      const name = String(row.name ?? '').trim();
      if (!name) throw new TypeError('summary agency row requires name');
      const count = nonNegativeInt(row.count, 'summary agency count');
      if (count > total_vtubers) throw new TypeError('summary agency count exceeds total_vtubers');
      return {name, count};
    });
  }
  for (const key of ['agency_total','independent_count']) {
    if (summary[key] != null) {
      result[key] = nonNegativeInt(summary[key], `summary.${key}`);
      if (key === 'independent_count' && result[key] > total_vtubers) throw new TypeError('summary.independent_count exceeds total_vtubers');
    }
  }
  if (summary.platform_span != null) {
    if (!Array.isArray(summary.platform_span)) throw new TypeError('summary.platform_span must be an array');
    result.platform_span = summary.platform_span.map(row => {
      assertObject(row, 'summary platform span row');
      assertOnlyKeys(row, SUMMARY_SPAN_ALLOWED, 'summary platform span row');
      const platforms = nonNegativeInt(row.platforms, 'summary platform span platforms');
      const count = nonNegativeInt(row.count, 'summary platform span count');
      if (count > total_vtubers) throw new TypeError('summary platform span count exceeds total_vtubers');
      return {platforms, count};
    });
  }
  if (summary.platform_breakdown != null) {
    if (!Array.isArray(summary.platform_breakdown)) throw new TypeError('summary.platform_breakdown must be an array');
    result.platform_breakdown = summary.platform_breakdown.map(row => {
      assertObject(row, 'summary platform breakdown row');
      assertOnlyKeys(row, new Set(['platform','count','independent','debut_years']), 'summary platform breakdown row');
      const platform = String(row.platform ?? '').trim().toLowerCase();
      if (!platform) throw new TypeError('summary platform breakdown row requires platform');
      const count = nonNegativeInt(row.count, 'platform breakdown count');
      const independent = nonNegativeInt(row.independent, 'platform breakdown independent');
      if (count > total_vtubers || independent > count) throw new TypeError('summary platform breakdown count exceeds total');
      if (!Array.isArray(row.debut_years)) throw new TypeError('platform breakdown debut_years must be an array');
      return {platform, count, independent, debut_years: row.debut_years.map(yearCount)};
    });
  }
  if (summary.agency_sizes != null) {
    if (!Array.isArray(summary.agency_sizes)) throw new TypeError('summary.agency_sizes must be an array');
    result.agency_sizes = summary.agency_sizes.map(row => {
      assertObject(row, 'summary agency size row');
      assertOnlyKeys(row, new Set(['size','agencies','members']), 'summary agency size row');
      const size = String(row.size ?? '').trim();
      if (!/^[0-9+-]{1,8}$/.test(size)) throw new TypeError('invalid agency size bucket');
      const members = nonNegativeInt(row.members, 'agency size members');
      if (members > total_vtubers) throw new TypeError('summary agency size members exceeds total_vtubers');
      return {size, agencies: nonNegativeInt(row.agencies, 'agency size agencies'), members};
    });
  }
  if (summary.independent_debut_trend != null) {
    if (!Array.isArray(summary.independent_debut_trend)) throw new TypeError('summary.independent_debut_trend must be an array');
    result.independent_debut_trend = summary.independent_debut_trend.map(yearCount);
  }
  if (summary.insights != null) result.insights = validateInsights(summary.insights, total_vtubers);
  return result;

  function yearCount(row) {
    assertObject(row, 'year count row');
    assertOnlyKeys(row, new Set(['year','count']), 'year count row');
    if (!Number.isInteger(row.year) || row.year < 1900 || row.year > 2100) throw new TypeError('invalid year');
    const count = nonNegativeInt(row.count, 'year count');
    if (count > total_vtubers) throw new TypeError('year count exceeds total_vtubers');
    return {year: row.year, count};
  }
}

const TIER_KEYS = ['independent', 'small', 'mid', 'big'];
const LIVE = new Set(['youtube', 'twitch', 'tiktok']);

/** Count-only insights (tiers, activity, size bands, debuts by tier, live-platform combos). Strict allowlist. */
function validateInsights(v, total) {
  assertObject(v, 'summary.insights');
  assertOnlyKeys(v, new Set(['basis', 'tiers', 'big_agency_count', 'activity', 'size_bands', 'debuts_by_tier', 'live_combos', 'no_live_platform']), 'summary.insights');
  const n = (x, label) => nonNegativeInt(x, `insights ${label}`);
  const rows = (arr, label, keys, map) => {
    if (!Array.isArray(arr) || arr.length > 60) throw new TypeError(`insights.${label} must be a short array`);
    return arr.map(r => { assertObject(r, `insights ${label} row`); assertOnlyKeys(r, new Set(keys), `insights ${label} row`); return map(r); });
  };
  const tiers = r => Object.fromEntries(TIER_KEYS.map(k => [k, n(r[k], k)]));
  assertObject(v.basis, 'insights.basis');
  assertOnlyKeys(v.basis, new Set(['records', 'with_youtube_followers', 'activity_scanned', 'data_as_of']), 'insights.basis');
  const asOf = String(v.basis.data_as_of ?? '');
  if (asOf && !/^\d{4}-\d{2}-\d{2}$/.test(asOf)) throw new TypeError('insights.basis.data_as_of must be YYYY-MM-DD');
  return {
    basis: {records: n(v.basis.records, 'records'), with_youtube_followers: n(v.basis.with_youtube_followers, 'with_youtube_followers'), activity_scanned: n(v.basis.activity_scanned, 'activity_scanned'), data_as_of: asOf},
    tiers: rows(v.tiers, 'tiers', ['tier', 'count'], r => { if (!TIER_KEYS.includes(r.tier)) throw new TypeError('invalid tier'); return {tier: r.tier, count: n(r.count, 'count')}; }),
    big_agency_count: n(v.big_agency_count, 'big_agency_count'),
    activity: rows(v.activity, 'activity', ['tier', 'scanned', 'active'], r => { if (!TIER_KEYS.includes(r.tier)) throw new TypeError('invalid tier'); return {tier: r.tier, scanned: n(r.scanned, 'scanned'), active: n(r.active, 'active')}; }),
    size_bands: rows(v.size_bands, 'size_bands', ['band', ...TIER_KEYS], r => { if (!/^[0-9KMk<+-]{2,10}$/.test(String(r.band))) throw new TypeError('invalid band'); return {band: String(r.band), ...tiers(r)}; }),
    debuts_by_tier: rows(v.debuts_by_tier, 'debuts_by_tier', ['year', ...TIER_KEYS], r => { if (!Number.isInteger(r.year) || r.year < 1900 || r.year > 2100) throw new TypeError('invalid year'); return {year: r.year, ...tiers(r)}; }),
    live_combos: rows(v.live_combos, 'live_combos', ['platforms', 'count', 'independent'], r => {
      if (!Array.isArray(r.platforms) || !r.platforms.length || r.platforms.some(p => !LIVE.has(p))) throw new TypeError('invalid live combo');
      const count = n(r.count, 'count'); if (count > total * 2) throw new TypeError('live combo count too large');
      return {platforms: [...r.platforms], count, independent: n(r.independent, 'independent')};
    }),
    no_live_platform: n(v.no_live_platform, 'no_live_platform'),
  };
}

export function validateSnapshot(value) {
  assertObject(value, 'snapshot');
  const allowed = new Set(['schema_version','snapshot_id','meta','summary','creators']);
  assertOnlyKeys(value, allowed, 'snapshot');
  if (value.schema_version !== 2) throw new TypeError('unsupported snapshot schema_version');
  if (typeof value.snapshot_id !== 'string' || !value.snapshot_id.trim()) throw new TypeError('snapshot_id is required');
  const meta = validateMeta(value.meta);
  const summary = validateSummary(value.summary);
  if (!Array.isArray(value.creators)) throw new TypeError('creators must be an array');
  const creators = value.creators.map(sanitizeCreator);
  if (summary.total_vtubers !== creators.length) throw new TypeError('summary.total_vtubers must match creators length');
  return {schema_version: 2, snapshot_id: value.snapshot_id.trim(), meta, summary, creators};
}

export function parseCreatorQuery(url) {
  const params = url.searchParams;
  let limit = 24;
  if (params.has('limit')) {
    const raw = params.get('limit');
    if (!/^\d+$/.test(raw ?? '')) throw new TypeError('limit must be an integer');
    limit = Number(raw);
    if (limit < 1 || limit > 24) throw new TypeError('limit must be between 1 and 24');
  }
  const q = (params.get('q') ?? '').trim().slice(0,100);
  const platform = (params.get('platform') ?? '').trim().toLowerCase().slice(0,32);
  const status = (params.get('status') ?? '').trim().toLowerCase();
  if (status && !LIFECYCLE.has(status)) throw new TypeError('invalid status filter');
  const scope = (params.get('scope') ?? '').trim().toLowerCase();
  if (scope && scope !== 'independent' && scope !== 'agency') throw new TypeError('invalid scope filter');
  const cursor = (params.get('cursor') ?? '').trim();
  return {q, platform, status, scope, cursor, limit};
}
