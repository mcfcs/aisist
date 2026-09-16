(function (root) {
  'use strict';
  const C = root.AisisCore, P = root.AisisPlan;
  const ORIGIN = 'https://aisis.ateneo.edu';
  const SCHEDULE = `${ORIGIN}/j_aisis/J_VCSC.do`;
  const PROGRAM = `${ORIGIN}/j_aisis/J_VIPS.do`;
  const SIGNED_OUT = 'AISIS did not answer as a signed-in session. Open AISIS, sign in, and try again.';
  // Columns beyond the four every tool needs. A table without them still works.
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
  function sectionRecord(data, dept) {
    return {
      course: data.course, section: data.section, title: data.title,
      units: data.units || '', time: data.time || '', room: data.room || '',
      instructors: data.professors.join('; '), maxNo: data.maxNo || '',
      lang: data.lang || '', level: data.level || '', freeSlots: data.freeSlots ?? '',
      remarks: data.remarks || '', dept: dept || ''
    };
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
  // The class schedule search form carries the terms and departments AISIS
  // currently offers, so neither has to be hard-coded.
  function readForm(doc) {
    const options = name => [...doc.querySelectorAll(`[name="${name}"] option`)].map(option => option.value);
    return {
      terms: options('applicablePeriod').filter(value => /^20\d{2}-[012]$/.test(value)),
      departments: options('deptCode').filter(value => /^[A-Z][A-Z0-9 ()-]{1,19}$/i.test(value) && !/^(ALL|IE|\*\*IE\*\*)$/i.test(value)),
      term: doc.querySelector('[name="applicablePeriod"]')?.value || '',
      department: doc.querySelector('[name="deptCode"]')?.value || ''
    };
  }
  // One reader for both callers: the content script uses the page's own
  // session, the planner tab uses the extension's AISIS host permission.
  function createClient({ fetch: fetcher, credentials = 'same-origin', timeout = 45000 } = {}) {
    async function page(url, options = {}) {
      let response;
      try {
        response = await fetcher(url, { credentials, cache: 'no-store', signal: AbortSignal.timeout(timeout), ...options });
      } catch (error) {
        throw new Error(/timeout|abort/i.test(error?.name || '') ? 'AISIS took too long to answer. Try again.' : 'AISIS could not be reached. Check your connection and that you are signed in.');
      }
      if (!response.ok) throw new Error(`AISIS returned HTTP ${response.status}.`);
      let landed = ORIGIN;
      try { landed = new URL(response.url || url).origin; } catch { /* Relative responses stay on AISIS. */ }
      if (landed !== ORIGIN) throw new Error(SIGNED_OUT);
      return new DOMParser().parseFromString(await response.text(), 'text/html');
    }
    return {
      async program() {
        const parsed = P.parseIps(await page(PROGRAM));
        if (!parsed.courses.length) throw new Error('Your Individual Program of Study could not be read. ' + SIGNED_OUT);
        return parsed;
      },
      async form() {
        const form = readForm(await page(SCHEDULE));
        if (!form.terms.length || !form.departments.length) throw new Error(SIGNED_OUT);
        return form;
      },
      async department(term, code) {
        const body = new URLSearchParams({ command: 'displayResults', applicablePeriod: term, deptCode: code, subjCode: 'ALL' });
        const doc = await page(SCHEDULE, { method: 'POST', body });
        if (doc.querySelector('[name="deptCode"]')?.value !== code || doc.querySelector('[name="applicablePeriod"]')?.value !== term) throw new Error(SIGNED_OUT);
        return sectionsFromDocument(doc, code);
      }
    };
  }
  const api = { ORIGIN, SCHEDULE, PROGRAM, SIGNED_OUT, OPTIONAL_COLUMNS, findHeader, columnIndices, sectionRecord, sectionsFromDocument, readForm, createClient };
  root.AisisRead = api;
  if (typeof module !== 'undefined') module.exports = api;
})(globalThis);
