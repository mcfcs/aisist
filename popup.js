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
