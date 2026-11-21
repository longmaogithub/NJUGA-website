'use strict';
// Preserve previously shared links to the old contact section.
if (location.pathname.endsWith('/about.html') && location.hash === '#join') {
  location.replace('join.html');
}
const mobileNav = document.querySelector('.mobile-nav');
if (mobileNav) {
  mobileNav.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      mobileNav.open = false;
      mobileNav.querySelector('summary').focus();
    }
  });
  mobileNav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => { mobileNav.open = false; }));
  matchMedia('(min-width: 992px)').addEventListener('change', event => { if (event.matches) mobileNav.open = false; });
}
for (const collection of document.querySelectorAll('[data-collection]')) {
  const tools = collection.querySelector('[data-filters]');
  const buttons = [...tools.querySelectorAll('[data-filter]')];
  const search = tools.querySelector('input');
  const items = [...collection.querySelectorAll('[data-item]')];
  const count = collection.querySelector('[data-count]');
  const empty = collection.querySelector('[data-empty]');
  let category = '全部';
  const update = () => {
    const query = search.value.trim().toLocaleLowerCase();
    let visible = 0;
    for (const item of items) {
      const show = (category === '全部' || item.dataset.category === category) && item.dataset.search.toLocaleLowerCase().includes(query);
      item.hidden = !show;
      if (show) visible++;
    }
    for (const button of buttons) {
      const active = button.dataset.filter === category;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    }
    count.textContent = `共 ${visible} 条内容`;
    empty.hidden = visible !== 0;
  };
  buttons.forEach(button => button.addEventListener('click', () => {category = button.dataset.filter; update();}));
  search.addEventListener('input', update);
  tools.hidden = false;
  count.hidden = false;
  update();
}
for (const button of document.querySelectorAll('[data-copy]')) {
  button.hidden = false;
  button.addEventListener('click', async () => {
    const status = button.parentElement.querySelector('.copy-status');
    try {
      await navigator.clipboard.writeText(button.dataset.copy);
      status.textContent = '群号已复制，请在 QQ 中搜索加入。';
    } catch {
      status.textContent = `请长按或选中群号 ${button.dataset.copy} 手动复制。`;
    }
  });
}
