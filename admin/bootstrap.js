// The GitHub API, not this page, authorizes all writes. Never embed a token here.
(async () => {
  const status=document.querySelector('#status');
  if (location.protocol !== 'https:' && !['localhost','127.0.0.1','[::1]'].includes(location.hostname)) {
    status.textContent='请通过 HTTPS 打开后台，确认地址栏没有证书警告后再登录。';
    const link=document.createElement('a'); link.href='https://www.njuga.cn/admin/'; link.textContent='打开 HTTPS 管理后台'; status.after(link); return;
  }
  try {
    const response=await fetch('config.json');
    if (!response.ok) throw new Error('config');
    const config=await response.json();
    const {init}=await import('./vendor/cms-entry.js');
    await init({config:{...config,load_config_file:false}});
    document.querySelector('#loading').remove();
  } catch {
    status.textContent='后台暂时加载失败。请刷新重试，或查看发布说明检查部署是否完成。';
  }
})();
