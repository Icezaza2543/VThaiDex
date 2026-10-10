import { logApiError } from '../lib/api-error.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { handleHealth } from '../api/health.js';
import { requireBlobConfig, requireCounterConfig } from '../lib/config.js';
import { handleStats } from '../api/stats.js';
import { handleCreators } from '../api/creators.js';
import { handleSpotlight } from '../api/spotlight.js';
import { handleDiscover } from '../api/discover.js';
import { handleVisits, upstashFromEnv } from '../api/visits.js';

const cursorSecret = Buffer.alloc(32, 7).toString('base64url');
const env = { BLOB_STORE_ID: 'store-test', VERCEL_OIDC_TOKEN: 'oidc-test', KV_REST_API_URL: 'https://redis.test', KV_REST_API_TOKEN: 'redis-token' };
const request = path => new Request(`https://test/api/${path}`);
const storage = { readCurrentSnapshot: async () => ({ snapshot_id: 'current', meta: { generated_at: '2026-10-10T00:00:00Z' } }) };

test('config guard names missing vars and accepts either Blob authentication mode', () => {
  assert.throws(() => requireBlobConfig({ VERCEL_OIDC_TOKEN: 'test' }), /missing BLOB_STORE_ID/);
  // the runtime OIDC token arrives per request, so a store ID alone is accepted
  assert.doesNotThrow(() => requireBlobConfig({ BLOB_STORE_ID: 'test' }));
  assert.doesNotThrow(() => requireBlobConfig(env));
  assert.doesNotThrow(() => requireBlobConfig({ BLOB_READ_WRITE_TOKEN: 'test' }));
  assert.throws(() => requireCounterConfig({}), /missing KV_REST_API_URL/);
  assert.throws(() => requireCounterConfig({ KV_REST_API_URL: 'test' }), /missing KV_REST_API_TOKEN/);
});

test('health reports snapshot and counter without env values, noindex and no-store', async () => {
  const calls=[];
  const res=await handleHealth(request('health'), { storage, env, redis: async c => { calls.push(c); return ['PONG']; } });
  assert.equal(res.status,200);
  assert.deepEqual(await res.json(), { blob:'ok', snapshot_id:'current', generated_at:'2026-10-10T00:00:00Z', counter:'ok' });
  assert.deepEqual(calls,[[['PING']]]);
  assert.equal(res.headers.get('Cache-Control'),'no-store');
  assert.equal(res.headers.get('X-Robots-Tag'),'noindex, nofollow');
});

test('health identifies missing config without invoking providers; GET only', async () => {
  const res=await handleHealth(request('health'), { env:{}, storage:{ readCurrentSnapshot: () => { throw Error('must not run'); } } });
  assert.equal(res.status,503);
  assert.deepEqual(await res.json(), { blob:'missing_config', snapshot_id:null, generated_at:null, counter:'missing_config' });
  assert.equal((await handleHealth(new Request('https://test/api/health',{method:'POST'}),{env:{}})).status,405);
});

test('health distinguishes provider failures and an absent snapshot from missing config', async () => {
  for(const readCurrentSnapshot of [async()=>null,async()=>{throw Error('storage down');}]){
    const res=await handleHealth(request('health'),{env, storage:{readCurrentSnapshot},redis:async()=>{throw Error('redis down');}});
    assert.equal(res.status,503);
    assert.deepEqual(await res.json(),{blob:'error',snapshot_id:null,generated_at:null,counter:'error'});
  }
  const res=await handleHealth(request('health'),{env,storage,redis:async()=>{throw Error('redis down');}});
  assert.equal(res.status,200); assert.equal((await res.json()).counter,'error');
});

test('all data/counter 503 paths log the endpoint and safe actual message',async t=>{
  const logs=[];t.mock.method(console,'error',(...args)=>logs.push(args.join(' ')));
  const broken={readCurrentSnapshot:async()=>{throw Error('private storage unavailable');}};
  for(const [endpoint,handler,options] of [
    ['stats',handleStats,{storage:broken}],['creators',handleCreators,{storage:broken,cursorSecret}],
    ['spotlight',handleSpotlight,{storage:broken}],
    ['discover',handleDiscover,{storage:broken,cursorSecret}],
    ['visits',handleVisits,{redis:async()=>{throw Error('counter connection failed');}}]
  ]){
    const url=endpoint==='discover'?'https://test/api/discover?shelf=debut':undefined;
    const res=await handler(url?new Request(url):request(endpoint),options);
    assert.equal(res.status,503);assert.ok(logs.some(s=>s.includes(`/api/${endpoint}`)&&s.includes(endpoint==='visits'?'counter connection failed':'private storage unavailable')));
  }
  for(const handler of [handleStats,handleSpotlight,handleCreators,handleDiscover]){
    const before=logs.length;
    const req=handler===handleDiscover?new Request('https://test/api/discover?shelf=debut'):request('test');
    assert.equal((await handler(req,{storage:{readCurrentSnapshot:async()=>null},cursorSecret})).status,503);
    assert.ok(logs.length>before);assert.match(logs.at(-1),/snapshot/);
  }
  assert.equal((await handleCreators(request('creators'),{cursorSecret:''})).status,503);
  assert.match(logs.at(-1),/VTHAIDEX_CURSOR_SECRET/);
  assert.equal((await handleVisits(request('visits'),{env:{}})).status,503);
  assert.match(logs.at(-1),/missing KV_REST_API_URL/);
});

test('logs redact configured tokens, salts and provider URLs',async t=>{
  const logs=[];t.mock.method(console,'error',s=>logs.push(s));
  logApiError('/api/stats', Error('provider rejected blob-secret-value cursor-secret-value Bearer unknown-token https://secret.test/path?token=other'), { BLOB_READ_WRITE_TOKEN:'blob-secret-value', VTHAIDEX_CURSOR_SECRET:'cursor-secret-value' });
  assert.match(logs[0],/provider rejected/);
  for(const value of ['blob-secret-value','cursor-secret-value','unknown-token','secret.test','token=other'])assert.equal(logs[0].includes(value),false);
});

test('Upstash reports command errors even in an HTTP 200 pipeline response',async()=>{
  const redis=upstashFromEnv(env,async()=>new Response(JSON.stringify([{error:'ERR operation failed'}])));
  await assert.rejects(()=>redis([['PING']]),/upstash.*command/i);
});

test('real storage missing config is logged before public APIs return 503, without a network call',async t=>{
  const keys=['BLOB_STORE_ID','BLOB_READ_WRITE_TOKEN','VERCEL_OIDC_TOKEN'];
  const old=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
  t.after(()=>{for(const k of keys){if(old[k]===undefined)delete process.env[k];else process.env[k]=old[k];}});
  for(const k of keys)delete process.env[k];
  const logs=[];t.mock.method(console,'error',s=>logs.push(s));
  for(const [endpoint,handler] of [['stats',handleStats],['creators',handleCreators],['spotlight',handleSpotlight],['discover',handleDiscover]]){
    const req=endpoint==='discover'?new Request('https://test/api/discover?shelf=debut'):request(endpoint);
    assert.equal((await handler(req,{cursorSecret})).status,503);
    assert.match(logs.at(-1),new RegExp(`/api/${endpoint}: missing BLOB_STORE_ID`));
  }
});
