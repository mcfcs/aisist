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
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const reply = tab?.id == null ? null : await chrome.tabs.sendMessage(tab.id, { type: 'ping' });
    where.textContent = reply?.ok
      ? `Running on this tab (version ${reply.version})${reply.term ? `, planning ${reply.term}.` : '.'}`
      : 'Not running on this tab. Open Class Schedule in AISIS.';
    where.className = reply?.ok ? 'status ok' : 'status';
  } catch {
    where.textContent = 'Not running on this tab. Open Class Schedule in AISIS, and reload the page if you just updated the extension.';
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
