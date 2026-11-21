import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,rm,cp,mkdtemp} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import Ajv from 'ajv';
import {imagePath,httpsUrl,validDate,validateEntry,renderMarkdown,loadContent} from './content.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
test('CMS configuration conforms to the installed version schema',async()=>{
 const schema=JSON.parse(await readFile(path.join(root,'node_modules/@sveltia/cms/schema/sveltia-cms.json'),'utf8'));
 const config=JSON.parse(await readFile(path.join(root,'admin/config.json'),'utf8'));
 const ajv=new Ajv({strict:false,allErrors:true,validateFormats:false});
 const validate=ajv.compile(schema);
 assert(validate(config),JSON.stringify(validate.errors));
 assert.equal(config.backend.repo,'longmaogithub/NJUGA-website');
 assert.equal(config.backend.open_authoring,false);
 assert.deepEqual(config.backend.auth_methods,['token']);
});
test('URLs, dates and media paths reject unsafe or broken input',()=>{
 for(const url of ['javascript:alert(1)','http://example.com','//example.com','https://user:pass@example.com'])assert.throws(()=>httpsUrl(url));
 assert.equal(httpsUrl('https://example.com/a'),'https://example.com/a');
 for(const date of ['2026-02-30','2026-13-01','not-a-date'])assert.throws(()=>validDate(date));
 validDate('2028-02-29');
 for(const src of ['../../admin/index.html','/assets/images/x.svg','assets/images/../x.png','assets/images/%2f..%2fx.png','data:image/png,x','/assets/images/x.html'])assert.throws(()=>imagePath(src));
 assert.equal(imagePath('/assets/images/南京 照片.png'),'assets/images/南京 照片.png');
});
test('rich text keeps formatting and strips executable content',()=>{
 const html=renderMarkdown('# Title\n\n**Bold**\n\n<script>alert(1)</script><iframe src="https://evil.test"></iframe><img src="/assets/images/photo.png" onerror="alert(1)"><a href="javascript:alert(1)">x</a>\n\n[link](https://example.com)\n\n![photo](/assets/images/photo.png)');
 assert(html.includes('<h2>Title</h2>')&&html.includes('<strong>Bold</strong>'));
 assert(!/<script|<iframe|onerror|javascript:/i.test(html));
 assert(html.includes('rel="noopener noreferrer"'));
 assert(html.includes('src="assets/images/photo.png"'));
});
test('articles require either a body or an HTTPS source',()=>{
 const entry={slug:'sample',title:'示例',summary:'摘要',published:true,date:'2026-11-21',cover:'/assets/images/logo.png',author:'地协',category:'其他',body:''};
 assert.throws(()=>validateEntry(entry,'articles'));
 validateEntry({...entry,url:'https://example.com'},'articles');
 validateEntry({...entry,body:'正文'},'articles');
 assert.throws(()=>validateEntry({...entry,slug:'../index',body:'正文'},'articles'));
});
test('publication flags and entry deletion remove pages from build input',async()=>{
 const temp=await mkdtemp(path.join(os.tmpdir(),'njuga-content-'));
 try {
  await cp(path.join(root,'content'),path.join(temp,'content'),{recursive:true});
  await cp(path.join(root,'assets/images'),path.join(temp,'assets/images'),{recursive:true});
  const first=await loadContent(temp);
  const file=path.join(temp,'content/articles',first.articles[0].slug+'.json');
  const entry=JSON.parse(await readFile(file,'utf8'));entry.published=false;await writeFile(file,JSON.stringify(entry));
  const hidden=await loadContent(temp);assert.equal(hidden.articles.length,first.articles.length-1);
  await rm(file);assert.equal((await loadContent(temp)).articles.length,hidden.articles.length);
 } finally {await rm(temp,{recursive:true,force:true});}
});
