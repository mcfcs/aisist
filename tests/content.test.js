const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');
const html = `<select name="applicablePeriod"><option value="2025-2">Second semester</option></select><select name="deptCode"><option value="DISCS">DISCS</option></select><table><tr><td>Subject Code</td><td>Section</td><td>Course Title</td><td>Units</td><td>Time</td><td>Room</td><td>Instructor</td><td>Max No</td><td>Lang</td><td>Level</td><td>Free Slots</td><td>Remarks</td></tr><tr><td>MSYS 116</td><td>C</td><td>Applications</td><td>3</td><td>M-TH 1100-1230(FULLY ONSITE)</td><td>CTC 506</td><td>EXAMPLE, ALEXANDER E.<br>SAMPLE, JAMIE ROBIN T.</td><td>32</td><td>ENG</td><td>U</td><td>4</td><td>ALL SLOTS FOR BS HS MAJORS.</td></tr></table>`;
// Synthetic Individual Program of Study in the AISIS row layout.
const ipsHtml = `<table><tr><td>First Year</td></tr><tr><td>First Semester</td></tr><tr><td><a title="PASSED">P</a></td><td>MSYS 20</td><td>3</td><td><a title="MAJOR">M</a></td><td>Y</td><td>N</td></tr><tr><td><a title="NOT YET TAKEN">N</a></td><td>MSYS 116</td><td>3</td><td><a title="MAJOR">M</a></td><td>Y</td><td>N</td></tr><tr><td><a title="NOT YET TAKEN">N</a></td><td>ISCS 30.XX</td><td>1</td><td><a title="REQUIRED MODULE">RM5</a></td><td>Y</td><td>N</td></tr></table>`;
function memoryArea(data) {
  return {
    get: async keys => {
      if (keys == null) return { ...data };
      const list = Array.isArray(keys) ? keys : [keys];
      return Object.fromEntries(list.filter(key => key in data).map(key => [key, data[key]]));
    },
    set: async values => { Object.assign(data, values); },
    remove: async keys => { for (const key of [].concat(keys)) delete data[key]; }
  };
}
function setup(markup = html, fetchImpl, url = 'https://aisis.ateneo.edu/j_aisis/J_VCSC.do', options = {}) {
  const dom = new JSDOM(markup, { url, runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window;
  // Answer the display-only program-of-study request here so tests that count
  // department lookups keep counting only those.
  const inner = fetchImpl || w.fetch;
  const program = options.ips ?? '<html><body>Sign in to AISIS</body></html>';
  w.fetch = (target, init) => String(target).includes('J_VIPS.do')
    ? Promise.resolve({ ok: true, url: 'https://aisis.ateneo.edu/j_aisis/J_VIPS.do', text: async () => program })
    : (inner ? inner(target, init) : Promise.reject(new Error('fetch is unavailable')));
  w.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  w.HTMLDialogElement.prototype.close = function () { this.open = false; this.dispatchEvent(new w.Event('close')); };
  const local = options.local || {}, sync = options.features ? { 'features-v1': options.features } : {};
  w.chrome = {
    runtime: { id: 'test-extension', getManifest: () => ({ version: 'test' }), onMessage: { addListener() {} }, sendMessage: async () => ({ ok: true, data: { name: 'Example, Alexander E.', slug: 'example-alexander', stats: { score: 3.6, comment_count: 2, projected_count: 2 }, fetchedAt: Date.now(), reviews: [ { id: 1, course: 'MSYS 20', body: 'Other course', title: 'Other', rating: 5 }, { id: 2, course: 'MSYS 116', body: '<img src=x onerror=alert(1)>', title: 'Match', rating: 4 } ] } }) },
    storage: { local: memoryArea(local), sync: memoryArea(sync), onChanged: { addListener() {} } }
  };
  dom.stored = local;
  for (const file of ['lib/core.js', 'lib/syllabus.js', 'lib/settings.js', 'lib/plan.js', 'lib/plan-ui.js', 'lib/aisis.js', 'lib/offerings.js', 'content.js']) w.eval(fs.readFileSync(file, 'utf8'));
  return dom;
}
function cellButtons(w) { return [...w.document.querySelector('td[data-companion-cell] span').shadowRoot.querySelectorAll('button')]; }
function named(w, label) { return cellButtons(w).find(b => b.textContent === label); }
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

const settle = async (ms = 40) => new Promise(resolve => setTimeout(resolve, ms));
test('each tool can be turned off on its own and turning all of them off leaves AISIS untouched', async () => {
  const withoutSyllabus = setup(html, undefined, undefined, { features: { syllabus: false } });
  try {
    await settle();
    const w = withoutSyllabus.window;
    assert.equal(w.document.querySelector('td[data-companion-cell] span').shadowRoot.querySelector('a'), null);
    assert.ok(named(w, 'Prof reviews'));
    assert.ok(named(w, 'Add to plan'));
  } finally { withoutSyllabus.window.close(); }
  const withoutReviews = setup(html, undefined, undefined, { features: { reviews: false, planner: false } });
  try {
    await settle();
    const w = withoutReviews.window;
    assert.ok(w.document.querySelector('td[data-companion-cell] span').shadowRoot.querySelector('a'));
    assert.equal(named(w, 'Prof reviews'), undefined);
    assert.equal(named(w, 'Add to plan'), undefined);
    assert.equal(w.document.querySelector('[data-companion-bar]'), null);
  } finally { withoutReviews.window.close(); }
  const off = setup(html, undefined, undefined, { features: { syllabus: false, reviews: false, planner: false } });
  try {
    await settle();
    assert.equal(off.window.document.querySelector('[data-companion-cell]'), null);
    assert.equal(off.window.document.querySelector('[data-companion-bar]'), null);
    assert.equal(off.window.document.querySelectorAll('table tr')[1].cells.length, 12);
  } finally { off.window.close(); }
});
test('Add to plan saves the whole section under the selected term and the control reflects the draft', async () => {
  const dom = setup(), w = dom.window;
  try {
    await settle();
    named(w, 'Add to plan').click();
    await settle();
    const saved = dom.stored['plan-v1:2025-2'];
    assert.equal(saved.drafts.length, 1);
    const [pick] = saved.drafts[0].picks;
    assert.equal(pick.course, 'MSYS 116');
    assert.equal(pick.section, 'C');
    assert.equal(pick.time, 'M-TH 1100-1230(FULLY ONSITE)');
    assert.equal(pick.room, 'CTC 506');
    assert.equal(pick.freeSlots, '4');
    assert.equal(pick.instructors, 'EXAMPLE, ALEXANDER E.; SAMPLE, JAMIE ROBIN T.');
    assert.ok(named(w, 'Remove from plan'));
    named(w, 'Remove from plan').click();
    await settle();
    assert.equal(dom.stored['plan-v1:2025-2'].drafts[0].picks.length, 0);
    assert.ok(named(w, 'Add to plan'));
  } finally { w.close(); }
});
test('sections browsed in AISIS are saved for the planner tab under their term', async () => {
  const dom = setup();
  try {
    await settle(1000);
    const saved = dom.stored['sections-v1:2025-2'];
    assert.equal(saved.length, 1);
    assert.equal(saved[0].course, 'MSYS 116');
    assert.equal(saved[0].remarks, 'ALL SLOTS FOR BS HS MAJORS.');
  } finally { dom.window.close(); }
});
test('a course still listed as not yet taken is marked, and the draft dialog names the conflict', async () => {
  const dom = setup(html, undefined, undefined, { ips: ipsHtml }), w = dom.window;
  try {
    await settle();
    const badge = w.document.querySelector('td[data-companion-cell] span').shadowRoot.querySelector('.needed');
    assert.match(badge.textContent, /In your program/);
    assert.match(badge.title, /MSYS 116 is not yet taken/);
    named(w, 'Add to plan').click();
    await settle();
    // A second section of the same course at an overlapping time.
    const plan = dom.stored['plan-v1:2025-2'];
    plan.drafts[0].picks.push({ course: 'CSCI 61', section: 'A', title: 'Overlap', units: 3, time: 'M-TH 1200-1330(FULLY ONSITE)', room: 'CTC 101', instructors: 'DEMO, R.', freeSlots: '0', remarks: '' });
    w.document.querySelector('[data-companion-bar]').shadowRoot.querySelector('button').click();
    await settle();
    const dialogRoot = [...w.document.querySelectorAll('[data-aisis-companion]')].map(host => host.shadowRoot).find(root => root.querySelector('dialog'));
    assert.match(dialogRoot.querySelector('.error').textContent, /MSYS 116 C overlaps CSCI 61 A on Mon 12:00–12:30; Thu 12:00–12:30/);
    assert.match(dialogRoot.textContent, /CSCI 61 A: No free slots left./);
    assert.equal(dialogRoot.querySelectorAll('.week-block').length, 4);
    const suggested = [...dialogRoot.querySelectorAll('.suggest-course')].map(node => node.textContent);
    assert.ok(suggested.some(text => /MSYS 116/.test(text) && /✓ in draft/.test(text)), suggested.join(' // '));
    assert.ok(suggested.some(text => /ISCS 30.XX/.test(text) && /No section found for this term yet/.test(text)));
    assert.match(dialogRoot.querySelector('.offer').textContent, /Section C.*Mon, Thu 11:00–12:30.*CTC 506/s);
  } finally { w.close(); }
});
