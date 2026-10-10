import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const publicPages=['index.html','analytics.html','directory.html','discover.html','about.html','terms.html','terms-of-use.html','privacy.html','data-license.html'];
const legalLinks=['/terms','/terms-of-use','/privacy','/data-license'];
const text=file=>readFileSync(new URL(`../${file}`,import.meta.url),'utf8');

test('every public page has unique SEO metadata, canonical URL and a React mount point',()=>{
  const titles=new Set();
  for(const file of publicPages){
    const html=text(file),title=html.match(/<title>([^<]+)<\/title>/)?.[1];
    assert.ok(title,`${file} missing title`);assert.equal(titles.has(title),false,`${file} duplicate title`);titles.add(title);
    assert.match(html,/<meta name="description" content="[^"]+">/);
    assert.match(html,/<link rel="canonical" href="https:\/\/vthaidex\.vercel\.app[^"]*">/);
    assert.match(html,/<meta property="og:title" content="[^"]+">/);
    assert.match(html,/<meta property="og:description" content="[^"]+">/);
    assert.match(html,/<div id="root" data-page="[a-z-]+"><\/div>/);
  }
});
test('contribution page is noindex and makes no analytics or third-party font requests',()=>{
  const html=text('contribute.html');assert.match(html,/<meta name="robots" content="noindex, nofollow">/);
  assert.equal(/gtag|googletagmanager|plausible|posthog/i.test(html),false);
  assert.equal(/fonts\.googleapis\.com|fonts\.gstatic\.com/i.test(html),false);
});
test('discover is in the main nav and on the home page',()=>{
  assert.match(text('src/components/Layout.jsx'), /href: '\/discover', label: 'ค้นพบ'/);
  assert.match(text('src/pages/Home.jsx'), /href: '\/discover'/);
  assert.match(text('src/pages/Discover.jsx'), /สุ่มใหม่/);
  assert.match(text('src/pages/Discover.jsx'), /เพิ่งเดบิวต์/);
  assert.match(text('src/components/ui.jsx'), /ไปที่ช่อง/);
  assert.equal(text('src/pages/Discover.jsx').includes('sort'), false);
});
test('shared layout links every legal page from the footer',()=>{
  const layout=text('src/components/Layout.jsx');
  for(const href of legalLinks) assert.ok(layout.includes(`href: '${href}'`),`Layout missing ${href}`);
});
test('navigation uses real routes instead of hash routes',()=>{
  for(const file of [...publicPages,'contribute.html']) assert.equal(/href="#(?:overview|directory|about|contribute)"/.test(text(file)),false);
});
test('robots and sitemap expose only intended public surfaces',()=>{
  const robots=text('public/robots.txt');assert.match(robots,/Disallow: \/api\//);assert.match(robots,/Disallow: \/contribute/);assert.match(robots,/Disallow: \/internal\//);
  const sitemap=text('public/sitemap.xml');for(const path of ['/','/directory','/discover','/about','/terms','/terms-of-use','/privacy','/data-license']) assert.ok(sitemap.includes(`https://vthaidex.vercel.app${path}`));
  assert.equal(sitemap.includes('https://vthaidex.vercel.app/contribute'),false);
});
test('repository license separates CC BY-NC-ND site content, source code, public facts and compiled data rights',()=>{
  const license=text('LICENSE.md');assert.match(license,/CC BY-NC-ND 4\.0/i);assert.match(license,/Database.*All Rights Reserved/is);assert.match(license,/third-party/i);
  assert.match(license,/source code.*not covered by CC BY/i);
  assert.match(license,/underlying public facts.*where applicable law/i);
  const page=text('src/pages/legal.jsx');assert.match(page,/source code/i);assert.match(page,/ข้อเท็จจริงสาธารณะ/);
});


import { existsSync } from 'node:fs';

test('legacy bulk-export and hash-app artifacts are removed',()=>{
  for(const path of ['app.js','data/bootstrap-summary.json','scripts/publish.ps1']){
    assert.equal(existsSync(new URL(`../${path}`,import.meta.url)),false,`${path} must not ship after cutover`);
  }
  const readme=text('README.md');
  assert.equal(readme.includes('public-creators.json'),false);
  assert.equal(readme.includes('scripts/export_public.py'),false);
});
