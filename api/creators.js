import { requireCursorSecret } from '../lib/config.js';
import { logApiError } from '../lib/api-error.js';
import * as defaultStorage from '../lib/storage.js';
import { decodeCursor, encodeCursor } from '../lib/cursor.js';
import { jsonResponse, noIndexHeaders } from '../lib/http.js';
import { parseCreatorQuery } from '../lib/public-schema.js';
import { toPublicCreator } from '../lib/discover.js';

function sortKey(value){return String(value??'').normalize('NFKC').toLocaleLowerCase('th');}
export async function handleCreators(request,{storage=defaultStorage,cursorSecret=process.env.VTHAIDEX_CURSOR_SECRET,now=Date.now()}={}){
  if(request.method!=='GET') return jsonResponse(405,{error:'method_not_allowed'},{...noIndexHeaders(),Allow:'GET'});
  let query;
  try{query=parseCreatorQuery(new URL(request.url));}catch{return jsonResponse(400,{error:'invalid_query'},noIndexHeaders());}
  try{requireCursorSecret(cursorSecret);}catch(err){logApiError('/api/creators',err);return jsonResponse(503,{error:'data_unavailable'},noIndexHeaders());}
  let snapshot;
  try{snapshot=await storage.readCurrentSnapshot();}catch(err){logApiError('/api/creators',err);return jsonResponse(503,{error:'data_unavailable'},noIndexHeaders());}
  if(!snapshot){logApiError('/api/creators',new Error('snapshot unavailable'));return jsonResponse(503,{error:'data_unavailable'},noIndexHeaders());}
  const expected={snapshot:snapshot.snapshot_id,q:query.q,platform:query.platform,status:query.status,scope:query.scope};
  let pos=0;
  if(query.cursor){
    try{pos=decodeCursor(query.cursor,expected,{secret:cursorSecret,now}).pos;}catch{return jsonResponse(400,{error:'invalid_cursor'},noIndexHeaders());}
  }
  const needle=sortKey(query.q);
  const filtered=snapshot.creators
    .filter(c=>!needle||sortKey(c.name).includes(needle)||sortKey(c.agency).includes(needle))
    .filter(c=>!query.platform||(c.platforms||[]).some(p=>p.name===query.platform))
    .filter(c=>!query.status||c.status===query.status)
    .filter(c=>!query.scope||(query.scope==='independent'?!c.agency:Boolean(c.agency)))
    .sort((a,b)=>sortKey(a.name).localeCompare(sortKey(b.name),'th'));
  if(!Number.isInteger(pos)||pos<0||pos>filtered.length) return jsonResponse(400,{error:'invalid_cursor'},noIndexHeaders());
  const items=filtered.slice(pos,pos+query.limit).map(toPublicCreator);
  const nextPos=pos+items.length;
  const next_cursor=nextPos<filtered.length?encodeCursor({...expected,v:1,pos:nextPos,exp:Math.floor(now/1000)+900},{secret:cursorSecret,now}):null;
  return jsonResponse(200,{items,next_cursor},noIndexHeaders());
}

export function GET(request){return handleCreators(request);}
export default {fetch:GET};
