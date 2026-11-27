import {readFile, readdir, stat} from 'node:fs/promises';
import path from 'node:path';
import {marked} from 'marked';
import sanitizeHtml from 'sanitize-html';
import {articleCategoryNames} from './categories.mjs';

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export function imagePath(value) {
  if (typeof value !== 'string') throw new Error('图片路径不能为空');
  let s;
  try { s = decodeURIComponent(value.replace(/^\//, '')); } catch { throw new Error('图片路径编码无效'); }
  if (!/^assets\/images\/[^/\\<>:"|?*\x00-\x1f]+\.(?:png|jpe?g|webp|gif|avif)$/i.test(s)) throw new Error(`图片须为图片库中的 PNG/JPG/WebP/GIF/AVIF：${value}`);
  return s;
}
export function httpsUrl(value, required=false) {
  if (!value && !required) return '';
  let u;
  try { u = new URL(value); } catch { throw new Error('链接必须是有效的 HTTPS 网址'); }
  if (u.protocol !== 'https:' || u.username || u.password || /\s/.test(value)) throw new Error('链接必须是无用户名密码的 HTTPS 网址');
  return value;
}
export function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(value)) || new Date(value).toISOString().slice(0,10)!==value) throw new Error(`日期无效：${value}`);
}
function text(value, label, required=true) {
  if (typeof value !== 'string' || (required && !value.trim())) throw new Error(`${label}不能为空`);
  if (value.length > 200000) throw new Error(`${label}过长`);
}
export function validateEntry(a, kind) {
  if (!a || typeof a !== 'object' || !slugPattern.test(a.slug)) throw new Error('网址标识须为小写英文、数字、短横线');
  text(a.title,'标题'); text(a.summary,'摘要');
  if (typeof a.published !== 'boolean') throw new Error('在官网显示必须为开关值');
  if (kind !== 'pages') { imagePath(a.cover); httpsUrl(a.url); validDate(kind === 'articles' ? a.date : a.eventDate); }
  if (kind === 'articles') { text(a.author,'作者'); text(a.category,'分类'); }
  if (kind === 'activities' && !['报名中','进行中','已结束'].includes(a.status)) throw new Error('活动状态无效');
  if (kind === 'pages' && typeof a.showInNav !== 'boolean') throw new Error('导航开关无效');
  text(a.body ?? '', '正文', kind === 'pages' || (kind === 'articles' && !a.url));
}
export function renderMarkdown(body='') {
  return sanitizeHtml(marked.parse(body), {
    allowedTags: ['h2','h3','h4','p','br','strong','em','s','blockquote','ul','ol','li','a','img','figure','figcaption','hr','pre','code','table','thead','tbody','tr','th','td'],
    allowedAttributes: {a:['href','target','rel'],img:['src','alt','loading','decoding'],ol:['start']},
    allowedSchemes: ['https','mailto'], allowProtocolRelative: false,
    transformTags: {
      h1: 'h2',
      a(tag,attrs) {
        const href=attrs.href ?? '';
        const safe=/^https:\/\//.test(href)||/^mailto:[^\s]+$/.test(href)||/^(?:#|(?:page|article|activity)-[a-z0-9-]+\.html(?:#|$))/.test(href);
        return {tagName:'a',attribs:safe?{href,...(href.startsWith('https:')?{target:'_blank',rel:'noopener noreferrer'}:{})}:{}};
      },
      img(tag,attrs) {
        try { return {tagName:'img',attribs:{src:imagePath(attrs.src).split('/').map(encodeURIComponent).join('/'),alt:attrs.alt || '文章配图',loading:'lazy',decoding:'async'}}; }
        catch { return {tagName:'span',attribs:{}}; }
      },
    },
  });
}
export async function loadContent(root) {
  const result={};
  for (const kind of ['articles','activities','pages']) {
    const dir=path.join(root,'content',kind);
    result[kind]=[];
    for (const file of (await readdir(dir)).filter(f=>f.endsWith('.json')).sort()) {
      const a=JSON.parse(await readFile(path.join(dir,file),'utf8'));
      try {
        validateEntry(a,kind);
        if (file !== `${a.slug}.json`) throw new Error('文件名与网址标识不一致；请勿更改已发布条目的网址标识');
        if (kind!=='pages' && !(await stat(path.join(root,imagePath(a.cover)))).isFile()) throw new Error('封面图片不存在');
      } catch (error) { throw new Error(`${kind}/${file}: ${error.message}`); }
      if (a.published) result[kind].push(a);
    }
  }
  result.settings=JSON.parse(await readFile(path.join(root,'content/settings.json'),'utf8'));
  const categoryConfig=JSON.parse(await readFile(path.join(root,'content/article-categories.json'),'utf8'));
  result.articleCategories=articleCategoryNames(categoryConfig,result.articles);
  const s=result.settings;
  for (const name of ['heroTitle','heroDescription','heroCaption','aboutIntro','aboutBody','wechat','xiaohongshuName']) text(s[name],name);
  if (!/^[0-9]{5,12}$/.test(s.qq)) throw new Error('QQ 群号无效');
  if (!/^https:\/\/www\.xiaohongshu\.com\/user\/profile\//.test(httpsUrl(s.xiaohongshuUrl,true))) throw new Error('小红书主页链接无效');
  await stat(path.join(root,imagePath(s.heroCover)));
  return result;
}
