import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,rm,cp,mkdtemp} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import Ajv from 'ajv';
import {articleCategoryNames} from './categories.mjs';
import {imagePath,httpsUrl,validDate,validateEntry,renderMarkdown,loadContent} from './content.mjs';
import {validateActivityModules,renderActivityModules} from './activity.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
test('article categories follow settings and support additional columns',()=>{
 const config={categories:[{name:'九州风物'},{name:'地图上'},{name:'招新'},{name:'其他'},{name:'校园观察'}]};
 assert.deepEqual(articleCategoryNames(config),['九州风物','地图上','招新','其他','校园观察']);
 config.categories.reverse();assert.equal(articleCategoryNames(config)[0],'校园观察');
 assert.deepEqual(articleCategoryNames({categories:[{name:'新栏目'}]},[{category:'旧栏目'}]),['新栏目','旧栏目']);
 assert.deepEqual(articleCategoryNames({categories:[]},[{category:'地图上'}]),['地图上']);
 for(const config of [{},{categories:null}])assert.deepEqual(articleCategoryNames(config),[]);
 assert.throws(()=>articleCategoryNames({categories:'invalid'}));
 for(const categories of [[{name:''}],[{name:'全部'}],[{name:' 前后空格 '}],[{name:'重复'},{name:'重复'}]])assert.throws(()=>articleCategoryNames({categories}));
});
test('activity modules allow omitted, empty, null and partial values',()=>{
 const base={slug:'empty',title:'活动',summary:'简介',published:true,eventDate:'2026-11-29',status:'报名中',cover:'/assets/images/logo.png'};
 for(const extra of [{},{body:'',itinerary:{},precautions:'',organizers:[]},{body:null,itinerary:null,precautions:null,organizers:null},{itinerary:{startAt:'',route:'  '},organizers:[{},null,{role:'',names:''}]}]){
  validateEntry({...base,...extra},'activities');validateActivityModules(extra);assert.equal(renderActivityModules(extra),'');
 }
 const html=renderActivityModules({body:'景区介绍',itinerary:{meetingPoint:'南门'},organizers:[{names:'张三'}]});
 assert(html.startsWith('<p>景区介绍</p>'));assert(!html.includes('正文</h'));
 assert(html.includes('<h2>行程安排</h2>')&&html.includes('<h3>集合地点</h3>'));
 assert(!html.includes('起始时间')&&!html.includes('解散地点')&&!html.includes('注意事项'));
 assert(html.includes('张三')&&!html.includes('undefined'));
});
test('activity start time has minute precision and no implicit timezone conversion',()=>{
 const a={itinerary:{startAt:'2026-11-29T09:15'}};validateActivityModules(a);
 assert(renderActivityModules(a).includes('2026-11-29 09:15'));
 assert(renderActivityModules(a).includes('datetime="2026-11-29T09:15+08:00"'));
 for(const date of ['2026-11-29T24:00','2026-11-29T09:60','2026-02-30T09:15','2026-11-29','2026-11-29T09:15:00'])assert.throws(()=>validateActivityModules({itinerary:{startAt:date}}));
});
test('start and end times are independently optional',()=>{
 for(const itinerary of [{},{startAt:'',endAt:''},{startAt:null,endAt:null}]){
  validateActivityModules({itinerary});assert.equal(renderActivityModules({itinerary}),'');
 }
 const endOnly={itinerary:{endAt:'2026-11-29T14:00'}};validateActivityModules(endOnly);
 const html=renderActivityModules(endOnly);assert(html.includes('<h3>起止时间</h3>'));assert(html.includes('结束：'));assert(!html.includes('开始：'));
 const both={itinerary:{startAt:'2026-11-29T09:15',endAt:'2026-11-29T14:00'}};validateActivityModules(both);
 assert(renderActivityModules(both).includes('开始：')&&renderActivityModules(both).includes('结束：'));
 assert.throws(()=>validateActivityModules({itinerary:{endAt:'2026-11-29T25:00'}}));
 assert.throws(()=>validateActivityModules({itinerary:{startAt:'2026-11-29T14:00',endAt:'2026-11-29T09:15'}}));
});
test('activity modules escape plain fields and sanitize rich text',()=>{
 const html=renderActivityModules({itinerary:{route:'<script>bad()</script>'},precautions:'<script>bad()</script>\n\n**注意**',organizers:[{role:'<img src=x onerror=bad()>',names:'A&B'}]});
 assert(!html.includes('<script>')&&!html.includes('<img'));assert(html.includes('<strong>注意</strong>'));assert(html.includes('A&amp;B'));
});
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
