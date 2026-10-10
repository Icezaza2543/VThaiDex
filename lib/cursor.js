import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

function keyFromSecret(secret){
  if(typeof secret!=='string' || !secret) throw new Error('invalid cursor secret');
  const key=Buffer.from(secret,'base64url');
  if(key.length!==32) throw new Error('invalid cursor secret');
  return key;
}
function invalid(){throw new Error('invalid cursor');}
function same(a,b){return String(a??'')===String(b??'');}

export function encodeCursor(state,{secret}={}){
  try{
    const key=keyFromSecret(secret);
    const iv=randomBytes(12);
    const cipher=createCipheriv('aes-256-gcm',key,iv);
    const plaintext=Buffer.from(JSON.stringify(state),'utf8');
    const ciphertext=Buffer.concat([cipher.update(plaintext),cipher.final()]);
    const tag=cipher.getAuthTag();
    return ['v1',iv.toString('base64url'),ciphertext.toString('base64url'),tag.toString('base64url')].join('.');
  }catch(err){
    if(err?.message==='invalid cursor secret') throw err;
    invalid();
  }
}

export function decodeCursor(token,expected,{secret,now=Date.now()}={}){
  try{
    const key=keyFromSecret(secret);
    if(typeof token!=='string') invalid();
    const parts=token.split('.');
    if(parts.length!==4 || parts[0]!=='v1') invalid();
    const iv=Buffer.from(parts[1],'base64url');
    const ciphertext=Buffer.from(parts[2],'base64url');
    const tag=Buffer.from(parts[3],'base64url');
    if(iv.length!==12 || tag.length!==16 || !ciphertext.length) invalid();
    const decipher=createDecipheriv('aes-256-gcm',key,iv);
    decipher.setAuthTag(tag);
    const plaintext=Buffer.concat([decipher.update(ciphertext),decipher.final()]);
    const state=JSON.parse(plaintext.toString('utf8'));
    if(!state || state.v!==1 || !Number.isInteger(state.pos) || !Number.isInteger(state.exp)) invalid();
    if(state.exp < Math.floor(now/1000)) invalid();
    if(expected){
      for(const keyName of Object.keys(expected)){
        if(!same(state[keyName],expected[keyName])) invalid();
      }
    }
    return state;
  }catch(err){
    if(err?.message==='invalid cursor secret') throw err;
    invalid();
  }
}
