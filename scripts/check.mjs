import {readFile,readdir,stat} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const files=(await readdir(root)).filter(f=>f.endsWith('.html'));
for(const file of files){
 const html=await readFile(path.join(root,file),'utf8');
 assert.equal((html.match(/<h1[ >]/g)||[]).length,1,`${file}: exactly one h1`);
 assert(!/<iframe|streamlit\.app|zhipu|MY_ZHIPU_KEY/i.test(html),`${file}: legacy dependency`);
 assert(html.includes('lang="zh-CN"')&&html.includes('name="viewport"'),`${file}: document metadata`);
 for(const m of html.matchAll(/<(?:img|script|link|a)\b[^>]*?(?:src|href)="([^"]+)"[^>]*>/g)){
  const target=m[1];
  if(/^(https?:|#|mailto:)/.test(target))continue;
  const [name,hash]=target.split('#');
  assert((await stat(path.join(root,name))).isFile(),`${file}: missing ${name}`);
  if(hash&&name.endsWith('.html'))assert((await readFile(path.join(root,name),'utf8')).includes(`id="${hash}"`),`${file}: missing anchor ${target}`);
 }
 for(const m of html.matchAll(/<img\b[^>]*>/g))assert(/alt="[^"]+"/.test(m[0]),`${file}: image alt`);
 for(const m of html.matchAll(/<a\b[^>]*target="_blank"[^>]*>/g))assert(/rel="noopener noreferrer"/.test(m[0]),`${file}: external link rel`);
}
const content=JSON.parse(await readFile(path.join(root,'data/content.json'),'utf8'));
const activities=Object.values(content.ACTIVITY_DATA).flat();
const articles=Object.values(content.ARTICLE_DATA).flat();
const journal=await readFile(path.join(root,'journal.html'),'utf8');
const escape=s=>s.replaceAll('&','&amp;').replaceAll('"','&quot;');
for(const a of articles)assert(journal.includes(escape(a.url)),`Missing article ${a.title}`);
assert.equal(new Set(activities.map(a=>a.slug)).size,activities.length,'Duplicate activity slugs');
assert.equal((await readFile(path.join(root,'CNAME'),'utf8')).trim(),'www.njuga.cn');
console.log(`PASS: ${files.length} HTML pages; local links, anchors, metadata, alt text, external links, ${articles.length} original articles, ${activities.length} activities; no Streamlit or AI runtime.`);
