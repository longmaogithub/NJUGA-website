const DEFAULT_ORDER=['九州风物','地图上','招新','其他'];
export function articleCategoryNames(config,articles=[]){
 const categories=config?.categories ?? [];
 if(!Array.isArray(categories))throw new Error('文章栏目必须是列表');
 const names=categories.map(item=>{
  const name=item?.name;
  if(typeof name!=='string'||!name.trim()||name!==name.trim()||name.length>30||name==='全部')throw new Error('栏目名称须为 1–30 个字符，不含首尾空格，且不能为“全部”');
  return name;
 });
 if(new Set(names).size!==names.length)throw new Error('文章栏目名称不能重复');
 // Keep existing articles discoverable if their category was renamed/removed.
 const legacy=[...new Set(articles.map(a=>a.category))].filter(name=>!names.includes(name));
 legacy.sort((a,b)=>{
  const i=DEFAULT_ORDER.indexOf(a),j=DEFAULT_ORDER.indexOf(b);
  return (i<0?Infinity:i)-(j<0?Infinity:j)||a.localeCompare(b,'zh-CN');
 });
 return [...names,...legacy];
}
