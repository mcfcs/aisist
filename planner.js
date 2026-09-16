(() => {
  'use strict';
  const P = globalThis.AisisPlan, U = globalThis.AisisPlanUi, S = globalThis.AisisSettings;
  const R = globalThis.AisisRead, O = globalThis.AisisOfferings;
  // The planner reads AISIS itself, so it works whether or not a class
  // schedule tab happens to be open.
  const aisis = R.createClient({ fetch: (...args) => fetch(...args), credentials: 'include' });
  const collector = O.createCollector({
    load: (term, code) => aisis.department(term, code),
    departmentFor: course => globalThis.AisisCore.departmentFor(course, ''),
    concurrency: 2
  });
  const el = U.el;
  const $ = id => document.getElementById(id);
  const RESULT_LIMIT = 150;
  document.head.append(Object.assign(document.createElement('style'), { textContent: U.styles }));

  const state = { term: '', plan: null, sections: [], ips: null, terms: [], offerings: null, departments: [], busy: false };
  // Deleting a draft discards its picks, so the button asks once before it acts.
  let armed = false;
  const requested = new URLSearchParams(location.search).get('term') || '';

  function notice(text) {
    $('notice').textContent = text || '';
    $('notice').hidden = !text;
  }
  function draftNow() { return state.plan ? P.activeDraft(state.plan) : null; }
  async function save() {
    const draft = draftNow();
    if (draft) draft.updated = Date.now();
    await P.store.writePlan(state.term, state.plan);
    render();
  }
  async function loadTerm(term) {
    state.term = term;
    state.plan = await P.store.readPlan(term);
    state.sections = await P.store.readSections(term);
    state.offerings = await P.store.readOfferings(term);
    render();
  }
  function progress(text) { $('progress').textContent = text || ''; }
  function busy(value) {
    state.busy = value;
    $('load').disabled = value;
    $('stop').hidden = !value;
    $('term').disabled = value || state.terms.length < 2;
  }
  // Everything the planner needs is read here, so it does not depend on a
  // class schedule tab being open and running the content script.
  async function loadFromAisis({ force = false } = {}) {
    if (state.busy) return;
    busy(true); notice('');
    try {
      progress('Reading the AISIS class schedule form…');
      const form = await aisis.form();
      state.departments = form.departments;
      state.terms = [...new Set([...form.terms, ...state.terms])].filter(Boolean);
      if (!state.terms.includes(state.term)) await loadTerm(form.term || state.terms[0]);
      renderTerms();

      if (force || !state.ips?.courses?.length) {
        progress('Reading your Individual Program of Study…');
        state.ips = { ...await aisis.program(), fetchedAt: Date.now() };
        await P.store.writeIps(state.ips);
        renderRemaining();
      }
      const needed = P.remainingCourses(state.ips);
      if (!needed.length) { progress('Your program lists no courses as still not taken.'); return; }

      const stored = await P.store.readOfferings(state.term);
      if (!force && stored?.status === 'complete' && Date.now() - stored.at < 24 * 60 * 60 * 1000) {
        state.offerings = stored;
        progress(`Sections for ${P.termLabel(state.term)} were already collected.`);
        render();
        return;
      }
      state.offerings = { status: 'running', at: Date.now(), scanned: 0, total: state.departments.length, missing: needed.map(course => course.code), errors: [] };
      renderRemaining();
      const term = state.term;
      const result = await collector.collect({
        term, departments: state.departments, needed, known: state.sections,
        onProgress: update => {
          if (update.term !== state.term) return;
          progress(update.done ? '' : `Reading AISIS: ${update.scanned} of ${update.total} departments${update.department ? `, now ${update.department}` : ''}.`);
          state.offerings = { ...state.offerings, scanned: update.scanned, total: update.total, missing: update.missing, errors: update.errors };
          if (update.sections?.length) {
            const merged = new Map(state.sections.map(section => [P.sectionKey(section), section]));
            for (const section of update.sections) merged.set(P.sectionKey(section), section);
            state.sections = [...merged.values()];
            renderTerms(); renderResults();
          }
          renderRemaining();
        }
      });
      if (state.term !== term) return;
      state.offerings = { status: result.status, at: Date.now(), scanned: result.scanned, total: result.total, missing: result.missing, errors: result.errors };
      await P.store.mergeSections(term, result.sections);
      await P.store.writeOfferings(term, state.offerings);
      state.sections = await P.store.readSections(term);
      progress(`Read ${result.scanned} of ${result.total} departments for ${P.termLabel(term)}.`);
      render();
    } catch (error) {
      progress('');
      notice(String(error?.message || error));
    } finally {
      busy(false);
    }
  }

  function renderTerms() {
    const select = $('term');
    select.replaceChildren();
    for (const term of state.terms) {
      const option = el('option', P.termLabel(term));
      option.value = term;
      select.append(option);
    }
    select.value = state.term;
    $('subtitle').textContent = `${P.termLabel(state.term)} · ${state.sections.length} section${state.sections.length === 1 ? '' : 's'} saved from AISIS`;
  }
  function renderDraftControls() {
    const draft = draftNow();
    const select = $('draft');
    select.replaceChildren();
    for (const item of state.plan.drafts) {
      const option = el('option', `${item.name} (${item.picks.length})`);
      option.value = item.id;
      select.append(option);
    }
    select.value = draft.id;
    if (document.activeElement !== $('draftName')) $('draftName').value = draft.name;
    armed = false;
    $('remove').textContent = 'Delete';
  }
  function renderSummary() {
    const draft = draftNow();
    const overview = U.summary(draft, {});
    $('summary').replaceChildren(overview.element);
    const holder = $('conflicts');
    holder.replaceChildren();
    for (const entry of overview.clashes) {
      holder.append(el('p', `Conflict: ${entry.a.course} ${entry.a.section} overlaps ${entry.b.course} ${entry.b.section} on ${P.conflictLabel(entry)}.`, 'error'));
    }
    for (const entry of overview.repeats) {
      holder.append(el('p', `${entry.course} appears twice, in sections ${entry.sections.join(' and ')}.`, 'error'));
    }
    for (const pick of draft.picks) {
      for (const warning of P.sectionWarnings(pick).filter(item => item.level === 'high')) {
        holder.append(el('p', `${pick.course} ${pick.section}: ${warning.text}`, 'note flag'));
      }
    }
  }
  function renderGrid() {
    const draft = draftNow();
    $('grid').replaceChildren(U.grid(draft.picks, { clashing: U.clashingKeys(draft.picks) }));
  }
  function renderPicks() {
    const draft = draftNow();
    $('picksHeading').textContent = `Sections in this draft (${draft.picks.length})`;
    const holder = $('picks');
    if (!draft.picks.length) {
      holder.replaceChildren(el('p', 'Add sections from Find sections, or use Add to plan in the AISIS class schedule.', 'muted'));
      return;
    }
    holder.replaceChildren(U.pickTable(draft.picks, {
      clashing: U.clashingKeys(draft.picks),
      onRemove: pick => {
        draft.picks = draft.picks.filter(item => P.sectionKey(item) !== P.sectionKey(pick));
        save();
      }
    }));
    for (const pick of draft.picks) {
      for (const warning of P.sectionWarnings(pick)) {
        holder.append(el('p', `${pick.course} ${pick.section}: ${warning.text}`, `note${warning.level === 'high' ? ' flag' : ''}`));
      }
    }
  }
  function renderRemaining() {
    const holder = $('remaining');
    holder.replaceChildren();
    $('suggestHeading').textContent = `Courses to take in ${P.termLabel(state.term)}`;
    if (!state.ips?.courses?.length) {
      holder.append(el('p', 'Your Individual Program of Study has not been read yet. Open the AISIS Class Schedule while signed in, with the schedule planner turned on, and it is read automatically.', 'muted'));
      return;
    }
    const draft = draftNow();
    const remaining = P.remainingCourses(state.ips);
    const totals = state.ips.totals;
    holder.append(el('p', totals
      ? `${totals.remaining} units remaining of ${totals.total}. ${remaining.length} course${remaining.length === 1 ? '' : 's'} not yet taken.`
      : `${remaining.length} course${remaining.length === 1 ? '' : 's'} not yet taken.`, 'muted'));
    const search = state.offerings;
    if (!search) {
      holder.append(el('p', 'Sections have not been read for this term yet. Use Load my program and sections above.', 'note'));
    } else if (search.status === 'running') {
      holder.append(el('p', `Reading AISIS: ${search.scanned || 0} of ${search.total || 0} departments…`, 'note'));
    } else if (search.status === 'failed') {
      holder.append(el('p', 'AISIS refused the section search. Sign in to AISIS and load again.', 'note flag'));
    }
    // A course with no sections is either not offered or its department could
    // not be read; say which, rather than leaving the student guessing.
    for (const entry of search?.errors || []) {
      holder.append(el('p', `${entry.department} could not be read: ${entry.message}`, 'note flag'));
    }
    if (search?.status !== 'running' && search?.missing?.length && !search?.errors?.length) {
      holder.append(el('p', `AISIS lists no section this term for ${search.missing.join(', ')}.`, 'note'));
    }
    holder.append(U.suggestionPanel({
      remaining, sections: state.sections, term: state.term, picks: draft.picks,
      searching: search?.status === 'running',
      onToggle: section => {
        const key = P.sectionKey(section);
        draft.picks = draft.picks.some(pick => P.sectionKey(pick) === key)
          ? draft.picks.filter(pick => P.sectionKey(pick) !== key)
          : [...draft.picks, section];
        save();
      }
    }));
    holder.append(el('p', `Program of study read from AISIS at ${new Date(state.ips.fetchedAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}.`, 'note'));
  }
  const clashesWithDraft = (section, picks) => U.clashesWith(section, picks);
  function renderResults() {
    const draft = draftNow();
    const query = P.clean($('search').value).toLowerCase();
    const remaining = P.remainingCourses(state.ips);
    const picked = new Set(draft.picks.map(pick => P.sectionKey(pick)));
    let matches = state.sections;
    if (query) {
      const terms = query.split(/\s+/);
      matches = matches.filter(section => {
        const haystack = `${section.course} ${section.section} ${section.title} ${section.instructors}`.toLowerCase();
        return terms.every(part => haystack.includes(part));
      });
    }
    if ($('onlyNeeded').checked) matches = matches.filter(section => remaining.length && P.matchRemaining(section.course, remaining));
    if ($('hideFull').checked) matches = matches.filter(section => !Number.isFinite(Number.parseInt(section.freeSlots, 10)) || Number.parseInt(section.freeSlots, 10) > 0);
    if ($('hideClashing').checked) matches = matches.filter(section => picked.has(P.sectionKey(section)) || !clashesWithDraft(section, draft.picks));
    const sorted = [...matches].sort((a, b) => P.courseKey(a.course).localeCompare(P.courseKey(b.course)) || P.clean(a.section).localeCompare(P.clean(b.section)));
    const shown = sorted.slice(0, RESULT_LIMIT);
    $('resultCount').textContent = state.sections.length
      ? `${sorted.length} matching section${sorted.length === 1 ? '' : 's'}${sorted.length > shown.length ? `, showing the first ${shown.length}` : ''}.`
      : '';
    const holder = $('results');
    holder.replaceChildren();
    if (!state.sections.length) {
      holder.append(el('p', 'No sections saved for this term yet. Open the AISIS Class Schedule and browse a department; sections load here as you view them.', 'empty'));
      return;
    }
    if (!shown.length) { holder.append(el('p', 'No sections match these filters.', 'empty')); return; }
    for (const section of shown) {
      const key = P.sectionKey(section);
      const inDraft = picked.has(key);
      const card = el('div', null, `result${inDraft ? ' picked' : ''}`);
      const row = el('div', null, 'row');
      const heading = el('b', `${section.course} ${section.section}`.trim());
      const match = remaining.length ? P.matchRemaining(section.course, remaining) : null;
      row.append(heading);
      const toggle = el('button', inDraft ? 'Remove' : 'Add', 'quiet');
      toggle.type = 'button';
      toggle.setAttribute('aria-label', `${inDraft ? 'Remove' : 'Add'} ${section.course} section ${section.section}`);
      toggle.addEventListener('click', () => {
        if (inDraft) draft.picks = draft.picks.filter(item => P.sectionKey(item) !== key);
        else draft.picks = [...draft.picks, section];
        save();
      });
      row.append(toggle);
      card.append(row);
      card.append(el('div', [P.clean(section.title), section.units ? `${section.units} units` : ''].filter(Boolean).join(' · '), 'meta'));
      card.append(el('div', [P.meetingLabel(section) || 'TBA', P.clean(section.room)].filter(Boolean).join(' · '), 'meta'));
      card.append(el('div', [P.clean(section.instructors), section.freeSlots === '' ? '' : `${section.freeSlots} free slots`].filter(Boolean).join(' · '), 'meta'));
      if (match) card.append(el('div', match.exact ? `Needed: ${match.course.code}` : `Counts toward ${match.course.code}`, 'meta'));
      if (!inDraft && clashesWithDraft(section, draft.picks)) card.append(el('div', 'Clashes with this draft.', 'note flag'));
      holder.append(card);
    }
  }
  function render() {
    if (!state.plan) return;
    renderTerms();
    renderDraftControls();
    renderSummary();
    renderGrid();
    renderPicks();
    renderRemaining();
    renderResults();
  }

  $('term').addEventListener('change', async () => { await loadTerm($('term').value); loadFromAisis(); });
  $('load').addEventListener('click', () => loadFromAisis({ force: true }));
  $('stop').addEventListener('click', () => { collector.cancel(); progress('Stopped.'); busy(false); });
  $('draft').addEventListener('change', async () => { state.plan.activeId = $('draft').value; await P.store.writePlan(state.term, state.plan); render(); });
  $('draftName').addEventListener('change', () => { const draft = draftNow(); draft.name = P.clean($('draftName').value) || draft.name; save(); });
  $('newDraft').addEventListener('click', async () => {
    const created = P.newDraft(`Draft ${state.plan.drafts.length + 1}`);
    state.plan.drafts.push(created); state.plan.activeId = created.id;
    await P.store.writePlan(state.term, state.plan); render();
    $('draftName').focus();
  });
  $('duplicate').addEventListener('click', async () => {
    const draft = draftNow();
    const copy = { ...P.newDraft(`${draft.name} copy`), picks: draft.picks.map(pick => ({ ...pick })) };
    state.plan.drafts.push(copy); state.plan.activeId = copy.id;
    await P.store.writePlan(state.term, state.plan); render();
  });
  $('remove').addEventListener('click', async () => {
    if (!armed) { armed = true; $('remove').textContent = 'Confirm delete'; return; }
    armed = false;
    state.plan.drafts = state.plan.drafts.filter(item => item.id !== state.plan.activeId);
    if (!state.plan.drafts.length) Object.assign(state.plan, P.emptyPlan());
    state.plan.activeId = state.plan.drafts[0].id;
    await P.store.writePlan(state.term, state.plan); render();
  });
  $('copy').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(P.exportText(draftNow(), state.term)); $('copy').textContent = 'Copied'; }
    catch { $('copy').textContent = 'Copying is blocked'; }
    setTimeout(() => { $('copy').textContent = 'Copy as text'; }, 2500);
  });
  let searchTimer;
  $('search').addEventListener('input', () => { clearTimeout(searchTimer); searchTimer = setTimeout(renderResults, 150); });
  for (const id of ['onlyNeeded', 'hideFull', 'hideClashing']) $(id).addEventListener('change', renderResults);

  // Drafts edited in an AISIS tab, and newly browsed sections, arrive here
  // without a reload.
  try {
    chrome.storage.onChanged.addListener(async (changes, area) => {
      if (area !== 'local') return;
      if (changes[P.KEYS.ips]) { state.ips = changes[P.KEYS.ips].newValue || null; renderRemaining(); renderResults(); }
      if (changes[P.KEYS.sections(state.term)]) {
        state.sections = changes[P.KEYS.sections(state.term)].newValue || [];
        renderTerms(); renderRemaining(); renderResults();
      }
      if (changes[P.KEYS.offerings(state.term)]) {
        state.offerings = changes[P.KEYS.offerings(state.term)].newValue || null;
        renderRemaining();
      }
      const planChange = changes[P.KEYS.plan(state.term)];
      if (planChange && JSON.stringify(planChange.newValue) !== JSON.stringify(state.plan)) {
        state.plan = await P.store.readPlan(state.term);
        render();
      }
    });
  } catch { /* The planner still works with the data loaded at startup. */ }

  (async () => {
    const features = await S.read();
    if (!features.planner) notice('The schedule planner is turned off. Turn it back on from the extension popup.');
    state.ips = await P.store.readIps();
    const known = await P.store.listTerms();
    const term = /^20\d{2}-[012]$/.test(requested) ? requested : known[0] || '';
    state.terms = [...new Set([term, ...known])].filter(Boolean);
    state.plan = P.emptyPlan();
    if (state.terms.length) await loadTerm(term);
    else { state.terms = ['']; render(); }
    // Read AISIS straight away so the planner works on its own.
    loadFromAisis();
  })();
})();
