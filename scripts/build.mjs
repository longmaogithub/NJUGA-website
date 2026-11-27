import { readFile, writeFile, readdir, mkdir, rm, cp } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {loadContent, renderMarkdown, imagePath} from './content.mjs';
import {build as bundle} from 'esbuild';
import {validateActivityModules,renderActivityModules} from './activity.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const {articles, activities, pages: customPages, settings, articleCategories} = await loadContent(root);
for(const a of activities)validateActivityModules(a);
const out=path.join(root,'dist');
await rm(out,{recursive:true,force:true});
await mkdir(out,{recursive:true});
await cp(path.join(root,'assets'),path.join(out,'assets'),{recursive:true,filter:src=>!src.includes(path.join('assets','images')+path.sep)||/\.(png|jpe?g|webp|gif|avif)$/i.test(src)});
await cp(path.join(root,'admin'),path.join(out,'admin'),{recursive:true,filter:src=>!src.endsWith('cms-entry.js')});
await bundle({entryPoints:[path.join(root,'admin/cms-entry.js')],outdir:path.join(out,'admin/vendor'),bundle:true,splitting:true,format:'esm',minify:true,loader:{'.woff2':'file','.png':'file','.svg':'file'},logLevel:'warning'});
// esbuild leaves new URL('assets/...', import.meta.url) intact; include the
// package's fonts and workers alongside the generated chunks.
await cp(path.join(root,'node_modules/@sveltia/cms/npm/assets'),path.join(out,'admin/vendor/assets'),{recursive:true,filter:src=>!src.endsWith('.map')});
await cp(path.join(root,'node_modules/@sveltia/cms/LICENSE.txt'),path.join(out,'admin/vendor/LICENSE.txt'));
for(const file of ['CNAME','.nojekyll','robots.txt']) await cp(path.join(root,file),path.join(out,file));
const esc = (s = '') => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const plain = s => s.replace(/<br\s*\/?\s*>/gi,'\n').replace(/<[^>]*>/g,'').trim();
const dateKey = s => s.replace(/年|月/g,'-').replace('日','').split('-').map(x=>x.padStart(2,'0')).join('-');
articles.sort((a,b)=>dateKey(b.date).localeCompare(dateKey(a.date)));
activities.sort((a,b)=>b.eventDate.localeCompare(a.eventDate));
const img = (src,alt,cls='',eager=false) => `<img src="${esc(imagePath(src).split('/').map(encodeURIComponent).join('/'))}" alt="${esc(alt)}" class="${cls}" ${eager?'fetchpriority="high"':'loading="lazy"'} decoding="async">`;
const external = (url,label,cls='text-link') => `<a class="${cls}" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(label)}<span class="visually-hidden">（在新标签页打开）</span></a>`;
const navItems = [['index.html','首页'],['about.html','关于地协'],['activities.html','活动'],['journal.html','文章精选'],...customPages.filter(p=>p.showInNav).map(p=>[`page-${p.slug}.html`,p.title])];
function layout(file,title,description,content,active=file){
return `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#650052">
<title>${esc(title)} · 南京大学地理协会</title><meta name="description" content="${esc(description)}"><link rel="canonical" href="https://www.njuga.cn/${file==='index.html'?'':file}">
<meta property="og:title" content="${esc(title)} · 南京大学地理协会"><meta property="og:description" content="${esc(description)}"><meta property="og:type" content="website"><meta property="og:image" content="https://www.njuga.cn/assets/images/zhongshan.webp">
<link rel="icon" type="image/svg+xml" sizes="any" href="assets/favicon.svg"><link rel="stylesheet" href="assets/vendor/bootstrap.min.css"><link rel="stylesheet" href="assets/site.css">
<script defer src="assets/site.js"></script>
</head>
<body><a class="skip-link" href="#main">跳至正文</a><header class="site-header"><nav class="navbar navbar-expand-lg container" aria-label="主导航">
<a class="navbar-brand" href="index.html" aria-label="南京大学地理协会首页"><img src="assets/images/logo.png" alt="南京大学地理协会" width="228" height="95"></a>
<div class="desktop-nav d-none d-lg-flex ms-auto"><ul class="navbar-nav ms-auto align-items-lg-center">${navItems.map(([url,label])=>`<li class="nav-item"><a class="nav-link ${active===url?'active':''}" ${active===url?'aria-current="page"':''} href="${url}">${label}</a></li>`).join('')}<li class="nav-item"><a class="btn btn-purple join-nav" ${active==='join.html'?'aria-current="page"':''} href="join.html">加入我们</a></li></ul></div><details class="mobile-nav d-lg-none"><summary class="navbar-toggler" aria-label="主导航菜单"><span class="navbar-toggler-icon" aria-hidden="true"></span></summary><div class="mobile-menu"><ul class="navbar-nav ms-auto align-items-lg-center">${navItems.map(([url,label])=>`<li class="nav-item"><a class="nav-link ${active===url?'active':''}" ${active===url?'aria-current="page"':''} href="${url}">${label}</a></li>`).join('')}<li class="nav-item"><a class="btn btn-purple join-nav" ${active==='join.html'?'aria-current="page"':''} href="join.html">加入我们</a></li></ul></div></details></nav></header>
<main id="main">${content}</main><footer class="site-footer compact-footer"><div class="container"><span>© 2026 南京大学地理协会</span></div></footer></body></html>`;
}
const heading = (eyebrow,title,text) => `<section class="page-heading container"><p class="eyebrow">${eyebrow}</p><h1>${title}</h1><p class="lede">${text}</p></section>`;
const sectionHeading = (eyebrow,title,link,label) => `<div class="section-heading"><div><p class="eyebrow">${eyebrow}</p><h2>${title}</h2></div>${link?`<a class="text-link" href="${link}">${label}</a>`:''}</div>`;
function story(a,compact=false){
 const local=Boolean(a.body?.trim()), href=local?`article-${a.slug}.html`:a.url;
 const attrs=local?'':' target="_blank" rel="noopener noreferrer"';
 return `<article class="story" data-item data-category="${esc(a.category)}" data-search="${esc(a.title+' '+a.author+' '+a.summary)}"><a class="story-image" href="${esc(href)}"${attrs}>${img(a.cover,a.title)}<span class="visually-hidden">阅读文章${local?'':'（在新标签页打开）'}</span></a><div class="story-meta"><span>${esc(a.category)}</span><time datetime="${a.date}">${esc(a.date)}</time></div><h3><a class="story-title" href="${esc(href)}"${attrs}>${esc(a.title)}</a></h3>${compact?'':`<p>${esc(a.summary)}</p><p class="byline">文 / ${esc(a.author)}</p>`}</article>`;
}
function activity(a,level=2){return `<article class="activity-row" data-item data-category="${esc(a.status)}" data-search="${esc(a.title+' '+(a.body ?? ''))}"><a class="activity-image" href="activity-${a.slug}.html">${img(a.cover,a.title)}</a><div class="activity-copy"><div class="story-meta"><span class="status">${esc(a.status)}</span><time datetime="${a.eventDate}">${a.eventDate.replaceAll('-',' / ')}</time></div><h${level}><a href="activity-${a.slug}.html">${esc(a.title)}</a></h${level}><p>${esc(a.summary || (a.body ?? '').split('\n').filter(Boolean)[0])}</p><a class="text-link" href="activity-${a.slug}.html">活动详情</a></div></article>`;}
function filters(categories,label){return `<div class="filter-tools" data-filters hidden><div class="filter-buttons" role="group" aria-label="${label}分类">${['全部',...categories].map((c,i)=>`<button class="filter-button ${!i?'is-active':''}" type="button" data-filter="${esc(c)}" aria-pressed="${!i}">${esc(c)}</button>`).join('')}</div><div class="search-wrap"><label for="content-search" class="visually-hidden">搜索${label}</label><input id="content-search" class="form-control" type="search" placeholder="搜索${label}" autocomplete="off"></div></div><p class="filter-count" data-count role="status" aria-live="polite" hidden></p>`;}
const home = `<section class="hero"><div class="hero-picture">${img(settings.heroCover,settings.heroCaption,'',true)}</div><div class="hero-shade"></div><div class="container hero-content"><p class="eyebrow">南京大学地理协会 · NJUGA</p><h1>${esc(settings.heroTitle).replaceAll('\n','<br>')}</h1><p>${esc(settings.heroDescription)}</p><a class="btn btn-light" href="about.html">认识地协</a></div><div class="hero-caption">${esc(settings.heroCaption)}</div></section>
<section class="container section">${sectionHeading('ACTIVITIES','最近活动','activities.html','全部活动')}${activities.slice(0,2).map(a=>activity(a,3)).join('')}</section>
<section class="activities-home"><div class="container section">${sectionHeading('FIELD JOURNAL','文章精选','journal.html','全部文章')}<div class="story-grid">${articles.slice(0,3).map(a=>story(a,true)).join('')}</div></div></section>`;
const activityPage = heading('ACTIVITIES','协会活动','查看活动安排与往期记录，具体参与条件以各场活动通知为准。')+`<section class="container section section-tight">${activities.some(a=>a.status!=='已结束')?'':'<p class="notice">目前暂无正在报名的活动，以下为往期记录。</p>'}${activities.map(a=>activity(a)).join('')}</section>`;
const journalPage = heading('FIELD JOURNAL','文章精选','地协的地方观察、地图故事与阅读分享。')+`<section class="container section section-tight" data-collection>${filters(articleCategories,'文章')}<div class="story-grid">${articles.map(a=>story(a)).join('')}</div><p class="empty-state" data-empty hidden>没有找到符合条件的文章，请尝试其他关键词。</p></section>`;
const departments = [['活动部','活动策划、路线设计与实地踩点，让每一次出发都有准备。'],['宣传部','推文、海报、摄影与新媒体，把我们看见的世界分享出去。'],['学术部','地理科普、学术讲座与 GIS 交流，让好奇心获得新的工具。'],['联络部','邀请嘉宾、联系伙伴，连接更多热爱地理的人。'],['办公室','物资、财务与后勤支持，为每一次活动提供保障。']];
const aboutPage = heading('ABOUT NJUGA','关于地协',esc(settings.aboutIntro))+`<section class="container section section-tight"><div class="about-overview"><h2>我们做什么</h2><p>${esc(settings.aboutBody)}</p></div><div class="department-grid purpose-grid"><article><h3>行走与考察</h3><p>组织城市漫步和野外考察，在街巷、遗址与自然景观中发现地理问题。</p></article><article><h3>阅读与交流</h3><p>开展阅读分享、学术讲座和地理科普，交流不同专业的观察。</p></article><article><h3>地图与写作</h3><p>制作校园与城市主题地图，撰写地方观察和原创推文，记录探索成果。</p></article></div></section><section class="container section section-tight">${sectionHeading('GALLERY','活动现场')}<div class="gallery-grid"><figure>${img('assets/images/zhongshan.webp','协会成员漫步钟山')}<figcaption>钟山 · 城市漫步</figcaption></figure><figure>${img('assets/images/market.webp','地协参加南大星光集市')}<figcaption>南大星光集市</figcaption></figure><figure>${img('assets/images/wuchaomen.webp','午朝门活动照片')}<figcaption>午朝门 · 行走南京</figcaption></figure></div></section><section class="container section section-tight"><details class="department-details"><summary>协会分工 · 五个部门</summary><div class="department-grid">${departments.map(([name,desc])=>`<article><h3>${name}</h3><p>${desc}</p></article>`).join('')}</div></details></section>`;
const joinPage = heading('JOIN US','加入我们','想了解下一次活动，或参与协会工作，可以从活动群开始。')+`<section class="container section section-tight join-layout"><div><h2>谁可以参与？</h2><p>欢迎不同专业、不同年级、对地理感兴趣的同学，不要求已有地理基础。</p><p>具体活动可能限定参与对象、名额或报名方式，请以当次活动通知为准。</p><h2>如何参与？</h2><p>在 QQ 搜索活动群号，加入活动群，查看近期通知，并按活动要求报名。</p><p>如果希望参与协会部门工作，请关注招新通知，或在群内咨询。</p></div><div class="contact-panel"><h2>联系与关注</h2><div class="contact-line"><span>活动 QQ 群</span><strong>${esc(settings.qq)}</strong><button class="copy-button" data-copy="${esc(settings.qq)}" type="button" hidden>复制群号</button><p class="copy-status" role="status" aria-live="polite"></p></div><div class="contact-line"><span>微信公众号</span><strong>${esc(settings.wechat)}</strong></div><div class="contact-line"><span>小红书</span>${external(settings.xiaohongshuUrl,settings.xiaohongshuName)}</div><p class="contact-help">微信中搜索“${esc(settings.wechat)}”；点击小红书账号可直接打开主页。</p></div></section>`;
const pages = new Map([
 ['index.html',layout('index.html','以地为书，一起读懂山河','南京大学地理协会官网。探索城市漫步、野外考察、地理阅读与协会活动。',home)],
 ['activities.html',layout('activities.html','协会活动','查看南京大学地理协会活动通知、活动路线与往期记录。',activityPage)],
 ['journal.html',layout('journal.html','文章精选','阅读南京大学地理协会的原创推文、地方观察与阅读分享。',journalPage)],
 ['about.html',layout('about.html','关于地协','了解南京大学地理协会的活动方向、现场记录与部门分工。',aboutPage)],
 ['join.html',layout('join.html','加入我们','了解参与方式，联系南京大学地理协会。',joinPage)]
]);
for (const a of activities) {
 const file = `activity-${a.slug}.html`;
 const body = `<div class="container detail-shell"><a href="activities.html" class="text-link">返回全部活动</a><header class="detail-header"><p class="eyebrow">${esc(a.status)} · 协会活动</p><h1>${esc(a.title)}</h1><p>活动日期 <time datetime="${a.eventDate}">${a.eventDate.replaceAll('-',' / ')}</time></p></header>${img(a.cover,a.title,'detail-cover',true)}<div class="detail-body">${renderActivityModules(a)}</div><div class="detail-actions">${a.url?external(a.url,'查看原始活动通知','btn btn-purple'):''}</div></div>`;
 pages.set(file,layout(file,a.title,(a.summary || a.body || a.title).slice(0,140),body,'activities.html'));
}
for (const a of articles.filter(a=>a.body?.trim())) {
 const file=`article-${a.slug}.html`;
 const body=`<article class="container detail-shell"><a href="journal.html" class="text-link">返回全部文章</a><header class="detail-header"><p class="eyebrow">${esc(a.category)}</p><h1>${esc(a.title)}</h1><p>${esc(a.author)} · <time datetime="${a.date}">${a.date}</time></p></header>${img(a.cover,a.title,'detail-cover',true)}<div class="detail-body">${renderMarkdown(a.body)}</div>${a.url?`<div class="detail-actions">${external(a.url,'查看原文')}</div>`:''}</article>`;
 pages.set(file,layout(file,a.title,a.summary,body,'journal.html'));
}
for (const p of customPages) {
 const file=`page-${p.slug}.html`;
 pages.set(file,layout(file,p.title,p.summary,`<article class="container detail-shell"><header class="detail-header"><h1>${esc(p.title)}</h1><p class="lede">${esc(p.summary)}</p></header><div class="detail-body">${renderMarkdown(p.body)}</div></article>`));
}
pages.set('404.html',layout('404.html','页面未找到','此页面不存在，请返回南京大学地理协会首页。',heading('PAGE NOT FOUND','这一页，暂时不在地图上。','链接可能已变更。你可以从首页重新出发。')+'<div class="container section-tight section"><a class="btn btn-purple" href="https://www.njuga.cn/">返回首页</a></div>'));
// Absolute asset paths on the error page work for unknown nested URLs.
pages.set('404.html',pages.get('404.html').replaceAll('href="assets/','href="https://www.njuga.cn/assets/').replaceAll('src="assets/','src="https://www.njuga.cn/assets/').replace(/href="((?:index|activities|journal|about|join)\.html[^\"]*)"/g,'href="https://www.njuga.cn/$1"'));
for(const [file,html] of pages) await writeFile(path.join(out,file),html+'\n');
await writeFile(path.join(out,'sitemap.xml'),'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+[...pages.keys()].filter(p=>p!=='404.html').map(p=>`<url><loc>https://www.njuga.cn/${p==='index.html'?'':p}</loc></url>`).join('')+'</urlset>\n');
console.log(`Built ${pages.size} pages, ${articles.length} articles, ${activities.length} activities.`);
