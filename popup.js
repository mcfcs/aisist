(async () => {
  'use strict';
  const S = globalThis.AisisSettings;
  const boxes = Object.fromEntries(Object.keys(S.DEFAULTS).map(key => [key, document.getElementById(key)]));
  const status = document.getElementById('status');
  const apply = values => { for (const [key, box] of Object.entries(boxes)) box.checked = values[key]; };
  const describe = values => {
    const off = Object.keys(S.DEFAULTS).filter(key => !values[key]).map(key => S.LABELS[key].name);
    status.textContent = off.length ? `Turned off: ${off.join(', ')}.` : 'All tools are on.';
  };
  let values = await S.read();
  apply(values); describe(values);
  // Tell the difference between a tab without the tools and an AISIS tab that
  // predates an update, which is the usual reason nothing appears on a page.
  const where = document.getElementById('where');
  // A popup is its own window, so the page behind it is the last focused one.
  try {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    const reply = tab?.id == null ? null : await chrome.tabs.sendMessage(tab.id, { type: 'ping' });
    if (reply?.ok) {
      where.textContent = `On this tab: version ${reply.version}${reply.term ? `, planning ${reply.term}` : ''}.`;
      where.className = 'status ok';
    } else throw new Error('no reply');
  } catch {
    where.textContent = 'The page tools are not on this tab. They need an AISIS Class Schedule page, reloaded since the last extension update. The schedule planner below works on its own.';
    where.className = 'status';
  }
  for (const [key, box] of Object.entries(boxes)) {
    box.addEventListener('change', async () => {
      values = { ...values, [key]: box.checked };
      describe(values);
      if (!await S.write(values)) status.textContent = 'This setting could not be saved. Check that extension storage is available.';
    });
  }
  // Another window may change the same toggles while this popup is open.
  S.subscribe(next => { values = next; apply(values); describe(values); });
})();
