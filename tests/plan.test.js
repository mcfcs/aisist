const { test } = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');
const P = require('../lib/plan');

const section = (course, sectionCode, time, extra = {}) => ({ course, section: sectionCode, title: 'Sample course', units: 3, time, room: 'CTC 101', instructors: 'EXAMPLE, ALEXANDER E.', ...extra });

test('AISIS day patterns are pairs of days, not ranges, and Saturday keeps its own column', () => {
  assert.deepEqual(P.parseMeetings('M-TH 1530-1700(FULLY ONSITE)').meetings, [{ day: 'M', start: 930, end: 1020 }, { day: 'TH', start: 930, end: 1020 }]);
  assert.deepEqual(P.parseMeetings('T-F 0930-1100').meetings.map(m => m.day), ['T', 'F']);
  assert.deepEqual(P.parseMeetings('SAT 0800-1100').meetings.map(m => m.day), ['SAT']);
  assert.deepEqual(P.parseMeetings('S 0800-1100').meetings.map(m => m.day), ['SAT']);
  assert.deepEqual(P.parseMeetings('M-W-F 0800-0900').meetings.map(m => m.day), ['M', 'W', 'F']);
  assert.equal(P.parseMeetings('M-TH 1530-1700(FULLY ONSITE)').modality, 'FULLY ONSITE');
  assert.equal(P.parseMeetings('W 1000-1130(~)').modality, '');
});
test('sections without a usable meeting time stay in the draft as arranged', () => {
  for (const value of ['TBA(~)', 'TBA(FULLY ONSITE)', 'TUTORIAL 0000-0000(~)', '', 'ZZZ 9999-0000']) {
    const parsed = P.parseMeetings(value);
    assert.equal(parsed.arranged, true, value);
    assert.deepEqual(parsed.meetings, [], value);
  }
  assert.equal(P.meetingLabel({ time: 'TBA(~)' }), 'TBA / by arrangement');
  assert.equal(P.meetingLabel({ time: 'T-F 0930-1100' }), 'Tue, Fri 09:30–11:00');
});
test('conflicts report only the overlapping day and window, and touching classes do not clash', () => {
  const picks = [section('CSCI 61', 'A', 'M-TH 0800-0930'), section('CSCI 71', 'B', 'TH 0900-1030'), section('STS 10', 'C', 'M 0930-1100')];
  const found = P.conflicts(picks);
  assert.equal(found.length, 1);
  assert.equal(found[0].a.course, 'CSCI 61');
  assert.equal(found[0].b.course, 'CSCI 71');
  assert.equal(P.conflictLabel(found[0]), 'Thu 09:00–09:30');
  assert.equal(P.conflicts([section('A 1', 'A', 'TBA'), section('B 1', 'B', 'TBA')]).length, 0);
});
test('repeated courses and unit totals are reported for the draft', () => {
  const picks = [section('CSCI 61', 'A', 'M 0800-0930'), section('csci 61', 'B', 'W 0800-0930', { units: '1' })];
  assert.deepEqual(P.duplicates(picks).map(entry => entry.sections), [['A', 'B']]);
  assert.equal(P.totalUnits(picks), 4);
  assert.equal(P.totalUnits([section('X 1', 'A', 'TBA', { units: '' })]), 0);
});
test('free slots and restricted remarks raise warnings without blocking the pick', () => {
  const levels = value => P.sectionWarnings(section('CSCI 61', 'A', 'M 0800-0930', value)).map(warning => warning.level);
  assert.deepEqual(levels({ freeSlots: '-2' }), ['high']);
  assert.deepEqual(levels({ freeSlots: '0' }), ['high']);
  assert.deepEqual(levels({ freeSlots: '2' }), ['low']);
  assert.deepEqual(levels({ freeSlots: '9' }), []);
  assert.deepEqual(levels({ freeSlots: '9', remarks: 'ALL SLOTS FOR BS CS MAJORS.' }), ['low']);
  assert.deepEqual(P.sectionWarnings(section('CSCI 61', 'A', 'TBA(~)', { freeSlots: '9' })).map(w => w.text), ['Meeting time is TBA or by arrangement.']);
});
test('the Individual Program of Study yields remaining courses with their year and semester', () => {
  const markup = `<table>
    <tr><td>Total Units</td><td>Units Taken</td><td>Remaining Units</td></tr><tr><td>188</td><td>150</td><td>38</td></tr>
    <tr><td>Fourth Year</td></tr><tr><td>Second Semester</td></tr>
    <tr><td><a title="PASSED">P</a></td><td>CSCI 197</td><td>3</td><td><a title="MAJOR">M</a></td><td>Y</td><td>N</td></tr>
    <tr><td><a title="CURRENTLY TAKING">C</a></td><td>CSCI 60</td><td>3</td><td><a title="MAJOR">M</a></td><td>Y</td><td>N</td></tr>
    <tr><td><a title="NOT YET TAKEN">N</a></td><td>CSCI 61</td><td>3</td><td><a title="MAJOR">M</a></td><td>Y</td><td>N</td></tr>
    <tr><td><a title="NOT YET TAKEN">N</a></td><td>ISCS 30.XX</td><td>1</td><td><a title="REQUIRED MODULE 5">RM5</a></td><td>Y</td><td>N</td></tr>
    <tr><td>Units Taken:&nbsp; 20.00</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>
  </table>`;
  const data = P.parseIps(new JSDOM(markup).window.document);
  assert.deepEqual(data.totals, { total: 188, taken: 150, remaining: 38 });
  assert.equal(data.courses.length, 4);
  const remaining = P.remainingCourses(data);
  assert.deepEqual(remaining.map(course => course.code), ['CSCI 61', 'ISCS 30.XX']);
  assert.equal(remaining[0].year, 'Fourth Year');
  assert.equal(P.programTag(remaining[0]), '4th Yr · 2nd Sem');
  assert.equal(data.courses[1].statusLabel, 'CURRENTLY TAKING');
});
test('program placeholders match any course under the same prefix, and other courses do not match', () => {
  const remaining = [{ code: 'ISCS 30.XX' }, { code: 'CSCI 61' }];
  assert.equal(P.matchRemaining('ISCS 30.18', remaining).course.code, 'ISCS 30.XX');
  assert.equal(P.matchRemaining('ISCS 30.18', remaining).exact, false);
  assert.equal(P.matchRemaining('csci  61', remaining).exact, true);
  assert.equal(P.matchRemaining('CSCI 610', remaining), null);
  assert.equal(P.matchRemaining('ISCS 31.18', remaining), null);
  assert.equal(P.matchRemaining('MSYS 116', remaining), null);
});
test('drafts sort by first meeting and export as text with conflicts named', () => {
  const draft = { name: 'Plan A', picks: [section('STS 10', 'C', 'F 1300-1430'), section('CSCI 61', 'A', 'M-TH 0800-0930'), section('CSCI 71', 'B', 'TH 0900-1030')] };
  assert.deepEqual(P.sortPicks(draft.picks).map(pick => pick.course), ['CSCI 61', 'CSCI 71', 'STS 10']);
  const text = P.exportText(draft, '2026-2');
  assert.match(text, /^Plan A — Second Semester, SY 2026-2027$/m);
  assert.match(text, /3 courses, 9 units/);
  assert.match(text, /1 time conflict: CSCI 61 vs CSCI 71/);
  assert.match(text, /CSCI 61\tA\tSample course\t3 units\tMon, Thu 08:00–09:30\tCTC 101/);
});
test('the weekly grid keeps Monday to Friday and adds Saturday only when it is used', () => {
  assert.deepEqual(P.usedDays([section('A 1', 'A', 'M 0800-0930')]), ['M', 'T', 'W', 'TH', 'F']);
  assert.deepEqual(P.usedDays([section('A 1', 'A', 'SAT 0800-0930')]), ['M', 'T', 'W', 'TH', 'F', 'SAT']);
  assert.deepEqual(P.gridBounds([section('A 1', 'A', 'M 0800-0930')]), { start: 420, end: 1140 });
  assert.deepEqual(P.gridBounds([section('A 1', 'A', 'M 0600-2030')]), { start: 360, end: 1260 });
});

