(function (root) {
  'use strict';
  const clean = value => String(value ?? '').replace(/\s+/g, ' ').trim();
  const ascii = value => clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const courseKey = value => ascii(value).toUpperCase().replace(/\s+/g, '');
  // AISIS subject prefixes differ from its department selector codes.
  const departments = {
    ARTS: 'FA', FA: 'FA', BIO: 'BIO', CHEM: 'CH', CH: 'CH', COMM: 'COM', COM: 'COM',
    CS: 'DISCS', CSCI: 'DISCS', ISCS: 'DISCS', MSYS: 'DISCS', GDEV: 'DISCS',
    CSP: 'CHN', CHN: 'CHN', DEV: 'DS', DS: 'DS', ECON: 'EC', EC: 'EC',
    ENVI: 'ES', ES: 'ES', EURO: 'EU', EU: 'EU', HISTO: 'HI', HI: 'HI',
    HSCI: 'HSP', IDS: 'IS', IS: 'IS', JPN: 'JSP', KRN: 'KSP', LAS: 'LAS',
    MKTG: 'MAL', LAW: 'MAL', ACCT: 'FAA', FINN: 'FAA', MATH: 'MA', MA: 'MA',
    PHYS: 'PS', PS: 'PS', PNTKN: 'FIL', FILI: 'FIL', FIL: 'FIL', PSYC: 'PSY', PSY: 'PSY',
    THEO: 'TH', TH: 'TH', PHILO: 'PH', PH: 'PH', ENGL: 'EN', ENLIT: 'EN', EN: 'EN',
    POS: 'POS', POLSC: 'POS', SOCIO: 'SA', ANTH: 'SA', SA: 'SA', PE: 'PE',
    ENE: 'EN', ENGG: 'ECE'
  };
  function departmentFor(course, selected = '') {
    if (/^[A-Z][A-Z0-9-]{1,15}$/i.test(selected) && !/^(ALL|IE)$/i.test(selected)) return selected.toUpperCase();
    return departments[clean(course).toUpperCase().match(/^[A-Z]+/)?.[0]] || '';
  }
  function parseInstructors(value) {
    return clean(value).split(/;|\s+\/\s+/).flatMap(group => {
      const parts = group.split(',').map(clean).filter(Boolean), people = [];
      if (parts.length < 2) return parts;
      for (let i = 0; i < parts.length;) {
        let last = parts[i++];
        if (/^(JR|SR|II|III|IV|SJ)\.?$/i.test(parts[i] || '') && parts[i + 1]) last += `, ${parts[i++]}`;
        if (!parts[i]) return [group];
        let given = parts[i++];
        if (/^(JR|SR|II|III|IV|SJ)\.?$/i.test(parts[i] || '')) given += ` ${parts[i++]}`;
        people.push(`${last}, ${given}`);
      }
      return people;
    });
  }
  function nameParts(name) {
    const parts = clean(name).split(',').map(clean);
    let last = parts.shift() || '';
    if (/^(JR|SR|II|III|IV|SJ)\.?$/i.test(parts[0] || '') && parts.length > 1) last += `, ${parts.shift()}`;
    return { last, given: clean(parts.join(' ')) };
  }
  function nameKey(name) {
    const { last, given } = nameParts(name);
    const words = value => ascii(value).toLowerCase().replace(/[^a-z0-9 -]/g, '').split(/\s+/).filter(w => w.length > 1).join(' ');
    return `${words(last)},${words(given)}`;
  }
  function professorSlugs(name) {
    const { last, given } = nameParts(name);
    if (!last || !given) return [];
    const slug = value => ascii(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const names = given.split(/\s+/).filter(w => !/^[A-Za-z]\.?$/.test(w));
    return [...new Set([slug(`${last} ${names.join(' ')}`), slug(`${last} ${names[0] || ''}`)])];
  }
  function isNamedInstructor(professor) {
    const { last, given } = nameParts(professor);
    return !!(last && given && !/^(TBA|TBD|STAFF|N\/A)$/i.test(last) && /[A-Za-z]/.test(ascii(given)));
  }
  function syllabusUrl({ year, semester, department, course, section, professor, professors }) {
    if (!/^20\d{2}$/.test(String(year)) || !/^[012]$/.test(String(semester))) throw new Error('Enter a four-digit start year and semester 0, 1, or 2.');
    if (!/^[A-Z][A-Z0-9-]{1,15}$/i.test(department || '')) throw new Error('Choose a department code, such as DISCS.');
    const names = Array.isArray(professors) ? professors : parseInstructors(professor);
    if (!names.length || names.some(name => !isNamedInstructor(name) && !/^TBA\s*,\s*-$/i.test(clean(name)))) throw new Error('A named instructor is required for every instructor in the syllabus link.');
    if (!course || !section) throw new Error('Course and section are required.');
    const instructor = names.map(name => {
      const { last, given } = nameParts(name);
      return `${clean(last).toUpperCase()}_${clean(given)[0].toUpperCase()}`;
    }).join('_');
    const filename = `CS-${department.toUpperCase()}-${ascii(course).replace(/\s+/g, '')}-${instructor}-${clean(section)}-${year}-${semester}.pdf`;
    return `https://aisis.ateneo.edu/syllabi/${year}/${semester}/${encodeURIComponent(filename)}`;
  }
  function readRow(row, indices = { course: 0, section: 1, title: 2, professor: 6 }) {
    const cells = [...row.cells];
    const get = key => clean(cells[indices[key]]?.textContent);
    const course = get('course');
    if (!/^[A-Z][A-Z &/-]*\s*\d[\w. /-]*$/i.test(course) || !get('section')) return null;
    const cell = cells[indices.professor];
    const holder = cell?.cloneNode(true);
    holder?.querySelectorAll('br').forEach(br => br.replaceWith('\n'));
    // A line break can wrap a single name or separate instructors. Comma pairs
    // are reliable in both saved AISIS layouts, including comma-only teams.
    let nameText = holder?.textContent || '';
    if (cell?.querySelector('br')) {
      const fragments = nameText.split('\n').map(clean).filter(Boolean);
      if (fragments.every(s => s.includes(','))) nameText = fragments.join(';');
    }
    const professors = parseInstructors(nameText);
    return { course, section: get('section'), title: get('title'), professors };
  }
  // Decode only JSON/string data from React Flight; never execute remote JavaScript.
  function flightRecords(source) {
    if (source.includes('self.__next_f.push(')) {
      const chunks = [];
      for (const match of source.matchAll(/self\.__next_f\.push\((\[.*?\])\)<\/script>/gs)) {
        try { const part = JSON.parse(match[1]); if (part[0] === 1 && typeof part[1] === 'string') chunks.push(part[1]); } catch {}
      }
      source = chunks.join('');
    }
    const bytes = new TextEncoder().encode(source), decoder = new TextDecoder();
    const records = new Map();
    let pos = 0;
    while (pos < bytes.length) {
      let colon = pos;
      while (colon < bytes.length && bytes[colon] !== 58 && bytes[colon] !== 10) colon++;
      const id = decoder.decode(bytes.subarray(pos, colon));
      if (bytes[colon] !== 58 || !/^[a-f\d]+$/i.test(id)) {
        while (pos < bytes.length && bytes[pos++] !== 10) {} continue;
      }
      pos = colon + 1;
      if (bytes[pos] === 84) {
        let comma = pos + 1;
        while (comma < bytes.length && bytes[comma] !== 44 && comma - pos < 12) comma++;
        const length = parseInt(decoder.decode(bytes.subarray(pos + 1, comma)), 16);
        if (bytes[comma] === 44 && Number.isFinite(length)) {
          records.set(id, decoder.decode(bytes.subarray(comma + 1, comma + 1 + length)));
          pos = comma + 1 + length; continue;
        }
      }
      let end = pos;
      while (end < bytes.length && bytes[end] !== 10) end++;
      try { records.set(id, JSON.parse(decoder.decode(bytes.subarray(pos, end)))); } catch {}
      pos = end + 1;
    }
    return records;
  }
  function parseProfessor(source, expectedName) {
    const records = flightRecords(source), objects = [];
    function walk(value) {
      if (!value || typeof value !== 'object') return;
      if (!Array.isArray(value)) objects.push(value);
      for (const item of Object.values(value)) walk(item);
    }
    for (const value of records.values()) walk(value);
    const profile = objects.find(o => typeof o.display_name === 'string' && typeof o.slug === 'string' && nameKey(o.display_name) === nameKey(expectedName));
    if (!profile) throw new Error('No verified matching professor profile was found. Try the name search below.');
    const stats = objects.find(o => o.professor_id === profile.id && 'score' in o && 'student_count' in o) || null;
    const courseMap = new Map(objects.filter(o => o.id && o.course_code).map(o => [o.id, o.course_code]));
    const comments = new Map();
    const resolve = value => typeof value === 'string' && /^\$[a-f\d]+$/i.test(value) ? (records.get(value.slice(1)) ?? '[Review text unavailable; open Profs to Pick.]') : value;
    for (const o of objects) {
      if (o.professor_id !== profile.id || !('body' in o) || !o.id || o.parent_comment_id) continue;
      comments.set(o.id, { id: o.id, course: o.course_code_raw || courseMap.get(o.course_id) || '', title: resolve(o.title) || '', body: resolve(o.body) || '', rating: o.rating, sentiment: o.sentiment, clarity: o.clarity, grading_fairness: o.grading_fairness, helpfulness: o.helpfulness, workload: o.workload, would_retake: o.would_retake, date: o.published_at || o.created_at || '' });
    }
    if (!stats && !objects.some(o => Array.isArray(o.comment))) throw new Error('The ratings page format has changed. Open Profs to Pick to view this profile.');
    return { name: profile.display_name, slug: profile.slug, stats, reviews: [...comments.values()] };
  }
  function prioritize(data, course) {
    const matching = data.reviews.filter(r => r.course && courseKey(r.course) === courseKey(course));
    const other = data.reviews.filter(r => !matching.includes(r));
    const numeric = matching.filter(r => typeof r.rating === 'number' && r.rating >= 1 && r.rating <= 5);
    return { matching, other, courseScore: numeric.length ? numeric.reduce((sum, r) => sum + r.rating, 0) / numeric.length : null, courseRatingCount: numeric.length };
  }
  const api = { clean, courseKey, nameKey, professorSlugs, syllabusUrl, isNamedInstructor, departmentFor, parseInstructors, readRow, flightRecords, parseProfessor, prioritize };
  root.AisisCore = api;
  if (typeof module !== 'undefined') module.exports = api;
})(globalThis);
