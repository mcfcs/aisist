const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');
const html = `<select name="applicablePeriod"><option value="2025-2">Second semester</option></select><select name="deptCode"><option value="DISCS">DISCS</option></select><table><tr><td>Subject Code</td><td>Section</td><td>Course Title</td><td>Units</td><td>Time</td><td>Room</td><td>Instructor</td></tr><tr><td>MSYS 116</td><td>C</td><td>Applications</td><td>3</td><td>M-TH</td><td>CTC 506</td><td>EXAMPLE, ALEXANDER E.<br>SAMPLE, JAMIE ROBIN T.</td></tr></table>`;
function setup(markup = html, fetchImpl, url = 'https://aisis.ateneo.edu/j_aisis/J_VCSC.do') {
  const dom = new JSDOM(markup, { url, runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window;
  if (fetchImpl) w.fetch = fetchImpl;
  w.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  w.HTMLDialogElement.prototype.close = function () { this.open = false; this.dispatchEvent(new w.Event('close')); };
  w.chrome = { runtime: { sendMessage: async () => ({ ok: true, data: { name: 'Example, Alexander E.', slug: 'example-alexander', stats: { score: 3.6, comment_count: 2, projected_count: 2 }, fetchedAt: Date.now(), reviews: [ { id: 1, course: 'MSYS 20', body: 'Other course', title: 'Other', rating: 5 }, { id: 2, course: 'MSYS 116', body: '<img src=x onerror=alert(1)>', title: 'Match', rating: 4 } ] } }) } };
  w.eval(fs.readFileSync('lib/core.js', 'utf8')); w.eval(fs.readFileSync('lib/syllabus.js', 'utf8')); w.eval(fs.readFileSync('content.js', 'utf8'));
  return dom;
}
function rowButtons(w) { return [...w.document.querySelector('td[data-companion-cell] span').shadowRoot.querySelectorAll('button')].filter(b=>b.textContent==='Prof reviews'); }
function dialog(w) { return [...w.document.querySelectorAll('[data-aisis-companion]')].map(h => h.shadowRoot).find(s => s.querySelector('dialog')); }
test('co-taught rows have one combined direct syllabus link that follows term changes', async () => {
  const dom = setup(), w = dom.window;
  try {
    const root = w.document.querySelector('td[data-companion-cell] span').shadowRoot;
    const links = root.querySelectorAll('a');
    assert.equal(links.length, 1);
    assert.match(links[0].href, /CS-DISCS-MSYS116-EXAMPLE_A_SAMPLE_J-C-2025-2.pdf$/);
    assert.equal(links[0].target, '_blank');
    assert.equal(dialog(w), undefined);
    const select = w.document.querySelector('[name="applicablePeriod"]');
    select.options[0].value = '2026-1'; select.dispatchEvent(new w.Event('change', { bubbles: true }));
    assert.match(w.document.querySelector('td[data-companion-cell] span').shadowRoot.querySelector('a').href, /-2026-1.pdf$/);
    w.document.body.append(w.document.createElement('div'));
    await new Promise(r => setTimeout(r, 240));
    assert.equal(w.document.querySelectorAll('[data-companion-cell]').length, 2);
  } finally { w.close(); }
});
test('aggregate electives automatically become direct links after same-origin department lookup', async () => {
  const markup = `<form action="/j_aisis/J_VCSC.do">${html.replace('<option value="DISCS">DISCS</option>', '<option value="**IE**">All interdisciplinary electives</option><option value="CPA">Curriculum</option>').replaceAll('MSYS 116', 'EDUC 132i')}</form>`;
  let requests = 0;
  const dom = setup(markup, async (url, options) => {
    requests++;
    assert.equal(url, 'https://aisis.ateneo.edu/j_aisis/J_VCSC.do');
    assert.equal(options.method, 'POST'); assert.equal(options.credentials, 'same-origin');
    assert.equal(options.body.get('deptCode'), 'CPA');
    assert.equal(options.body.get('command'), 'displayResults');
    assert.equal(options.body.get('applicablePeriod'), '2025-2');
    return {ok:true,url,text:async () => html.replace('<option value="DISCS">DISCS</option>', '<option value="CPA">Curriculum</option>').replaceAll('MSYS 116','EDUC 132i')};
  });
  try {
    await new Promise(r => setTimeout(r, 30));
    const root = dom.window.document.querySelector('td[data-companion-cell] span').shadowRoot;
    assert.match(root.querySelector('a').href, /CS-CPA-EDUC132i-EXAMPLE_A_SAMPLE_J-C-2025-2.pdf$/);
    assert.equal(root.querySelector('a').target, '_blank');
    assert.equal(dom.window.document.querySelector('[name="deptCode"]').value, '**IE**');
    dom.window.document.body.append(dom.window.document.createElement('div'));
    await new Promise(r => setTimeout(r, 220)); assert.equal(requests, 1);
  } finally { dom.window.close(); }
});
test('lookup login failures stop requests and leave a setup fallback rather than fabricated links', async () => {
  const markup = `<form action="/j_aisis/J_VCSC.do">${html.replace('<option value="DISCS">DISCS</option>', '<option value="**IE**">All electives</option><option value="CPA">Curriculum</option><option value="PS">Physics</option>').replaceAll('MSYS 116', 'EDUC 132i')}</form>`;
  let requests = 0;
  const dom = setup(markup, async url => { requests++; return {ok:true,url,text:async () => '<form>Sign in to AISIS</form>'}; });
  try {
    await new Promise(r => setTimeout(r, 30));
    const root = dom.window.document.querySelector('td[data-companion-cell] span').shadowRoot;
    assert.equal(root.querySelector('a'), null);
    assert.ok([...root.querySelectorAll('button')].some(b=>b.textContent==='Set syllabus link'));
    assert.equal(requests,1);
  } finally { dom.window.close(); }
});
test('review dialog puts exact course first, filters reviews, and renders untrusted text safely', async () => {
  const dom = setup(html.replace('<br>SAMPLE, JAMIE ROBIN T.', '')), w = dom.window;
  try {
    rowButtons(w)[0].click(); await new Promise(r => setTimeout(r, 0));
    const s = dialog(w);
    assert.equal(s.querySelector('article h3').textContent, 'Match');
    assert.equal(s.querySelector('article img'), null);
    assert.match(s.querySelector('article p').textContent, /<img/);
    assert.match(s.querySelector('.score').textContent, /4.0/);
    const filter = s.querySelector('.controls select'); filter.value = 'other'; filter.dispatchEvent(new w.Event('change'));
    assert.equal(s.querySelectorAll('article').length, 1); assert.equal(s.querySelector('article h3').textContent, 'Other');
  } finally { w.close(); }
});
test('network errors remain retryable', async () => {
  const dom = setup(), w = dom.window;
  try {
    w.chrome.runtime.sendMessage = async () => ({ ok: false, error: 'Network unavailable' });
    rowButtons(w)[0].click(); await new Promise(r => setTimeout(r, 0));
    assert.equal(dialog(w).querySelector('.error').textContent, 'Network unavailable');
    assert.ok([...dialog(w).querySelectorAll('button')].some(b => b.textContent === 'Retry'));
  } finally { w.close(); }
});

test('visible links alone are checked, confirmed missing disables and forced recheck restores', async () => {
  let calls = 0, status = 404;
  const dom = setup(html.replace('<br>SAMPLE, JAMIE ROBIN T.', ''), async () => { calls++; return new Response(null, { status, headers: { 'content-type': 'application/pdf' } }); }), w = dom.window;
  try {
    const root = w.document.querySelector('td[data-companion-cell] span').shadowRoot;
    const anchor = root.querySelector('a');
    assert.equal(calls, 0);
    anchor.dispatchEvent(new w.Event('pointerenter'));
    await new Promise(r => setTimeout(r, 20));
    assert.equal(anchor.getAttribute('aria-disabled'), 'true'); assert.equal(anchor.hasAttribute('href'), false);
    assert.equal(rowButtons(w)[0].disabled, false);
    status = 200; root.querySelector('.availability-recheck').click();
    await new Promise(r => setTimeout(r, 20));
    assert.equal(anchor.dataset.syllabusState, 'available'); assert.ok(anchor.href.endsWith('.pdf')); assert.equal(calls, 2);
  } finally { w.close(); }
});
test('co-taught review summaries stay separate and one failed profile does not hide the other', async () => {
  const dom = setup(), w = dom.window;
  try {
    const original = w.chrome.runtime.sendMessage;
    const names = [];
    w.chrome.runtime.sendMessage = async message => { names.push(message.name); return message.name.startsWith('SAMPLE') ? { ok: false, error: 'Profile unavailable' } : original(message); };
    rowButtons(w)[0].click(); await new Promise(r => setTimeout(r, 0));
    const summaries = [...dialog(w).querySelectorAll('.professor-section > summary')];
    assert.equal(names.length, 2); assert.equal(summaries.length, 2);
    assert.match(summaries[0].textContent, /4.0 \/ 5.*MSYS 116/);
    assert.match(summaries[1].textContent, /Reviews unavailable/);
    assert.equal(dialog(w).querySelector('article h3').textContent, 'Match');
  } finally { w.close(); }
});

test('missing co-taught syllabus retries reversed instructor order and uses only a confirmed PDF', async () => {
  const requests = [];
  const dom = setup(html, async url => { requests.push(url); return new Response(null, { status: url.includes('SAMPLE_J_EXAMPLE_A') ? 200 : 404, headers: { 'content-type': 'application/pdf' } }); });
  try {
    const anchor = dom.window.document.querySelector('td[data-companion-cell] span').shadowRoot.querySelector('a');
    anchor.dispatchEvent(new dom.window.Event('pointerenter'));
    await new Promise(r => setTimeout(r, 25));
    assert.equal(requests.length, 2); assert.equal(anchor.dataset.syllabusState, 'available'); assert.match(anchor.href, /SAMPLE_J_EXAMPLE_A/);
  } finally { dom.window.close(); }
});

test('course tools run only on the two Class Schedule endpoints', () => {
  for (const endpoint of ['J_VCEC.do', 'J_VMCS.do', 'J_ENLC.do', 'J_VCSC.do.other']) {
    const dom = setup(html, undefined, `https://aisis.ateneo.edu/j_aisis/${endpoint}`);
    try { assert.equal(dom.window.document.querySelector('[data-companion-cell]'), null); }
    finally { dom.window.close(); }
  }
  const dom = setup(html, undefined, 'https://aisis.ateneo.edu/j_aisis/classSkeds.do?department=DISCS');
  try { assert.ok(dom.window.document.querySelector('[data-companion-cell]')); }
  finally { dom.window.close(); }
});
test('tables with native syllabus controls are skipped, including unavailable syllabi', () => {
  for (const label of ['View Syllabus', 'View class syllabus', 'Syllabus Not Available']) {
    const markup = html.replace('</td></tr></table>', `</td><td><a href="/native.pdf">${label}</a></td></tr></table>`);
    const dom = setup(markup);
    try {
      assert.equal(dom.window.document.querySelector('[data-companion-cell]'), null);
      assert.equal(dom.window.document.querySelector('a').textContent, label);
    } finally { dom.window.close(); }
  }
});
test('native syllabus controls added later remove companion columns without affecting other tables', async () => {
  const dom = setup(html + html.slice(html.indexOf('<table>')));
  try {
    const w = dom.window, table = w.document.querySelector('table');
    table.rows[1].insertCell().textContent = 'View class syllabus';
    await new Promise(r => setTimeout(r, 230));
    assert.equal(table.querySelector('[data-companion-cell]'), null);
    assert.ok(w.document.querySelectorAll('table')[1].querySelector('[data-companion-cell]'));
  } finally { dom.window.close(); }
});