const ips = courses => ({ courses: courses.map(([status, code, units, semester, year]) => ({ status, code, units, semester, year: year || 'Fourth Year', categoryLabel: 'MAJOR' })) });
test('the semester chosen in AISIS decides which remaining courses are due', () => {
  const data = ips([['N', 'CSCI 61', 3, 'Second Semester'], ['N', 'STS 10', 3, 'First Semester'], ['N', 'CSCI 199.3', 3, 'Second Semester'], ['P', 'CSCI 60', 3, 'First Semester']]);
  const remaining = P.remainingCourses(data);
  assert.equal(P.termSemester('2026-2'), '2');
  assert.equal(P.courseSemester({ semester: 'Second Semester' }), '2');
  assert.equal(P.courseSemester({ semester: 'Intersession' }), '0');
  const second = P.groupRemaining(remaining, '2026-2');
  assert.deepEqual(second.due.map(course => course.code), ['CSCI 61', 'CSCI 199.3']);
  assert.deepEqual(second.other.map(course => course.code), ['STS 10']);
  const first = P.groupRemaining(remaining, '2026-1');
  assert.deepEqual(first.due.map(course => course.code), ['STS 10']);
  assert.deepEqual(P.groupRemaining(remaining, '').due, []);
});
test('offered sections are ranked by whether they can be timetabled and still have room', () => {
  const sections = [
    section('CSCI 61', 'THES', 'TBA(~)', { freeSlots: '5' }),
    section('CSCI 61', 'K', 'T-F 0930-1100', { freeSlots: '0' }),
    section('CSCI 61', 'YZW', 'W 1800-2100', { freeSlots: '4' }),
    section('MSYS 116', 'A', 'M 0800-0930', { freeSlots: '9' })
  ];
  const ranked = P.offeringsFor({ code: 'CSCI 61' }, sections);
  assert.deepEqual(ranked.map(entry => entry.section), ['YZW', 'K', 'THES']);
  assert.equal(P.offeringsFor({ code: 'ISCS 30.XX' }, [section('ISCS 30.18', 'A', 'F 1300-1400')]).length, 1);
});
test('courses that can be timetabled are suggested before ones that are all by arrangement', () => {
  const data = ips([['N', 'CSCI 199.3', 3, 'Second Semester'], ['N', 'CSCI 61', 3, 'Second Semester'], ['N', 'DLQ 10', 3, 'Second Semester']]);
  const sections = [section('CSCI 199.3', 'THES1', 'TBA(~)'), section('CSCI 61', 'A', 'M-TH 0800-0930')];
  const result = P.suggestions(P.remainingCourses(data), sections, '2026-2');
  assert.deepEqual(result.due.map(entry => entry.course.code), ['CSCI 61', 'CSCI 199.3', 'DLQ 10']);
  assert.equal(result.due[0].offerings.length, 1);
  assert.equal(result.due[2].offerings.length, 0);
});
