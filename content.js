(() => {
  'use strict';
  // Only the signed-in and public Class Schedule endpoints support these tools.
  if (!/^\/j_aisis\/(?:J_VCSC|classSkeds)\.do$/i.test(location.pathname)) return;
  if (globalThis.__aisisCompanion) return;
  globalThis.__aisisCompanion = true;
  const C = globalThis.AisisCore;
  const P = globalThis.AisisPlan;
  const U = globalThis.AisisPlanUi;
  const S = globalThis.AisisSettings;
  // Tools start enabled so the first paint matches the stored defaults; the
  // saved toggles are applied as soon as extension storage answers.
  let features = { ...S.DEFAULTS };
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
    dialog.planner{width:min(940px,calc(100vw - 24px))}
    .plan-toolbar{display:flex;flex-wrap:wrap;gap:10px 14px;align-items:end;padding-bottom:12px;border-bottom:1px solid #ccc;margin-bottom:12px}.plan-toolbar label{flex:1 1 200px}.plan-actions{display:flex;flex-wrap:wrap;gap:8px}
    .plan-section{margin-top:18px}.plan-section>h3,.plan-heading{border-bottom:1px solid #ccc;padding-bottom:5px;margin:18px 0 8px;font-size:13px;color:#000080}
    :host([data-companion-bar]){display:block;position:sticky;top:0;z-index:20}
    .bar{font:12px/1.6 Arial,Helvetica,sans-serif;color:#000;background:#f4f6fc;border:1px solid #929fc8;padding:8px 10px;margin:8px 0;display:flex;flex-wrap:wrap;gap:6px 16px;align-items:center}
    .bar b{color:#000080}.bar .flag{color:#7d2020}.bar .spacer{flex:1 1 12px}.bar .plan-actions{gap:8px}
    .buttons .needed{display:inline-block;background:#dfe4f3;border:1px solid #b0bcdf;color:#000080;font-size:10px;line-height:1.4;padding:0 4px;margin-top:2px;white-space:nowrap}
    @media(max-width:420px){dialog{max-height:92vh;width:calc(100vw - 16px)}header,.content{padding:12px}.controls{gap:10px}h2{font-size:18px}.grid{gap:8px}.plan-toolbar{gap:8px}}
    ${U.styles}
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
  // Draft schedules are keyed by the term selected on the page, so switching
  // the AISIS term selector switches to that term's drafts.
  function termId() { const { year, semester } = period(); return year && semester !== '' ? `${year}-${semester}` : ''; }
  const planState = { term: '', plan: null, loading: '', ips: null, ipsState: 'idle' };
  // The term the table on screen was rendered for. Changing the AISIS term
  // selector re-targets the draft, but the rows still belong to the old term.
  let pageTerm = '';
  let plannerRefresh = null;
  function planFor(term) {
    if (planState.term === term && planState.plan) return planState.plan;
    if (term && planState.loading !== term) {
      planState.loading = term;
      P.store.readPlan(term).then(plan => {
        if (planState.loading !== term) return;
        planState.term = term; planState.plan = plan; planState.loading = '';
        scan();
      });
    }
    return null;
  }
  function activePicks(term) { const plan = planFor(term); return plan ? P.activeDraft(plan).picks : []; }
  function sectionRecord(data, dept) {
    return {
      course: data.course, section: data.section, title: data.title,
      units: data.units || '', time: data.time || '', room: data.room || '',
      instructors: data.professors.join('; '), maxNo: data.maxNo || '',
      lang: data.lang || '', level: data.level || '', freeSlots: data.freeSlots ?? '',
      remarks: data.remarks || '', dept: dept ?? (document.querySelector('[name="deptCode"]')?.value || '')
    };
  }
  // Read the stored plan again before every change so edits made in the full
  // planner tab are never overwritten by a stale copy held on this page.
  async function togglePick(term, section) {
    const plan = await P.store.readPlan(term);
    const draft = P.activeDraft(plan);
    const key = P.sectionKey(section);
    const index = draft.picks.findIndex(pick => P.sectionKey(pick) === key);
    if (index >= 0) draft.picks.splice(index, 1); else draft.picks.push(section);
    draft.updated = Date.now();
    await P.store.writePlan(term, plan);
    planState.term = term; planState.plan = plan; planState.loading = '';
    scan(); plannerRefresh?.();
  }
  function openFullPlanner(term) {
    try { chrome.runtime.sendMessage({ type: 'planner', term }); } catch { /* The planner tab can still be opened from the toolbar popup. */ }
  }
  // The Individual Program of Study is a display-only page read with the
  // current AISIS session; a signed-out response leaves planning unchanged.
  async function loadIps(force = false) {
    if (!features.planner || planState.ipsState === 'loading' || !alive()) return;
    if (!/J_VCSC\.do$/i.test(location.pathname)) { planState.ipsState = 'unavailable'; return; }
    if (!force) {
      const stored = await P.store.readIps();
      if (!alive()) return;
      if (stored?.courses?.length && Date.now() - stored.fetchedAt < 6 * 60 * 60 * 1000) {
        planState.ips = stored; planState.ipsState = 'ready'; scan(); return;
      }
    }
    planState.ipsState = 'loading'; scan();
    try {
      const response = await fetch('/j_aisis/J_VIPS.do', { credentials: 'same-origin', signal: AbortSignal.timeout(15000) });
      if (!alive()) return;
      if (!response.ok || new URL(response.url || location.href, location.href).origin !== location.origin) throw new Error('unavailable');
      const parsed = P.parseIps(new DOMParser().parseFromString(await response.text(), 'text/html'));
      if (!parsed.courses.length) throw new Error('unavailable');
      planState.ips = { ...parsed, fetchedAt: Date.now() };
      planState.ipsState = 'ready';
      await P.store.writeIps(planState.ips);
    } catch {
      planState.ipsState = 'unavailable';
    }
    scan(); plannerRefresh?.();
    if (planState.ipsState === 'ready') collectOfferings(termId());
  }
  function remainingMatch(course) {
    if (planState.ipsState !== 'ready') return null;
    return P.matchRemaining(course, P.remainingCourses(planState.ips));
  }
  // AISIS cannot search one course across departments, so the planner reads
  // department listings for the chosen term until every course the program
  // still needs has been seen. Results are stored per term and reused.
  const collector = AisisOfferings.createCollector({
    load: async (term, code) => sectionsFromDocument(await fetchDepartment(term, code), code),
    departmentFor: course => C.departmentFor(course, ''),
    concurrency: 2
  });
  const sweep = { term: '', status: 'idle', scanned: 0, total: 0, department: '', missing: [] };
  function sweepLabel() {
    if (sweep.status === 'running') return `Finding sections for your program… ${sweep.scanned} of ${sweep.total} departments${sweep.department ? `, now ${sweep.department}` : ''}`;
    if (sweep.status === 'failed') return 'The section search stopped. Sign in to AISIS and try again.';
    if (sweep.status === 'partial') return `No sections offered this term for ${sweep.missing.join(', ')}.`;
    return '';
  }
  async function collectOfferings(term, { force = false } = {}) {
    if (!features.planner || !term || !alive()) return;
    if (planState.ipsState !== 'ready') return;
    if (sweep.term === term && (sweep.status === 'running' || (!force && sweep.status !== 'idle'))) return;
    const needed = P.remainingCourses(planState.ips);
    const departments = departmentCodes();
    if (!needed.length || !departments.length || !scheduleEndpoint()) return;
    if (!force) {
      const stored = await P.store.readOfferings(term);
      if (stored && Date.now() - stored.at < 24 * 60 * 60 * 1000) {
        Object.assign(sweep, { term, status: stored.status, scanned: stored.scanned, total: stored.total, department: '', missing: stored.missing || [] });
        refreshBars(); plannerRefresh?.(); return;
      }
    }
    Object.assign(sweep, { term, status: 'running', scanned: 0, total: departments.length, department: '', missing: needed.map(course => course.code) });
    refreshBars(); plannerRefresh?.();
    const known = await P.store.readSections(term);
    const result = await collector.collect({
      term, departments, needed, known,
      onProgress: progress => {
        if (progress.term !== sweep.term || !alive()) return;
        Object.assign(sweep, { scanned: progress.scanned, total: progress.total, department: progress.department, missing: progress.missing });
        if (progress.sections?.length) P.store.mergeSections(term, progress.sections);
        refreshBars(); plannerRefresh?.();
      }
    });
    if (!alive() || sweep.term !== term) return;
    sweep.status = result.status; sweep.missing = result.missing; sweep.department = '';
    await P.store.mergeSections(term, result.sections);
    await P.store.writeOfferings(term, { status: result.status, at: Date.now(), scanned: result.scanned, total: result.total, missing: result.missing });
    refreshBars(); plannerRefresh?.();
  }
  function confirmButton(label, confirmLabel, action) {
    let armed = false;
    const control = button(label, () => {
      if (!armed) { armed = true; control.textContent = confirmLabel; return; }
      action();
    }, 'quiet');
    return control;
  }
  function showPlanner(term) {
    const { body, dialog } = modal('Schedule planner', P.termLabel(term), 'Draft schedule');
    dialog.classList.add('planner');
    let closed = false;
    dialog.addEventListener('close', () => { closed = true; plannerRefresh = null; });
    async function render() {
      if (closed) return;
      const plan = await P.store.readPlan(term);
      const stored = await P.store.readSections(term);
      if (closed) return;
      // Rows on screen count as offerings straight away, before the debounced
      // save that keeps them for the planner tab.
      const merged = new Map(stored.map(section => [P.sectionKey(section), section]));
      if (term === pageTerm) for (const section of sectionsFromDocument(document)) merged.set(P.sectionKey(section), section);
      const sections = [...merged.values()];
      planState.term = term; planState.plan = plan; planState.loading = '';
      const draft = P.activeDraft(plan);
      const save = async () => { draft.updated = Date.now(); await P.store.writePlan(term, plan); scan(); render(); };
      body.replaceChildren();

      const toolbar = node('div', null, 'plan-toolbar');
      const chooser = field('Draft', draft.id, plan.drafts.map(item => [item.id, `${item.name} (${item.picks.length})`]));
      chooser.input.addEventListener('change', async () => { plan.activeId = chooser.input.value; await P.store.writePlan(term, plan); scan(); render(); });
      const name = field('Name', draft.name);
      name.input.maxLength = 40;
      name.input.addEventListener('change', () => { draft.name = P.clean(name.input.value) || draft.name; save(); });
      const actions = node('div', null, 'plan-actions');
      actions.append(
        button('New draft', async () => {
          const created = P.newDraft(`Draft ${plan.drafts.length + 1}`);
          plan.drafts.push(created); plan.activeId = created.id;
          await P.store.writePlan(term, plan); scan(); render();
        }, 'quiet'),
        button('Duplicate', async () => {
          const copy = { ...P.newDraft(`${draft.name} copy`), picks: draft.picks.map(pick => ({ ...pick })) };
          plan.drafts.push(copy); plan.activeId = copy.id;
          await P.store.writePlan(term, plan); scan(); render();
        }, 'quiet'),
        confirmButton('Delete', 'Confirm delete', async () => {
          plan.drafts = plan.drafts.filter(item => item.id !== draft.id);
          if (!plan.drafts.length) Object.assign(plan, P.emptyPlan());
          plan.activeId = plan.drafts[0].id;
          await P.store.writePlan(term, plan); scan(); render();
        })
      );
      toolbar.append(chooser.wrapper, name.wrapper, actions);
      body.append(toolbar);

      const overview = U.summary(draft, {});
      body.append(overview.element);
      for (const entry of overview.clashes) {
        body.append(node('p', `Conflict: ${entry.a.course} ${entry.a.section} overlaps ${entry.b.course} ${entry.b.section} on ${P.conflictLabel(entry)}.`, 'error'));
      }
      for (const entry of overview.repeats) {
        body.append(node('p', `${entry.course} appears twice, in sections ${entry.sections.join(' and ')}.`, 'error'));
      }
      const program = node('div', null, 'plan-section');
      program.append(node('h3', `Courses to take in ${P.termLabel(term)}`));
      if (planState.ipsState === 'ready') {
        const remaining = P.remainingCourses(planState.ips);
        const totals = planState.ips.totals;
        program.append(node('p', totals
          ? `${totals.remaining} units remaining of ${totals.total}. Sections below come from this term's AISIS listings.`
          : 'Sections below come from this term\'s AISIS listings.', 'muted'));
        const status = sweepLabel();
        if (status) { const line = node('p', status, `note${sweep.status === 'failed' ? ' flag' : ''}`); line.setAttribute('role', 'status'); program.append(line); }
        program.append(U.suggestionPanel({
          remaining, sections, term, picks: draft.picks, searching: sweep.status === 'running' && sweep.term === term,
          onToggle: section => togglePick(term, section)
        }));
        const controls = node('div', null, 'actions');
        if (sweep.status !== 'running') controls.append(button(sweep.status === 'idle' ? 'Find my sections' : 'Search AISIS again', () => collectOfferings(term, { force: true })));
        controls.append(button('Refresh program', () => loadIps(true), 'quiet'));
        program.append(controls);
      } else if (planState.ipsState === 'loading') {
        program.append(node('p', 'Reading your Individual Program of Study…', 'loading'));
      } else {
        program.append(node('p', 'Your Individual Program of Study could not be read, so courses cannot be suggested. Sign in to AISIS and try again.', 'muted'));
        program.append(button('Read my program', () => loadIps(true)));
      }

      body.append(program);
      body.append(node('h3', 'Weekly view', 'plan-heading'));
      body.append(U.grid(draft.picks, { clashing: U.clashingKeys(draft.picks) }));

      const picks = node('div', null, 'plan-section');
      picks.append(node('h3', `Sections in this draft (${draft.picks.length})`));
      if (draft.picks.length) {
        picks.append(U.pickTable(draft.picks, {
          clashing: U.clashingKeys(draft.picks),
          onRemove: pick => {
            draft.picks = draft.picks.filter(item => P.sectionKey(item) !== P.sectionKey(pick));
            save();
          }
        }));
        const warnings = draft.picks.flatMap(pick => P.sectionWarnings(pick).map(warning => ({ pick, warning })));
        for (const { pick, warning } of warnings) {
          picks.append(node('p', `${pick.course} ${pick.section}: ${warning.text}`, `note${warning.level === 'high' ? ' flag' : ''}`));
        }
      } else {
        picks.append(node('p', 'Add sections above, or use Add to plan in the Links column of the class schedule.', 'muted'));
      }
      body.append(picks);

      const footer = node('div', null, 'actions');
      const copy = button('Copy draft as text', async () => {
        try { await navigator.clipboard.writeText(P.exportText(draft, term)); copy.textContent = 'Draft copied'; }
        catch { copy.textContent = 'Copying is blocked here'; }
      });
      copy.setAttribute('aria-live', 'polite');
      footer.append(copy, button('Open full planner', () => openFullPlanner(term), 'quiet'));
      body.append(footer);
      body.append(node('p', 'A draft is a personal plan. It does not reserve a slot or change your enlistment in AISIS.', 'footer'));
    }
    plannerRefresh = render;
    render();
  }
  // Every section of one course that AISIS lists for the term, so an
  // alternative can be picked without scrolling the whole schedule.
  function showCoursePlan(data, term) {
    const { body, dialog } = modal('Plan course', displayName(data.title) || `Section ${data.section}`, data.course);
    let closed = false;
    dialog.addEventListener('close', () => { closed = true; if (plannerRefresh === render) plannerRefresh = null; });
    async function render() {
      if (closed) return;
      const plan = await P.store.readPlan(term);
      const stored = await P.store.readSections(term);
      if (closed) return;
      planState.term = term; planState.plan = plan; planState.loading = '';
      const draft = P.activeDraft(plan);
      const merged = new Map(stored.map(section => [P.sectionKey(section), section]));
      for (const section of sectionsFromDocument(document)) merged.set(P.sectionKey(section), section);
      const offerings = P.offeringsFor({ code: data.course }, [...merged.values()])
        .filter(section => C.courseKey(section.course) === C.courseKey(data.course));
      body.replaceChildren();
      const needed = remainingMatch(data.course);
      if (planState.ipsState !== 'ready') {
        body.append(node('p', 'Your program of study has not been read, so this course cannot be checked against it.', 'muted'));
      } else if (needed) {
        body.append(node('p', needed.exact
          ? `Your program still needs ${needed.course.code}${P.programTag(needed.course) ? `, filed under ${P.programTag(needed.course)}` : ''}.`
          : `Counts toward ${needed.course.code}, which your program still needs${P.programTag(needed.course) ? `, filed under ${P.programTag(needed.course)}` : ''}.`, 'match-note exact'));
      } else {
        body.append(node('p', 'This course is not among the courses your program still lists as not taken.', 'muted'));
      }
      body.append(node('h3', `Sections in ${P.termLabel(term)} (${offerings.length})`));
      if (!offerings.length) {
        body.append(node('p', 'No section of this course has been found for this term yet.', 'muted'));
      } else {
        const list = node('div', null, 'suggest');
        for (const section of offerings) list.append(U.offerRow(section, { picks: draft.picks, onToggle: pick => togglePick(term, pick) }));
        body.append(list);
      }
      const clashes = P.conflicts(draft.picks);
      body.append(node('p', `${draft.name}: ${draft.picks.length} course${draft.picks.length === 1 ? '' : 's'} · ${P.totalUnits(draft.picks)} units${clashes.length ? ` · ${clashes.length} conflict${clashes.length === 1 ? '' : 's'}` : ''}.`, 'note'));
      const actions = node('div', null, 'actions');
      actions.append(button('Open draft schedule', () => showPlanner(term)), button('Full planner', () => openFullPlanner(term), 'quiet'));
      body.append(actions);
    }
    plannerRefresh = render;
    render();
  }
  function renderBar(host, term) {
    const shadow = host.shadowRoot;
    shadow.querySelector('.bar')?.remove();
    const bar = node('div', null, 'bar');
    const plan = planFor(term);
    const draft = plan ? P.activeDraft(plan) : null;
    const clashes = draft ? P.conflicts(draft.picks) : [];
    const heading = node('span', 'Planning ');
    heading.append(node('b', P.termLabel(term)));
    bar.append(heading);
    if (draft) {
      const summary = node('span', null);
      summary.append(node('b', draft.name), document.createTextNode(`: ${draft.picks.length} course${draft.picks.length === 1 ? '' : 's'} · ${P.totalUnits(draft.picks)} units`));
      bar.append(summary);
      if (clashes.length) bar.append(node('span', `${clashes.length} time conflict${clashes.length === 1 ? '' : 's'}`, 'flag'));
    }
    if (planState.ipsState === 'ready') {
      const { due, other } = P.groupRemaining(P.remainingCourses(planState.ips), term);
      const count = due.length || other.length;
      bar.append(node('span', due.length
        ? `${due.length} course${due.length === 1 ? '' : 's'} due this term in your program`
        : `${count} course${count === 1 ? '' : 's'} still not taken`));
    } else if (planState.ipsState === 'loading') {
      bar.append(node('span', 'Reading your program of study…'));
    } else if (planState.ipsState === 'unavailable') {
      bar.append(node('span', 'Program of study not read', 'flag'));
    }
    const status = sweepLabel();
    if (status) {
      const line = node('span', status, sweep.status === 'failed' ? 'flag' : '');
      line.setAttribute('role', 'status');
      bar.append(line);
    }
    bar.append(node('span', '', 'spacer'));
    const actions = node('div', null, 'plan-actions');
    actions.append(button('Plan my schedule', () => showPlanner(term)), button('Full planner', () => openFullPlanner(term), 'quiet'));
    if (planState.ipsState === 'unavailable') actions.append(button('Read my program', () => loadIps(true), 'quiet'));
    else if (sweep.status !== 'running' && planState.ipsState === 'ready') actions.append(button(sweep.status === 'idle' ? 'Find my sections' : 'Search again', () => collectOfferings(term, { force: true }), 'quiet'));
    bar.append(actions);
    shadow.append(bar);
  }
  function planBar(table, term) {
    // Only place the bar where a block element is valid markup beside the table.
    if (!table.parentElement || /^(TABLE|TBODY|THEAD|TFOOT|TR)$/.test(table.parentElement.tagName)) return;
    let host = table.previousElementSibling;
    if (!host?.dataset || !('companionBar' in host.dataset)) {
      host = makeShadow().host;
      host.dataset.companionBar = term;
      table.before(host);
    } else if (host.dataset.companionBar !== term) {
      host.dataset.companionBar = term;
    }
    renderBar(host, term);
  }
  // Sweep progress and draft counts change without the table changing, so the
  // bar is re-rendered on its own rather than through a full rescan.
  function refreshBars() {
    for (const host of document.querySelectorAll('[data-companion-bar]')) {
      if (host.shadowRoot) renderBar(host, host.dataset.companionBar || termId());
    }
  }
  function removeCompanion(row) {
    const cell = row.querySelector('[data-companion-cell]');
    for (const anchor of cell?.querySelector('[data-aisis-companion]')?.shadowRoot?.querySelectorAll('[data-syllabus-url]') || []) syllabusObserver?.unobserve(anchor);
    cell?.remove(); enhanced.delete(row);
  }
  const enhanced = new WeakMap();
  // Unknown interdisciplinary prefixes are resolved from AISIS itself, rather
  // than guessed from the instructor's department or an outdated prefix map.
  const departmentCache = new Map(), lookupJobs = new Map();
  function lookupKey(course) { const p = period(); return `${p.year}-${p.semester}:${C.courseKey(course)}`; }
  function resolvedDepartment(course) {
    return C.departmentFor(course, document.querySelector('[name="deptCode"]')?.value || '') || departmentCache.get(lookupKey(course)) || '';
  }
  // The class schedule search form is the only AISIS endpoint that lists a
  // department's sections, so both the department lookup and the planner's
  // section search post to it.
  function scheduleEndpoint() {
    const form = document.querySelector('[name="deptCode"]')?.closest('form');
    if (!form) return null;
    const endpoint = new URL(form.getAttribute('action') || location.href, location.href);
    return endpoint.origin === location.origin && endpoint.pathname === '/j_aisis/J_VCSC.do' ? endpoint : null;
  }
  function departmentCodes({ strict = false } = {}) {
    const pattern = strict ? /^[A-Z][A-Z0-9-]{1,15}$/ : /^[A-Z][A-Z0-9 ()-]{1,19}$/i;
    return [...(document.querySelector('[name="deptCode"]')?.options || [])]
      .map(option => option.value)
      .filter(value => pattern.test(value) && !/^(ALL|IE|\*\*IE\*\*)$/i.test(value));
  }
  async function fetchDepartment(term, code) {
    const endpoint = scheduleEndpoint();
    if (!endpoint) throw new Error('The AISIS class schedule form is not on this page.');
    const body = new URLSearchParams({ command: 'displayResults', applicablePeriod: term, deptCode: code, subjCode: 'ALL' });
    const response = await fetch(endpoint.href, { method: 'POST', body, credentials: 'same-origin', signal: AbortSignal.timeout(20000) });
    if (!response.ok || new URL(response.url || endpoint.href).origin !== location.origin) throw new Error('AISIS lookup unavailable');
    const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
    if (doc.querySelector('[name="deptCode"]')?.value !== code || doc.querySelector('[name="applicablePeriod"]')?.value !== term) {
      throw new Error('AISIS lookup requires a signed-in session');
    }
    return doc;
  }
  function requestDepartmentLookup(courses) {
    const selector = document.querySelector('[name="deptCode"]');
    const p = period(), term = `${p.year}-${p.semester}`;
    if (lookupJobs.has(term)) return;
    const unavailable = () => { lookupJobs.set(term, { pending: false }); queueMicrotask(scan); };
    if (!selector || !p.year || !p.semester) return unavailable();
    const endpoint = scheduleEndpoint();
    if (!endpoint) return unavailable();
    const available = departmentCodes({ strict: true });
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
          const doc = await fetchDepartment(term, code);
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
  // Optional columns only the planner needs. A schedule table missing any of
  // them still gets the syllabus and review tools.
  const OPTIONAL_COLUMNS = { units: /^Units$/i, time: /^Time$/i, room: /^Room$/i, maxNo: /^Max\.?\s*No\.?$/i, lang: /^Lang(uage)?$/i, level: /^Level$/i, freeSlots: /^Free Slots$/i, remarks: /^Remarks$/i };
  function findHeader(rows) {
    return rows.find(row => [...row.cells].some(cell => /^(Subject|Course) Code$/i.test(C.clean(cell.textContent)))
      && [...row.cells].some(cell => /^(Instructor|Professor)$/i.test(C.clean(cell.textContent))));
  }
  function columnIndices(header) {
    const names = [...header.cells].map(cell => C.clean(cell.textContent));
    const indices = {
      course: names.findIndex(s => /^(Subject|Course) Code$/i.test(s)), section: names.findIndex(s => /^Section$/i.test(s)),
      title: names.findIndex(s => /^Course Title$/i.test(s)), professor: names.findIndex(s => /^(Instructor|Professor)$/i.test(s))
    };
    if (Object.values(indices).some(index => index < 0)) return null;
    for (const [key, pattern] of Object.entries(OPTIONAL_COLUMNS)) {
      const index = names.findIndex(name => pattern.test(name));
      if (index >= 0) indices[key] = index;
    }
    return indices;
  }
  function sectionsFromDocument(doc, dept) {
    const found = [];
    for (const table of doc.querySelectorAll('table')) {
      const rows = [...table.rows].filter(row => row.closest('table') === table);
      const header = findHeader(rows);
      const indices = header && columnIndices(header);
      if (!indices) continue;
      for (const row of rows) {
        const data = C.readRow(row, indices);
        if (data) found.push(sectionRecord(data, dept));
      }
    }
    return found;
  }
  // Deferred work can resolve after the page has been torn down or replaced.
  const alive = () => { try { return !!document?.body && !!location.pathname; } catch { return false; } };
  function scan() {
    if (!alive()) return;
    observer.disconnect();
    try {
      const unknownCourses = new Set();
      const term = termId();
      const captured = [];
      const anyFeature = features.syllabus || features.reviews || features.planner;
      if (!features.planner) for (const bar of document.querySelectorAll('[data-companion-bar]')) bar.remove();
      for (const table of document.querySelectorAll('table')) {
        const rows = [...table.rows].filter(r => r.closest('table') === table);
        const hasNativeSyllabus = rows.some(row => [...row.cells].some(cell =>
          !cell.hasAttribute('data-companion-cell') && /\b(?:view\s+(?:class\s+)?syllabus|syllabus\s+not\s+available)\b/i.test(C.clean(cell.textContent))));
        if (hasNativeSyllabus || !anyFeature) {
          for (const row of rows) removeCompanion(row);
          const previous = table.previousElementSibling;
          if (previous?.dataset && 'companionBar' in previous.dataset) previous.remove();
          continue;
        }
        const header = findHeader(rows);
        const indices = header && columnIndices(header);
        if (!indices) continue;
        // Also replace cells left in saved pages or by an earlier extension version.
        header.querySelector('[data-companion-cell]')?.remove();
        const headingCell = matchingCell(header.cells[0]); headingCell.textContent = 'Links'; header.append(headingCell);
        if (features.planner && term) planBar(table, term);
        for (const row of rows) {
          const data = C.readRow(row, indices);
          if (!data) continue;
          const links = features.syllabus ? syllabusLinks(data) : [];
          const needsDepartment = features.syllabus && !resolvedDepartment(data.course);
          const state = lookupJobs.get(`${period().year}-${period().semester}`);
          if (needsDepartment) unknownCourses.add(data.course);
          const record = sectionRecord(data);
          if (features.planner && term && term === pageTerm) captured.push(record);
          const picked = features.planner && activePicks(term).some(pick => P.sectionKey(pick) === P.sectionKey(record));
          const needed = features.planner ? remainingMatch(data.course) : null;
          const signature = JSON.stringify([data, links, state?.pending, features, picked, needed?.course.code ?? null, row.cells[0].getAttribute('class'), row.cells[0].getAttribute('style'), row.cells[0].getAttribute('background')]);
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
          if (features.syllabus && (!links.length || links.some(item => !item.url))) {
            if (needsDepartment && (!state || state.pending)) {
              const loading = node('span', 'Finding syllabus…', 'unavailable'); loading.setAttribute('role', 'status'); buttons.append(loading);
            } else if (!data.professors.length || data.professors.some(name => !C.isNamedInstructor(name))) {
              const missing = node('span', 'Instructor TBA', 'unavailable'); missing.title = 'A syllabus link needs a named instructor.'; buttons.append(missing);
            } else {
              buttons.append(button('Set syllabus link', () => showSyllabus(data)));
            }
          }
          if (features.reviews) buttons.append(button('Prof reviews', () => { const current = C.readRow(row, indices); if (current) showReviews(current); }));
          if (features.planner && term) {
            const toggle = button(picked ? 'Remove from plan' : 'Add to plan', () => togglePick(term, sectionRecord(C.readRow(row, indices) || data)));
            toggle.title = picked ? 'Remove this section from the current draft schedule' : 'Add this section to the current draft schedule';
            buttons.append(toggle);
            const options = button('Plan course', () => { const current = C.readRow(row, indices); if (current) showCoursePlan(current, term); });
            options.title = 'Show every section of this course this term, with clashes against your draft';
            buttons.append(options);
            if (needed) {
              const badge = node('span', `In your program${P.programTag(needed.course) ? ` · ${P.programTag(needed.course)}` : ''}`, 'needed');
              badge.title = needed.exact
                ? `${needed.course.code} is not yet taken in your Individual Program of Study.`
                : `Counts toward ${needed.course.code}, which is not yet taken in your Individual Program of Study.`;
              buttons.append(badge);
            }
          }
          shadow.append(buttons); cell.append(host); row.append(cell); enhanced.set(row, signature);
        }
      }
      if (unknownCourses.size) requestDepartmentLookup([...unknownCourses]);
      if (captured.length) captureSections(term, captured);
    } finally { observer.observe(document.body, { childList: true, characterData: true, subtree: true }); }
  }
  // Sections are saved as they are browsed so the full planner tab can search
  // every listing opened in this browser, not just the table on screen.
  let captureTimer, capturePending = new Map(), captureTerm = '';
  function captureSections(term, sections) {
    if (captureTerm !== term) { capturePending = new Map(); captureTerm = term; }
    for (const section of sections) capturePending.set(P.sectionKey(section), section);
    clearTimeout(captureTimer);
    captureTimer = setTimeout(() => {
      const batch = [...capturePending.values()];
      capturePending = new Map();
      if (batch.length) P.store.mergeSections(term, batch);
    }, 900);
  }
  let timer;
  const observer = new MutationObserver(() => { clearTimeout(timer); timer = setTimeout(scan, 180); });
  document.addEventListener('change', event => {
    if (!event.target.matches('[name="applicablePeriod"], [name="deptCode"]')) return;
    scan();
    if (event.target.matches('[name="applicablePeriod"]')) collectOfferings(termId());
  }, true);
  // The toolbar popup asks whether the tools actually loaded in this tab, so a
  // page left open from before an update can be identified rather than guessed.
  try {
    chrome.runtime.onMessage.addListener((message, sender, respond) => {
      if (sender.id !== chrome.runtime.id || message?.type !== 'ping') return;
      respond({ ok: true, version: chrome.runtime.getManifest().version, term: termId(), features });
      return true;
    });
  } catch { /* The tools still run without the popup status line. */ }
  pageTerm = termId();
  scan();
  S.read().then(values => {
    const changed = Object.keys(values).some(key => values[key] !== features[key]);
    features = values;
    if (changed) scan();
    if (features.planner) { loadIps(); P.store.prune(); }
  });
  S.subscribe(values => {
    const enabled = values.planner && !features.planner;
    features = values;
    scan();
    if (enabled) loadIps();
  });
  // A draft edited in the full planner tab is reflected here without a reload.
  try {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'local' || !features.planner) return;
      const term = termId();
      if (term && changes[P.KEYS.plan(term)]) {
        planState.plan = null; planState.term = ''; planState.loading = '';
        scan(); plannerRefresh?.();
      }
    });
  } catch { /* The page still shows drafts saved from this tab. */ }
})();
