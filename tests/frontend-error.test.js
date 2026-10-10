import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { createRequestLoader } from '../src/lib/useApiData.js';
import DataError from '../src/components/DataError.js';
import { fetchOverview, fetchCreatorsPage, fetchSpotlight, fetchDiscover } from '../src/lib/api.js';

test('failed stats, creators and spotlight show an error then recover through retry',async()=>{
 for(const fetcher of [f=>fetchOverview(f),f=>fetchCreatorsPage({},f),f=>fetchSpotlight({},f),f=>fetchDiscover({shelf:'debut'},f)]){
  let ready=false,calls=0,state;
  const fetch=async()=>{calls++;return ready?new Response('{"items":[],"total_vtubers":2}'):new Response('{}',{status:503});};
  const load=createRequestLoader(()=>fetcher(fetch),s=>{state=s;});
  await load();assert.equal(state.error,true);
  let retry;
  const element=DataError({onRetry:()=>{retry=load();}});
  const markup=renderToStaticMarkup(createElement(DataError,{onRetry:load}));
  assert.match(markup,/ข้อมูลไม่พร้อมชั่วคราว ลองใหม่อีกครั้ง/);assert.match(markup,/role="alert"/);assert.match(markup,/type="button"/);
  ready=true;element.props.children[1].props.onClick();await retry;
  assert.equal(state.error,false);assert.ok(state.data);assert.equal(calls,2);
 }
});

test('stale responses and unmounted loaders cannot overwrite current UI state',async()=>{
 const pending=[];let state;
 const load=createRequestLoader(()=>new Promise(resolve=>pending.push(resolve)),s=>{state=s;});
 const first=load(),second=load();pending[1]('new');await second;pending[0]('old');await first;
 assert.equal(state.data,'new');
 const third=load();load.cancel();pending[2]('unmounted');await third;assert.equal(state.data,'new');
});
