(function (root) {
  'use strict';
  const clean = value => String(value ?? '').replace(/\s+/g, ' ').trim();
  const ascii = value => clean(value).normalize('NFD').replace(/[̀-ͯ]/g, '');
  const courseKey = value => ascii(value).toUpperCase().replace(/\s+/g, '');
  const DAYS = ['M', 'T', 'W', 'TH', 'F', 'SAT', 'SU'];
  const DAY_NAMES = { M: 'Mon', T: 'Tue', W: 'Wed', TH: 'Thu', F: 'Fri', SAT: 'Sat', SU: 'Sun' };
  // AISIS joins day codes with hyphens, so M-TH means Monday and Thursday
  // rather than a Monday-to-Thursday range. A lone S means Saturday.
  const DAY_CODES = { M: 'M', MON: 'M', T: 'T', TU: 'T', TUE: 'T', W: 'W', WED: 'W', TH: 'TH', THU: 'TH', H: 'TH', F: 'F', FRI: 'F', S: 'SAT', SA: 'SAT', SAT: 'SAT', SU: 'SU', SUN: 'SU' };
  const STATUS_NAMES = { P: 'Passed', C: 'Currently taking', N: 'Not yet taken', F: 'Failed', W: 'Withdrawn', D: 'Dropped', E: 'Exempted' };
  const TERM_NAMES = { 0: 'Intersession', 1: 'First Semester', 2: 'Second Semester' };

  function parseClock(value) {
    const match = /^(\d{1,2})(\d{2})$/.exec(clean(value));
    if (!match) return null;
    const hours = Number(match[1]), minutes = Number(match[2]);
    return hours > 23 || minutes > 59 ? null : hours * 60 + minutes;
  }
  function timeLabel(minutes) {
    return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
  }
  // AISIS Time cells read like "M-TH 1530-1700(FULLY ONSITE)", "SAT 0800-1100",
  // "TBA(~)" or "TUTORIAL 0000-0000". Anything without a usable day and range is
  // kept as an arranged meeting rather than dropped from the draft.
  function parseMeetings(value) {
    const raw = clean(value);
    const modality = clean((/\(([^)]*)\)\s*$/.exec(raw)?.[1] || '').replace(/^~$/, ''));
    const meetings = [];
    let arranged = false;
    for (const part of raw.replace(/\([^)]*\)/g, ' ').split(/[;\n]|\s\/\s|\s,\s/).map(clean).filter(Boolean)) {
      const match = /^([A-Za-z]+(?:-[A-Za-z]+)*)\s*(\d{3,4})\s*-\s*(\d{3,4})$/.exec(part);
      const tokens = match ? match[1].toUpperCase().split('-') : [];
      const days = tokens.map(token => DAY_CODES[token]).filter(Boolean);
      const start = match ? parseClock(match[2]) : null;
      const end = match ? parseClock(match[3]) : null;
      if (!match || days.length !== tokens.length || start === null || end === null || end <= start) { arranged = true; continue; }
      for (const day of [...new Set(days)]) meetings.push({ day, start, end });
    }
    if (!meetings.length) arranged = true;
    return { meetings, modality, arranged, raw };
  }
  function meetingsOf(section) {
    return Array.isArray(section?.meetings) ? section.meetings : parseMeetings(section?.time).meetings;
  }
  function meetingLabel(section) {
    const { meetings, arranged } = parseMeetings(section?.time);
    if (!meetings.length) return arranged ? 'TBA / by arrangement' : '';
    const groups = new Map();
    for (const meeting of meetings) {
      const key = `${meeting.start}-${meeting.end}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(DAY_NAMES[meeting.day]);
    }
    return [...groups.entries()].map(([key, days]) => {
      const [start, end] = key.split('-').map(Number);
      return `${days.join(', ')} ${timeLabel(start)}–${timeLabel(end)}`;
    }).join('; ');
  }
  function sectionKey(section) {
    return `${courseKey(section?.course)}|${clean(section?.section).toUpperCase()}`;
  }
  function totalUnits(picks) {
    return Math.round((picks || []).reduce((sum, pick) => sum + (Number.parseFloat(pick.units) || 0), 0) * 100) / 100;
  }
  function conflicts(picks) {
    const list = [];
    for (let i = 0; i < picks.length; i++) {
      for (let j = i + 1; j < picks.length; j++) {
        const overlaps = [];
        for (const a of meetingsOf(picks[i])) {
          for (const b of meetingsOf(picks[j])) {
            if (a.day === b.day && a.start < b.end && b.start < a.end) {
              overlaps.push({ day: a.day, start: Math.max(a.start, b.start), end: Math.min(a.end, b.end) });
            }
          }
        }
        if (overlaps.length) list.push({ a: picks[i], b: picks[j], overlaps });
      }
    }
    return list;
  }
  function duplicates(picks) {
    const seen = new Map(), list = [];
    for (const pick of picks) {
      const key = courseKey(pick.course);
      if (seen.has(key)) list.push({ course: pick.course, sections: [seen.get(key).section, pick.section] });
      else seen.set(key, pick);
    }
    return list;
  }
  function conflictLabel(entry) {
    return entry.overlaps.map(o => `${DAY_NAMES[o.day]} ${timeLabel(o.start)}–${timeLabel(o.end)}`).join('; ');
  }
  function sectionWarnings(section) {
    const list = [];
    const free = Number.parseInt(section?.freeSlots, 10);
    if (Number.isFinite(free)) {
      if (free < 0) list.push({ level: 'high', text: `Over capacity. AISIS shows ${free} free slots.` });
      else if (free === 0) list.push({ level: 'high', text: 'No free slots left.' });
      else if (free <= 2) list.push({ level: 'low', text: `Only ${free} free slot${free === 1 ? '' : 's'} left.` });
    }
    if (/\bALL SLOTS FOR\b|\bSLOT\(S\) FOR\b|\bRESERVED\b/i.test(clean(section?.remarks))) {
      list.push({ level: 'low', text: 'Slots are restricted. Check the Remarks column before enlisting.' });
    }
    if (parseMeetings(section?.time).arranged) list.push({ level: 'low', text: 'Meeting time is TBA or by arrangement.' });
    return list;
  }
  function sortPicks(picks) {
    const rank = pick => {
      const meetings = meetingsOf(pick);
      if (!meetings.length) return [DAYS.length, 0];
      return meetings.map(m => [DAYS.indexOf(m.day), m.start]).sort((a, b) => a[0] - b[0] || a[1] - b[1])[0];
    };
    return [...picks].sort((a, b) => {
      const x = rank(a), y = rank(b);
      return x[0] - y[0] || x[1] - y[1] || courseKey(a.course).localeCompare(courseKey(b.course));
    });
  }
  function usedDays(picks) {
    const used = new Set(picks.flatMap(pick => meetingsOf(pick).map(m => m.day)));
    return DAYS.filter(day => ['M', 'T', 'W', 'TH', 'F'].includes(day) || used.has(day));
  }
  function gridBounds(picks) {
    const starts = picks.flatMap(pick => meetingsOf(pick).map(m => m.start));
    const ends = picks.flatMap(pick => meetingsOf(pick).map(m => m.end));
    return {
      start: Math.min(7 * 60, ...starts.map(value => Math.floor(value / 60) * 60)),
      end: Math.max(19 * 60, ...ends.map(value => Math.ceil(value / 60) * 60))
    };
  }
  function termLabel(term) {
    const match = /^(20\d{2})-([012])$/.exec(clean(term));
    return match ? `${TERM_NAMES[match[2]]}, SY ${match[1]}-${Number(match[1]) + 1}` : clean(term) || 'Unknown term';
  }
  function termSemester(term) { return /^20\d{2}-([012])$/.exec(clean(term))?.[1] ?? ''; }
  // The program of study files each course under a year and a semester. A term
  // selected in AISIS is planned against the courses filed for that semester.
  const SEMESTER_CODES = { FIRST: '1', SECOND: '2', INTERSESSION: '0', SUMMER: '0' };
  function courseSemester(course) { return SEMESTER_CODES[clean(course?.semester).split(/\s+/)[0]?.toUpperCase()] ?? ''; }
  function groupRemaining(remaining, term) {
    const semester = termSemester(term);
    if (!semester) return { due: [], other: [...remaining], semester };
    const due = remaining.filter(course => courseSemester(course) === semester);
    return { due, other: remaining.filter(course => !due.includes(course)), semester };
  }

  // Individual Program of Study (J_VIPS.do). Course rows are status, course
  // code, units, category, required and prerequisite override, grouped under a
  // year heading and a semester heading.
  function parseIps(doc) {
    const courses = [];
    let totals = null, year = '', semester = '';
    const rows = [...doc.querySelectorAll('tr')];
    for (let index = 0; index < rows.length; index++) {
      const cells = [...rows[index].cells];
      const text = cells.map(cell => clean(cell.textContent));
      if (cells.length === 1) {
        if (/^(first|second|third|fourth|fifth|sixth)\s+year$/i.test(text[0])) { year = text[0]; semester = ''; }
        else if (/^(first|second|third|fourth)\s+semester$|^intersession$|^summer$/i.test(text[0])) semester = text[0];
        continue;
      }
      if (text.length === 3 && /^total units$/i.test(text[0]) && /^units taken$/i.test(text[1])) {
        const values = [...(rows[index + 1]?.cells || [])].map(cell => clean(cell.textContent));
        if (values.length === 3 && values.every(value => /^\d+(\.\d+)?$/.test(value))) {
          totals = { total: Number(values[0]), taken: Number(values[1]), remaining: Number(values[2]) };
        }
        continue;
      }
      if (cells.length < 4 || !/^[A-Z]$/.test(text[0].toUpperCase()) || !/^[A-Z][A-Z &/.-]*\s*\d[\w.]*$/i.test(text[1])) continue;
      const status = text[0].toUpperCase();
      const units = Number.parseFloat(text[2]);
      courses.push({
        status,
        statusLabel: clean(cells[0].querySelector('[title]')?.getAttribute('title')) || STATUS_NAMES[status] || status,
        code: text[1],
        units: Number.isFinite(units) ? units : 0,
        category: text[3],
        categoryLabel: clean(cells[3].querySelector('[title]')?.getAttribute('title')) || text[3],
        year, semester
      });
    }
    return { totals, courses };
  }
  function remainingCourses(ips) {
    return (ips?.courses || []).filter(course => course.status === 'N');
  }
  // IPS placeholders such as ISCS 30.XX stand for any section-numbered course
  // under the same prefix, so they match by prefix rather than exactly.
  function isPlaceholder(code) { return /\.X+$/i.test(clean(code)); }
  function matchRemaining(course, list) {
    const key = courseKey(course);
    const exact = (list || []).find(entry => courseKey(entry.code) === key);
    if (exact) return { course: exact, exact: true };
    const prefixed = (list || []).find(entry => {
      if (!isPlaceholder(entry.code)) return false;
      const prefix = courseKey(entry.code).replace(/X+$/i, '');
      return key.length > prefix.length && key.startsWith(prefix);
    });
    return prefixed ? { course: prefixed, exact: false } : null;
  }
  const ORDINALS = { FIRST: '1st', SECOND: '2nd', THIRD: '3rd', FOURTH: '4th', FIFTH: '5th', SIXTH: '6th' };
  function programTag(course) {
    const short = (value, suffix) => {
      const word = clean(value).split(/\s+/)[0]?.toUpperCase() || '';
      if (!word) return '';
      return ORDINALS[word] ? `${ORDINALS[word]} ${suffix}` : clean(value);
    };
    return [short(course?.year, 'Yr'), short(course?.semester, 'Sem')].filter(Boolean).join(' · ');
  }

  function newDraft(name) {
    return { id: `d${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, name: clean(name) || 'Draft 1', picks: [], updated: Date.now() };
  }
  function emptyPlan() { const draft = newDraft('Draft 1'); return { drafts: [draft], activeId: draft.id }; }
  function activeDraft(plan) { return plan.drafts.find(draft => draft.id === plan.activeId) || plan.drafts[0]; }
  function exportText(draft, term) {
    const picks = sortPicks(draft.picks);
    const lines = [`${clean(draft.name)} — ${termLabel(term)}`, ''];
    for (const pick of picks) {
      lines.push([pick.course, pick.section, clean(pick.title), `${pick.units || 0} units`, meetingLabel(pick) || 'TBA', clean(pick.room) || 'TBA', clean(pick.instructors)].join('\t'));
    }
    lines.push('', `${picks.length} course${picks.length === 1 ? '' : 's'}, ${totalUnits(picks)} units`);
    const clashes = conflicts(picks);
    if (clashes.length) lines.push(`${clashes.length} time conflict${clashes.length === 1 ? '' : 's'}: ${clashes.map(entry => `${entry.a.course} vs ${entry.b.course}`).join(', ')}`);
    return lines.join('\n');
  }

  // Every section of a needed course that was found in the term's listings,
  // ordered so the pickable ones come first.
  // Sections that can actually be timetabled and still have room come first,
  // then full ones, then anything by arrangement.
  function offeringsFor(course, sections) {
    const rank = section => {
      const meetings = meetingsOf(section);
      const free = Number.parseInt(section.freeSlots, 10);
      return [
        meetings.length ? 0 : 1,
        Number.isFinite(free) && free <= 0 ? 1 : 0,
        meetings.length ? Math.min(...meetings.map(m => DAYS.indexOf(m.day))) : 9,
        meetings.length ? Math.min(...meetings.map(m => m.start)) : 0
      ];
    };
    return (sections || []).filter(section => matchRemaining(section.course, [course])).sort((a, b) => {
      const x = rank(a), y = rank(b);
      for (let index = 0; index < x.length; index++) if (x[index] !== y[index]) return x[index] - y[index];
      return courseKey(a.course).localeCompare(courseKey(b.course))
        || clean(a.section).localeCompare(clean(b.section), undefined, { numeric: true });
    });
  }
  // Courses that can actually be timetabled lead, so a thesis or practicum
  // with only arranged sections does not bury the rest of the program.
  function suggestions(remaining, sections, term) {
    const { due, other, semester } = groupRemaining(remaining, term);
    const entry = course => ({ course, offerings: offeringsFor(course, sections) });
    const rank = item => item.offerings.some(section => meetingsOf(section).length) ? 0 : item.offerings.length ? 1 : 2;
    const order = list => list.map(entry).sort((a, b) => rank(a) - rank(b));
    return { semester, due: order(due), other: order(other) };
  }

  const KEYS = {
    plan: term => `plan-v1:${term}`, sections: term => `sections-v1:${term}`,
    offerings: term => `offerings-v1:${term}`, ips: 'ips-v1'
  };
  const MAX_SECTIONS = 5000, MAX_TERMS = 3;
  // Every read falls back to an empty value so the planner still opens when
  // extension storage is unavailable.
  async function read(key, fallback) {
    try { return (await chrome.storage.local.get(key))[key] ?? fallback; } catch { return fallback; }
  }
  async function write(key, value) {
    try { await chrome.storage.local.set({ [key]: value }); return true; } catch { return false; }
  }
  const store = {
    async readPlan(term) {
      const stored = await read(KEYS.plan(term), null);
      if (!stored?.drafts?.length) return emptyPlan();
      return { drafts: stored.drafts, activeId: stored.drafts.some(draft => draft.id === stored.activeId) ? stored.activeId : stored.drafts[0].id };
    },
    writePlan(term, plan) { return write(KEYS.plan(term), plan); },
    readSections(term) { return read(KEYS.sections(term), []); },
    async mergeSections(term, sections) {
      if (!term || !sections.length) return [];
      const existing = await read(KEYS.sections(term), []);
      const merged = new Map(existing.map(section => [sectionKey(section), section]));
      for (const section of sections) merged.set(sectionKey(section), section);
      const list = [...merged.values()].slice(-MAX_SECTIONS);
      await write(KEYS.sections(term), list);
      return list;
    },
    readIps() { return read(KEYS.ips, null); },
    writeIps(data) { return write(KEYS.ips, data); },
    readOfferings(term) { return read(KEYS.offerings(term), null); },
    writeOfferings(term, record) { return write(KEYS.offerings(term), record); },
    async listTerms() {
      try {
        const stored = await chrome.storage.local.get(null);
        const terms = new Set();
        for (const key of Object.keys(stored)) {
          const match = /^(?:plan|sections)-v1:(.+)$/.exec(key);
          if (match) terms.add(match[1]);
        }
        return [...terms].sort().reverse();
      } catch { return []; }
    },
    // Keep storage bounded to recent terms. Saved drafts outlive their captured
    // sections, which can always be collected again from AISIS.
    async prune() {
      try {
        const stale = (await store.listTerms()).slice(MAX_TERMS);
        if (stale.length) await chrome.storage.local.remove(stale.map(term => KEYS.sections(term)));
      } catch { /* Planning still works without pruning. */ }
    }
  };

  const api = {
    DAYS, DAY_NAMES, STATUS_NAMES, KEYS,
    clean, courseKey, parseClock, timeLabel, parseMeetings, meetingsOf, meetingLabel, sectionKey,
    totalUnits, conflicts, duplicates, conflictLabel, sectionWarnings, sortPicks, usedDays, gridBounds,
    termLabel, termSemester, courseSemester, groupRemaining, offeringsFor, suggestions,
    parseIps, remainingCourses, isPlaceholder, matchRemaining, programTag,
    newDraft, emptyPlan, activeDraft, exportText, store
  };
  root.AisisPlan = api;
  if (typeof module !== 'undefined') module.exports = api;
})(globalThis);
