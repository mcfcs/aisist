(() => {
  'use strict';
  // Only the signed-in and public Class Schedule endpoints support these tools.
  if (!/^\/j_aisis\/(?:J_VCSC|classSkeds)\.do$/i.test(location.pathname)) return;
  if (globalThis.__aisisCompanion) return;
  globalThis.__aisisCompanion = true;
  const C = globalThis.AisisCore;
  const style = `
    :host{font:inherit;color:inherit;text-align:left;color-scheme:light}
    *{box-sizing:border-box}[hidden]{display:none!important}button,input,select{font:inherit}button,a,input,select,summary{outline-offset:3px}:focus-visible{outline:2px solid #000080}
    a{color:#000080;text-decoration:underline;text-underline-offset:2px}button{cursor:pointer}button:disabled{cursor:default;opacity:.6}
    .buttons{font:inherit;line-height:1.7;white-space:nowrap}.buttons>a,.buttons>button{display:block;width:fit-content;color:#000080;background:none;border:0;border-radius:0;font:inherit;line-height:1.7;padding:0;margin:0;text-decoration:underline;text-underline-offset:2px;min-height:0}.buttons>a:hover,.buttons>button:hover{color:#0000cd}.buttons .unavailable{color:#666;font:inherit}
    .buttons>a[aria-disabled="true"],.buttons>a[aria-disabled="true"]:hover{color:#666;text-decoration:none;cursor:not-allowed}.buttons>.availability-recheck{font-size:10px;color:#555}
    dialog{font:13px/1.5 Arial,Helvetica,sans-serif;color:#000;background:white;padding:0;border:1px solid #777;border-radius:2px;width:min(580px,calc(100vw - 24px));max-height:88vh;box-shadow:0 8px 32px #0003;overflow:hidden}
    dialog[open]{display:flex;flex-direction:column}dialog::backdrop{background:#0004}header{background:#b0bcdf;border-bottom:1px solid #929fc8;padding:12px 16px;display:flex;justify-content:space-between;gap:12px;flex:none}header>div{min-width:0}
    .mode{font-size:11px;color:#000080;margin-bottom:3px}h2{font:bold 19px/1.25 Arial,Helvetica,sans-serif;color:#000080;margin:0 0 4px;overflow-wrap:anywhere}.subtitle{font-size:12px;margin:0}h3{font-size:13px;margin:0 0 6px}p{margin:0 0 10px}.muted,.review-meta,.rating-note,.secondary-score{color:#555;font-size:12px}
    .content{padding:16px;overflow:auto;overscroll-behavior:contain;min-height:0}.close{align-self:flex-start;color:#000080;background:none;border:0;padding:0 5px;font:22px/1 Arial;min-width:28px;min-height:28px}
    button,.action{color:#000080;background:#f0f0f0;border:1px solid #aaa;border-radius:2px;padding:6px 10px;min-height:32px;text-decoration:none;display:inline-block}button:hover,.action:hover{background:#e4e4e4}.quiet,.read-more{color:#000080;background:none;border:0;padding:4px 0;text-decoration:underline}.quiet:hover,.read-more:hover{background:none}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px}label{display:grid;gap:4px;font-size:12px}input,select{width:100%;min-width:0;border:1px solid #999;border-radius:0;padding:6px;color:#000;background:#fff;min-height:32px}.wide{grid-column:1/-1}.actions{display:flex;flex-wrap:wrap;gap:14px;margin:14px 0}.course-title{font-weight:bold}.instructor-line{font-size:12px;color:#555}
    details{border-top:1px solid #ccc;padding-top:10px}summary{color:#000080;cursor:pointer;font-size:12px}details[open]>summary{margin-bottom:12px}.url{overflow-wrap:anywhere;font-size:12px;background:#f0f0f0;padding:8px}.error{padding:10px;border:1px solid #b98f8f;background:#fff4f4;color:#7d2020}
    .rating{display:flex;align-items:center;gap:14px;margin-bottom:10px}.score{font:bold 26px/1 Arial;color:#000080;white-space:nowrap}.score small{font:13px Arial;color:#555;margin-left:4px}.rating p{margin:0}.rating-note{margin:0 0 12px}.match-note{font-size:12px;margin:12px 0;color:#333}.match-note.exact{font-weight:bold}
    .controls{display:flex;align-items:end;gap:14px;padding:10px 0;border-top:1px solid #ccc;border-bottom:1px solid #ccc}.controls label{flex:1}.review-list article{padding:14px 0;border-bottom:1px solid #ccc}.review-top{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:6px}.badge{font-size:11px;color:#000080}.badge.exact{font-weight:bold}article p{white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.6;margin:6px 0}.review-body.clamped{display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden}.read-more{font-size:12px;min-height:28px}.footer{font-size:11px;color:#555;padding-top:14px}.footer p{margin:5px 0 0;font-size:11px}.source-link{font-size:12px}.empty,.loading{padding:16px 0}.instructor-picker{margin-bottom:14px}.professor-section{margin-top:14px;padding:12px 0}.professor-section>summary{font-size:13px;font-weight:bold}
    @media(max-width:420px){dialog{max-height:92vh;width:calc(100vw - 16px)}header,.content{padding:12px}.controls{gap:10px}h2{font-size:18px}.grid{gap:8px}}
  `;
  const node = (tag, text, className) => {
    const el = document.createElement(tag);
    if (text != null) el.textContent = text;
    if (className) el.className = className;
    return el;
  };
  const button = (text, callback, className) => { const el = node('button', text, className); el.type = 'button'; el.addEventListener('click', callback); return el; };
  const link = (text, url, className) => { const el = node('a', text, className); el.href = url; el.target = '_blank'; el.rel = 'noopener noreferrer'; return el; };
  const makeShadow = () => { const host = node('span'); host.dataset.aisisCompanion = ''; const shadow = host.attachShadow({ mode: 'open' }); shadow.append(node('style', style)); return { host, shadow }; };
  const cachePrefix = 'syllabus-status-v1:';
  const syllabusChecker = AisisSyllabus.createChecker({ fetch: (...args) => fetch(...args), cache: {
    get: async url => (await chrome.storage.local.get(cachePrefix + url))[cachePrefix + url],
    set: async (url, result) => chrome.storage.local.set({ [cachePrefix + url]: result })
  } });
  // Remove expired statuses and bound storage across academic years.
  (async () => {
    try {
      const stored = await chrome.storage.local.get(null);
      const entries = Object.entries(stored).filter(([key]) => key.startsWith(cachePrefix)).sort((a,b) => (b[1]?.checkedAt || 0) - (a[1]?.checkedAt || 0));
      const stale = entries.filter(([,value], index) => index >= 500 || !(value?.expiresAt > Date.now())).map(([key])=>key);
      if (stale.length) await chrome.storage.local.remove(stale);
    } catch { /* Availability checks still work if extension storage is unavailable. */ }
  })();
  const syllabusChecks = new WeakMap();
  const syllabusObserver = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(entries => {
    for (const entry of entries) if (entry.isIntersecting) {
      syllabusObserver.unobserve(entry.target); syllabusChecks.get(entry.target)?.();
    }
  }, { rootMargin: '0px', threshold: 0.01 });
  function watchSyllabus(anchor, controls, row) {
    let url = anchor.href;
    const originalUrl = url;
    anchor.dataset.syllabusUrl = url; anchor.dataset.syllabusState = 'unchecked';
    let running = false, last;
    const retry = button('Recheck syllabus', () => check(true), 'availability-recheck');
    retry.hidden = true; controls.append(retry);
    const edit = button('Edit link details', () => showSyllabus(row), 'availability-recheck');
    edit.hidden = true; controls.append(edit);
    async function check(force = false) {
      if (running || !anchor.isConnected || (!force && last?.expiresAt > Date.now())) return;
      running = true; retry.disabled = true;
      anchor.dataset.syllabusState = 'checking'; anchor.setAttribute('aria-busy', 'true');
      let result = await syllabusChecker.check(url, { force });
      // FACILE documents filenames whose teaching-team order differs from AISIS.
      // Bound automatic permutations; larger teams can use Edit link details.
      if (result.state === 'missing' && row.professors.length > 1 && row.professors.length <= 3) {
        const permutations = values => values.length <= 1 ? [values] : values.flatMap((value, i) => permutations(values.filter((_, j) => j !== i)).map(rest => [value, ...rest]));
        let uncertain;
        for (const professors of permutations(row.professors)) {
          const candidate = C.syllabusUrl({ ...period(), department: resolvedDepartment(row.course), course: row.course, section: row.section, professors });
          if (candidate === url) continue;
          const checked = await syllabusChecker.check(candidate, { force });
          if (checked.state === 'available') { url = candidate; result = checked; break; }
          if (checked.state === 'unknown') uncertain = checked;
        }
        if (result.state === 'missing' && uncertain) { result = uncertain; url = originalUrl; }
      }
      last = result; running = false;
      if (!anchor.isConnected) return;
      anchor.dataset.syllabusState = result.state; anchor.removeAttribute('aria-busy');
      anchor.title = result.reason;
      retry.disabled = false; retry.hidden = result.state === 'available'; edit.hidden = result.state === 'available';
      if (result.state === 'missing') {
        anchor.removeAttribute('href'); anchor.setAttribute('role', 'link'); anchor.setAttribute('aria-disabled', 'true'); anchor.textContent = 'Syllabus unavailable';
      } else {
        anchor.href = url; anchor.removeAttribute('aria-disabled'); anchor.removeAttribute('role'); anchor.textContent = 'Syllabus';
      }
    }
    anchor.addEventListener('click', event => {
      if (anchor.getAttribute('aria-disabled') === 'true') { event.preventDefault(); return; }
      check();
    });
    anchor.addEventListener('pointerenter', () => check()); anchor.addEventListener('focus', () => check());
    syllabusChecks.set(anchor, check); syllabusObserver?.observe(anchor);
  }
  let activeDialog;
  const displayName = value => value.replace(/\b\w+/g, word => word[0] + word.slice(1).toLowerCase());
  function modal(title, subtitle, subject = title) {
    activeDialog?.close();
    const previous = document.activeElement?.shadowRoot?.activeElement || document.activeElement;
    const { host, shadow } = makeShadow();
    const dialog = node('dialog'); activeDialog = dialog;
    const header = node('header'), heading = node('div');
    heading.append(node('div', title, 'mode'), node('h2', subject), node('p', subtitle, 'subtitle'));
    const close = button('×', () => dialog.close(), 'close'); close.setAttribute('aria-label', 'Close popup');
    header.append(heading, close);
    const body = node('div', null, 'content'); dialog.append(header, body);
    dialog.setAttribute('aria-label', title);
    dialog.addEventListener('close', () => { host.remove(); if (activeDialog === dialog) activeDialog = null; previous?.focus(); });
    dialog.addEventListener('click', event => { if (event.target === dialog) { const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close(); } });
    shadow.append(dialog); document.body.append(host); dialog.showModal();
    return { body, dialog };
  }
  function field(label, value, options) {
    const wrapper = node('label', label), input = node(options ? 'select' : 'input');
    if (options) for (const [v, text] of options) { const opt = node('option', text); opt.value = v; input.append(opt); }
    input.value = value; wrapper.append(input); return { wrapper, input };
  }
  function period() {
    const value = document.querySelector('[name="applicablePeriod"]')?.value || '';
    const match = value.match(/^(20\d{2})-([012])$/);
    return { year: match?.[1] || '', semester: match?.[2] ?? '' };
  }
  function showSyllabus(row) {
    const { body } = modal('Course syllabus', `Section ${row.section}`, row.course);
    body.append(node('p', displayName(row.title), 'course-title'), node('p', row.professors.map(displayName).join(' / '), 'instructor-line'));
    const grid = node('div', null, 'grid'), term = period();
    const corrections = node('details'), correctionGrid = node('div', null, 'grid');
    corrections.append(node('summary', 'Edit link details'));
    corrections.append(node('p', 'If the PDF does not open, check these against the course listing.', 'muted'), correctionGrid);
    const department = document.querySelector('[name="deptCode"]')?.value || '';
    const values = { year: term.year, semester: term.semester, department: resolvedDepartment(row.course), course: row.course, section: row.section, professor: row.professors.join('; ') };
    const labels = { year: 'Academic year starts', semester: 'Semester', department: 'Department code', course: 'Course code', section: 'Section', professor: 'Instructors in AISIS order (surname, given name; next instructor)' };
    const inputs = {};
    for (const key of Object.keys(values)) {
      const f = field(labels[key], values[key], key === 'semester' ? [['', 'Choose term'], ['0', 'Intersession'], ['1', 'First semester'], ['2', 'Second semester']] : null);
      if (key === 'professor') f.wrapper.classList.add('wide');
      if (key === 'year') { f.input.inputMode = 'numeric'; f.input.maxLength = 4; }
      inputs[key] = f.input; (['year', 'semester'].includes(key) ? grid : correctionGrid).append(f.wrapper);
    }
    body.append(grid);
    const preview = node('p', null, 'url'), error = node('p', null, 'error'); error.setAttribute('role', 'status');
    const open = link('Open syllabus PDF', '#', 'action primary');
    const copy = button('Copy link', async () => { try { await navigator.clipboard.writeText(open.href); copy.textContent = 'Link copied'; } catch { corrections.open = true; error.hidden = false; error.textContent = 'Select and copy the link under Edit link details.'; } }, 'quiet');
    copy.setAttribute('aria-live', 'polite');
    const actions = node('div', null, 'actions'); actions.append(open, copy);
    corrections.append(preview);
    body.append(error, actions, corrections, node('p', 'Opens in a new tab. Availability depends on the uploaded syllabus and your AISIS session.', 'footer'));
    function update() {
      copy.textContent = 'Copy link';
      try { const url = C.syllabusUrl(Object.fromEntries(Object.entries(inputs).map(([k, el]) => [k, el.value.trim()]))); preview.textContent = url; open.href = url; open.hidden = false; copy.disabled = false; error.hidden = true; }
      catch (e) { preview.textContent = 'Complete the fields above to generate a link.'; error.textContent = e.message; error.hidden = false; open.hidden = true; copy.disabled = true; corrections.open = true; }
    }
    Object.values(inputs).forEach(input => input.addEventListener('input', update)); update();
  }
  function showReviews(row) {
    const professors = [...new Set(row.professors.filter(C.isNamedInstructor))];
    const multiple = professors.length > 1;
    const { body, dialog } = modal('Professor reviews', `${row.course}, section ${row.section}`, multiple ? 'Course instructors' : displayName(professors[0] || 'Instructor not listed'));
    if (!professors.length) { body.append(node('p', 'No named instructor is listed for this section.', 'muted')); return; }
    if (multiple) body.append(node('p', 'Ratings are shown separately for each instructor. Reviews for this course appear first.', 'muted'));
    for (const name of professors) {
    const section = multiple ? node('details', null, 'professor-section') : node('div');
    const summary = multiple ? node('summary', displayName(name)) : null;
    if (summary) section.append(summary);
    const result = node('div'); section.append(result); body.append(section);
    let request = 0;
    async function load(refresh = false) {
      const current = ++request;
      if (!multiple) dialog.querySelector('h2').textContent = displayName(name);
      const loading = node('p', 'Loading reviews from Profs to Pick…', 'loading'); loading.setAttribute('role', 'status'); result.replaceChildren(loading);
      try {
        const response = await chrome.runtime.sendMessage({ type: 'professor', name, refresh });
        if (current !== request || !dialog.open) return;
        if (!response?.ok) throw new Error(response?.error || 'The extension connection was interrupted. Reload AISIS and retry.');
        render(response.data);
      } catch (e) {
        if (current !== request || !dialog.open) return;
        if (summary) { summary.textContent = `${displayName(name)} ? Reviews unavailable`; section.open = true; }
        const error = node('p', e.message, 'error'); error.setAttribute('role', 'alert');
        const actions = node('div', null, 'actions');
        actions.append(button('Retry', () => load(true)), link('Search Profs to Pick', `https://profstopick.com/search?q=${encodeURIComponent(name.split(',')[0])}`, 'action quiet'));
        result.replaceChildren(error, actions);
      }
    }
    function render(data) {
      result.replaceChildren();
      if (!multiple) dialog.querySelector('h2').textContent = data.name;
      const ranked = C.prioritize(data, row.course);
      const overall = typeof data.stats?.score === 'number' ? data.stats.score : null;
      const chosen = ranked.courseScore ?? overall, courseRated = ranked.courseScore != null;
      if (summary) summary.textContent = `${data.name} ? ${chosen == null ? 'No numeric ratings' : `${chosen.toFixed(1)} / 5 ? ${courseRated ? row.course : 'Overall'}`}`;
      const rating = node('div', null, 'rating'), ratingInfo = node('div');
      if (chosen != null) { const score = node('div', chosen.toFixed(1), 'score'); score.append(node('small', '/ 5')); rating.append(score); }
      ratingInfo.append(node('h3', chosen == null ? 'No numeric ratings yet' : courseRated ? `${row.course} rating` : 'Overall rating'), node('p', courseRated ? `${ranked.courseRatingCount} numeric ratings for this course` : `${data.stats?.comment_count ?? data.reviews.length} reviews across all courses`, 'muted'));
      rating.append(ratingInfo); result.append(rating);
      if (courseRated) result.append(node('p', overall == null ? 'No overall rating available.' : `Overall: ${overall.toFixed(1)} / 5 across all courses.`, 'secondary-score'));
      const notes = [];
      if (data.stats?.projected_count > 0) notes.push('Overall score includes estimates from review sentiment.');
      if (data.stats?.is_low_confidence) notes.push('Profs to Pick marks it as low confidence.');
      if (notes.length) result.append(node('p', notes.join(' '), 'rating-note'));
      result.append(node('p', ranked.matching.length ? `${ranked.matching.length} reviews for ${row.course} appear first.${ranked.courseScore == null ? ' No numeric ratings for this course yet.' : ''}` : `No reviews tagged ${row.course}. Showing other courses and untagged reviews.`, `match-note${ranked.matching.length ? ' exact' : ''}`));
      const controls = node('div', null, 'controls');
      const filter = field('Show reviews', 'all', [['all', `All reviews (${data.reviews.length})`], ['course', `${row.course} only (${ranked.matching.length})`], ['other', `Other courses / untagged (${ranked.other.length})`]]);
      controls.append(filter.wrapper, button('Refresh', () => load(true), 'quiet')); result.append(controls);
      const list = node('div', null, 'review-list'); result.append(list);
      function showList() {
        const reviews = filter.input.value === 'course' ? ranked.matching : filter.input.value === 'other' ? ranked.other : [...ranked.matching, ...ranked.other];
        list.replaceChildren();
        if (!reviews.length) { const empty = node('div', null, 'empty'); empty.append(node('p', 'No reviews in this group.'), button('Show all reviews', () => { filter.input.value = 'all'; showList(); })); list.append(empty); }
        for (const review of reviews) {
          const article = node('article');
          const top = node('div', null, 'review-top');
          top.append(node('span', review.course || 'Course not specified', `badge${ranked.matching.includes(review) ? ' exact' : ''}`));
          if (typeof review.rating === 'number') top.append(node('span', `${review.rating} / 5`, 'review-meta'));
          else if (review.sentiment) top.append(node('span', `${review.sentiment} sentiment`, 'review-meta'));
          const reviewBody = node('p', review.body, 'review-body');
          article.append(top, node('h3', review.title), reviewBody);
          if (String(review.body).length > 420 || String(review.body).split('\n').length > 4) {
            reviewBody.classList.add('clamped');
            const expand = button('Read full review', () => {
              const collapsed = reviewBody.classList.toggle('clamped');
              expand.textContent = collapsed ? 'Read full review' : 'Show less'; expand.setAttribute('aria-expanded', String(!collapsed));
            }, 'read-more');
            expand.setAttribute('aria-expanded', 'false'); article.append(expand);
          }
          const metrics = ['clarity', 'grading_fairness', 'helpfulness', 'workload', 'would_retake'].filter(k => typeof review[k] === 'number').map(k => `${k.replaceAll('_', ' ')}: ${review[k]}/5`);
          if (metrics.length) article.append(node('p', metrics.join('; '), 'review-meta'));
          list.append(article);
        }
      }
      filter.input.addEventListener('change', showList); showList();
      const footer = node('div', null, 'footer');
      footer.append(link(`View ${data.name} on Profs to Pick`, `https://profstopick.com/professor/${encodeURIComponent(data.slug)}`, 'source-link'), node('p', `Updated ${new Date(data.fetchedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}. ${data.reviews.length} available reviews.`, 'muted'));
      result.append(footer);
    }
    load();
    }
  }
  const enhanced = new WeakMap();
  // Unknown interdisciplinary prefixes are resolved from AISIS itself, rather
  // than guessed from the instructor's department or an outdated prefix map.
  const departmentCache = new Map(), lookupJobs = new Map();
  function lookupKey(course) { const p = period(); return `${p.year}-${p.semester}:${C.courseKey(course)}`; }
  function resolvedDepartment(course) {
    return C.departmentFor(course, document.querySelector('[name="deptCode"]')?.value || '') || departmentCache.get(lookupKey(course)) || '';
  }
  function requestDepartmentLookup(courses) {
    const selector = document.querySelector('[name="deptCode"]'), form = selector?.closest('form');
    const p = period(), term = `${p.year}-${p.semester}`;
    if (lookupJobs.has(term)) return;
    const unavailable = () => { lookupJobs.set(term, { pending: false }); queueMicrotask(scan); };
    if (!form || !p.year || !p.semester) return unavailable();
    const endpoint = new URL(form.getAttribute('action') || location.href, location.href);
    if (endpoint.origin !== location.origin || endpoint.pathname !== '/j_aisis/J_VCSC.do') return unavailable();
    const available = [...selector.options].map(o => o.value).filter(v => /^[A-Z][A-Z0-9-]{1,15}$/.test(v) && !/^(ALL|IE)$/.test(v));
    if (!available.length) return unavailable();
    // Likely listings first, but only a matching AISIS result establishes ownership.
    const priority = ['CPA', 'CEPP', 'SALT', 'ELM', 'PS', 'CH', 'SOCSCI', 'POS', 'EU'];
    const codes = [...new Set([...priority.filter(c => available.includes(c)), ...available])];
    const state = { pending: true, unresolved: new Set(courses.map(C.courseKey)) };
    lookupJobs.set(term, state);
    (async () => {
      try {
        for (const code of codes) {
          if (!state.unresolved.size || `${period().year}-${period().semester}` !== term) break;
          const body = new URLSearchParams({ command: 'displayResults', applicablePeriod: term, deptCode: code, subjCode: 'ALL' });
          const response = await fetch(endpoint.href, { method: 'POST', body, credentials: 'same-origin', signal: AbortSignal.timeout(12000) });
          if (!response.ok || new URL(response.url || endpoint.href).origin !== location.origin) throw new Error('AISIS lookup unavailable');
          const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
          if (doc.querySelector('[name="deptCode"]')?.value !== code || doc.querySelector('[name="applicablePeriod"]')?.value !== term) throw new Error('AISIS lookup requires a signed-in session');
          for (const row of doc.querySelectorAll('tr')) {
            if (row.cells.length < 7) continue;
            const data = C.readRow(row);
            if (!data || !state.unresolved.has(C.courseKey(data.course))) continue;
            departmentCache.set(`${term}:${C.courseKey(data.course)}`, code);
            state.unresolved.delete(C.courseKey(data.course));
          }
          if (document.body.isConnected) scan();
        }
      } catch {
        // A session/login error must not trigger further requests or fake links.
      } finally { state.pending = false; if (document.body.isConnected) scan(); }
    })();
  }
  function matchingCell(source) {
    const cell = node('td');
    for (const name of ['class', 'style', 'background', 'bgcolor', 'align', 'valign']) {
      if (source.hasAttribute(name)) cell.setAttribute(name, source.getAttribute(name));
    }
    cell.dataset.companionCell = ''; cell.style.verticalAlign = 'top';
    return cell;
  }
  function syllabusLinks(data) {
    const term = period(), department = resolvedDepartment(data.course);
    const professor = data.professors.join('; ');
    try { return [{ professor, url: C.syllabusUrl({ ...data, ...term, department }) }]; }
    catch { return [{ professor, url: null }]; }
  }
  function scan() {
    observer.disconnect();
    try {
      const unknownCourses = new Set();
      for (const table of document.querySelectorAll('table')) {
        const rows = [...table.rows].filter(r => r.closest('table') === table);
        const hasNativeSyllabus = rows.some(row => [...row.cells].some(cell =>
          !cell.hasAttribute('data-companion-cell') && /\b(?:view\s+(?:class\s+)?syllabus|syllabus\s+not\s+available)\b/i.test(C.clean(cell.textContent))));
        if (hasNativeSyllabus) {
          for (const row of rows) {
            const cell = row.querySelector('[data-companion-cell]');
            for (const anchor of cell?.querySelector('[data-aisis-companion]')?.shadowRoot?.querySelectorAll('[data-syllabus-url]') || []) syllabusObserver?.unobserve(anchor);
            cell?.remove(); enhanced.delete(row);
          }
          continue;
        }
        const header = rows.find(r => [...r.cells].some(c => /^(Subject|Course) Code$/i.test(C.clean(c.textContent))) && [...r.cells].some(c => /^(Instructor|Professor)$/i.test(C.clean(c.textContent))));
        if (!header) continue;
        const names = [...header.cells].map(c => C.clean(c.textContent));
        const indices = { course: names.findIndex(s => /^(Subject|Course) Code$/i.test(s)), section: names.findIndex(s => /^Section$/i.test(s)), title: names.findIndex(s => /^Course Title$/i.test(s)), professor: names.findIndex(s => /^(Instructor|Professor)$/i.test(s)) };
        if (Object.values(indices).some(i => i < 0)) continue;
        // Also replace cells left in saved pages or by an earlier extension version.
        header.querySelector('[data-companion-cell]')?.remove();
        const headingCell = matchingCell(header.cells[0]); headingCell.textContent = 'Links'; header.append(headingCell);
        for (const row of rows) {
          const data = C.readRow(row, indices);
          if (!data) continue;
          const links = syllabusLinks(data);
          const needsDepartment = !resolvedDepartment(data.course);
          const state = lookupJobs.get(`${period().year}-${period().semester}`);
          if (needsDepartment) unknownCourses.add(data.course);
          const signature = JSON.stringify([data, links, state?.pending, row.cells[0].getAttribute('class'), row.cells[0].getAttribute('style'), row.cells[0].getAttribute('background')]);
          if (enhanced.get(row) === signature && row.querySelector('[data-companion-cell]')) continue;
          const previousCell = row.querySelector('[data-companion-cell]');
          for (const oldLink of previousCell?.querySelector('[data-aisis-companion]')?.shadowRoot?.querySelectorAll('[data-syllabus-url]') || []) syllabusObserver?.unobserve(oldLink);
          previousCell?.remove();
          const cell = matchingCell(row.cells[0]);
          const { host, shadow } = makeShadow(), buttons = node('div', null, 'buttons');
          for (const item of links.filter(item => item.url)) {
            const label = links.length > 1 ? `Syllabus (${displayName(item.professor.split(',')[0])})` : 'Syllabus';
            const syllabus = link(label, item.url);
            syllabus.title = `Open syllabus PDF for ${item.professor} in a new tab`;
            buttons.append(syllabus);
            watchSyllabus(syllabus, buttons, data);
          }
          if (!links.length || links.some(item => !item.url)) {
            if (needsDepartment && (!state || state.pending)) {
              const loading = node('span', 'Finding syllabus…', 'unavailable'); loading.setAttribute('role', 'status'); buttons.append(loading);
            } else if (!data.professors.length || data.professors.some(name => !C.isNamedInstructor(name))) {
              const missing = node('span', 'Instructor TBA', 'unavailable'); missing.title = 'A syllabus link needs a named instructor.'; buttons.append(missing);
            } else {
              buttons.append(button('Set syllabus link', () => showSyllabus(data)));
            }
          }
          const reviews = button('Prof reviews', () => { const data = C.readRow(row, indices); if (data) showReviews(data); });
          buttons.append(reviews);
          shadow.append(buttons); cell.append(host); row.append(cell); enhanced.set(row, signature);
        }
      }
      if (unknownCourses.size) requestDepartmentLookup([...unknownCourses]);
    } finally { observer.observe(document.body, { childList: true, characterData: true, subtree: true }); }
  }
  let timer;
  const observer = new MutationObserver(() => { clearTimeout(timer); timer = setTimeout(scan, 180); });
  document.addEventListener('change', event => { if (event.target.matches('[name="applicablePeriod"], [name="deptCode"]')) scan(); }, true);
  scan();
})();
