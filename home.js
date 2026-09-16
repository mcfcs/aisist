(() => {
  'use strict';
  // The AISIS home page lists every tool a student uses, so the draft
  // schedules belong in that list rather than only behind the toolbar icon.
  if (!/^\/j_aisis\/welcome\.do$/i.test(location.pathname)) return;
  if (globalThis.__aisisCompanionHome) return;
  globalThis.__aisisCompanionHome = true;
  const S = globalThis.AisisSettings;
  const clean = value => String(value ?? '').replace(/\s+/g, ' ').trim();
  const style = `
    :host{font:inherit;color:inherit}
    a{color:#000080;text-decoration:underline;text-underline-offset:2px;background:none;border:0;padding:0;font:inherit;cursor:pointer}
    a:hover{color:#0000cd}a:focus-visible{outline:2px solid #000080;outline-offset:3px}
  `;
  function siteMapRow() {
    for (const row of document.querySelectorAll('tr')) {
      const cells = [...row.cells];
      if (cells.length >= 2 && /^CLASS SCHEDULE$/i.test(clean(cells[0].textContent))) return row;
    }
    return null;
  }
  function copyAttributes(source, target) {
    for (const name of ['class', 'style', 'background', 'bgcolor', 'align', 'valign', 'width']) {
      if (source.hasAttribute(name)) target.setAttribute(name, source.getAttribute(name));
    }
  }
  function add() {
    const model = siteMapRow();
    if (!model || document.querySelector('[data-companion-home]')) return;
    const row = document.createElement('tr');
    row.dataset.companionHome = '';
    copyAttributes(model, row);
    const label = document.createElement('td'), detail = document.createElement('td');
    copyAttributes(model.cells[0], label);
    copyAttributes(model.cells[1], detail);
    const host = document.createElement('span');
    const shadow = host.attachShadow({ mode: 'open' });
    const sheet = document.createElement('style');
    sheet.textContent = style;
    const open = document.createElement('a');
    open.textContent = 'MY DRAFT SCHEDULES';
    open.href = '#';
    open.addEventListener('click', event => {
      event.preventDefault();
      try { chrome.runtime.sendMessage({ type: 'planner' }); } catch { /* The planner also opens from the toolbar popup. */ }
    });
    shadow.append(sheet, open);
    label.append(host);
    detail.textContent = 'Plan your enlistment for next semester';
    row.append(label, detail);
    model.after(row);
  }
  function remove() { document.querySelector('[data-companion-home]')?.remove(); }
  S.read().then(features => { if (features.planner) add(); });
  S.subscribe(features => { if (features.planner) add(); else remove(); });
})();
