const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');

const siteMap = `<table>
  <tr><td>Site Map</td></tr>
  <tr><td align="right" class="link03">MY INDIVIDUAL PROGRAM OF STUDY</td><td class="text02">Track your progress</td></tr>
  <tr><td align="right" class="link03">CLASS SCHEDULE</td><td class="text02">View the schedule of all classes being offered</td></tr>
</table>`;
function setup(markup = siteMap, { features, url = 'https://aisis.ateneo.edu/j_aisis/welcome.do' } = {}) {
  const dom = new JSDOM(markup, { url, runScripts: 'outside-only' });
  const w = dom.window;
  const sync = features ? { 'features-v1': features } : {};
  const sent = [];
  w.chrome = {
    runtime: { id: 'test-extension', sendMessage: message => { sent.push(message); } },
    storage: {
      sync: { get: async key => (key in sync ? { [key]: sync[key] } : {}), set: async () => {} },
      onChanged: { addListener() {} }
    }
  };
  dom.sent = sent;
  for (const file of ['lib/settings.js', 'home.js']) w.eval(fs.readFileSync(file, 'utf8'));
  return dom;
}
const settle = () => new Promise(resolve => setTimeout(resolve, 10));

test('the AISIS home page gains one site-map row that opens the planner', async () => {
  const dom = setup(), w = dom.window;
  try {
    await settle();
    const row = w.document.querySelector('[data-companion-home]');
    assert.ok(row, 'no row added');
    const model = [...w.document.querySelectorAll('tr')].find(tr => /CLASS SCHEDULE/.test(tr.textContent));
    assert.equal(row.previousElementSibling, model, 'row is not placed under Class Schedule');
    assert.equal(row.cells.length, 2);
    // The new row copies the styling of the row it follows.
    assert.equal(row.cells[0].getAttribute('align'), 'right');
    assert.equal(row.cells[0].getAttribute('class'), 'link03');
    assert.equal(row.cells[1].textContent, 'Plan your enlistment for next semester');
    const anchor = row.cells[0].querySelector('span').shadowRoot.querySelector('a');
    assert.equal(anchor.textContent, 'MY DRAFT SCHEDULES');
    anchor.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }));
    assert.equal(dom.sent.length, 1);
    assert.equal(dom.sent[0].type, 'planner');
  } finally { w.close(); }
});
test('the row is left out when the planner is turned off, and added only once', async () => {
  const off = setup(siteMap, { features: { planner: false } });
  try {
    await settle();
    assert.equal(off.window.document.querySelector('[data-companion-home]'), null);
  } finally { off.window.close(); }
  const dom = setup(), w = dom.window;
  try {
    await settle();
    w.eval(fs.readFileSync('home.js', 'utf8'));
    await settle();
    assert.equal(w.document.querySelectorAll('[data-companion-home]').length, 1);
  } finally { w.close(); }
});
test('pages without the AISIS site map are left alone', async () => {
  for (const [markup, url] of [
    ['<table><tr><td>Something else</td><td>No site map here</td></tr></table>', 'https://aisis.ateneo.edu/j_aisis/welcome.do'],
    [siteMap, 'https://aisis.ateneo.edu/j_aisis/J_VCSC.do']
  ]) {
    const dom = setup(markup, { url });
    try {
      await settle();
      assert.equal(dom.window.document.querySelector('[data-companion-home]'), null);
    } finally { dom.window.close(); }
  }
});
