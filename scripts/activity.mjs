import {renderMarkdown,validDate} from './content.mjs';
const esc=(s='')=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const filled=v=>typeof v==='string'&&v.trim().length>0;
const fields=[['startAt','起始时间'],['meetingPoint','集合地点'],['dismissalPoint','解散地点'],['route','活动路线'],['endNote','结束时间说明']];
export function validateActivityModules(a){
 const optional=(v,label)=>{if(v!=null&&(typeof v!=='string'||v.length>200000))throw new Error(`${label}须为文本`);};
 optional(a.precautions,'注意事项');
 if(a.itinerary!=null){
  if(typeof a.itinerary!=='object'||Array.isArray(a.itinerary))throw new Error('行程安排格式无效');
  for(const [key,label] of fields)optional(a.itinerary[key],label);
  if(filled(a.itinerary.startAt)){
   if(!/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d$/.test(a.itinerary.startAt))throw new Error('起始时间须精确到分钟');
   validDate(a.itinerary.startAt.slice(0,10));
  }
 }
 if(a.organizers!=null){
  if(!Array.isArray(a.organizers))throw new Error('组织人员须为列表');
  for(const person of a.organizers){
   if(person==null)continue;
   if(typeof person!=='object'||Array.isArray(person))throw new Error('组织人员条目无效');
   optional(person.role,'分工');optional(person.names,'人员');
  }
 }
}
export function renderActivityModules(a){
 const itinerary=fields.filter(([key])=>filled(a.itinerary?.[key])).map(([key,label])=>{
  const value=a.itinerary[key].trim();
  const html=key==='startAt'?`<time datetime="${esc(value)}+08:00">${esc(value.replace('T',' '))}</time>`:esc(value);
  return `<div class="activity-field"><h3>${label}</h3><p>${html}</p></div>`;
 }).join('');
 const people=(a.organizers??[]).filter(p=>p&&(filled(p.role)||filled(p.names))).map(p=>`<div class="activity-field">${filled(p.role)?`<h3>${esc(p.role.trim())}</h3>`:''}${filled(p.names)?`<p>${esc(p.names.trim())}</p>`:''}</div>`).join('');
 return `${filled(a.body)?renderMarkdown(a.body):''}${itinerary?`<section class="activity-module"><h2>行程安排</h2>${itinerary}</section>`:''}${filled(a.precautions)?`<section class="activity-module"><h2>注意事项</h2>${renderMarkdown(a.precautions)}</section>`:''}${people?`<section class="activity-module"><h2>组织人员</h2>${people}</section>`:''}`;
}
