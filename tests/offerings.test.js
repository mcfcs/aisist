const { test } = require('node:test');
const assert = require('node:assert/strict');
globalThis.AisisPlan = require('../lib/plan');
const O = require('../lib/offerings');

const CATALOG = {
  DISCS: [{ course: 'CSCI 61', section: 'A', time: 'M-TH 0800-0930' }, { course: 'ISCS 30.18', section: 'D', time: 'F 1300-1400' }],
  SOCSCI: [{ course: 'STS 10', section: 'A', time: 'W 1300-1600' }],
  PH: [{ course: 'DLQ 10', section: 'A', time: 'M-TH 1400-1530' }],
  BIO: [{ course: 'BIO 11', section: 'A', time: 'T-F 0800-0930' }]
};
const DEPARTMENTS = ['BIO', 'CH', 'DISCS', 'EN', 'PH', 'PS', 'SOCSCI', 'TH'];
const NEEDED = [{ code: 'CSCI 61' }, { code: 'ISCS 30.XX' }, { code: 'STS 10' }, { code: 'DLQ 10' }];
const collector = (options = {}) => {
  const requested = [];
  const instance = O.createCollector({
    load: async (term, code) => { requested.push(code); if (options.fail?.(code)) throw new Error('signed out'); return CATALOG[code] || []; },
    departmentFor: course => (/^(CSCI|ISCS|MSYS)/i.test(course) ? 'DISCS' : ''),
    ...options
  });
  return { instance, requested };
};

test('the department a needed course belongs to is read before the rest', () => {
  assert.deepEqual(O.orderDepartments([{ code: 'CSCI 61' }], DEPARTMENTS, () => 'DISCS'), ['DISCS', 'BIO', 'CH', 'EN', 'PH', 'PS', 'SOCSCI', 'TH']);
  assert.deepEqual(O.orderDepartments([{ code: 'X 1' }], ['BIO', 'CH'], () => 'NOT LISTED'), ['BIO', 'CH']);
});
test('a sweep reads departments until every needed course is found', async () => {
  const { instance, requested } = collector();
  const result = await instance.collect({ term: '2026-2', departments: DEPARTMENTS, needed: NEEDED });
  assert.equal(result.status, 'complete');
  assert.deepEqual(result.missing, []);
  assert.equal(requested[0], 'DISCS');
  assert.equal(result.sections.length, 5);
});
test('a sweep stops early once nothing is left to find', async () => {
  const { instance, requested } = collector();
  const result = await instance.collect({ term: '2026-2', departments: DEPARTMENTS, needed: [{ code: 'CSCI 61' }] });
  assert.equal(result.status, 'complete');
  // DISCS answers the only needed course, so the other departments are skipped.
  assert.ok(requested.length <= 2, requested.join(','));
});
test('courses with no section this term are reported rather than retried forever', async () => {
  const { instance } = collector();
  const result = await instance.collect({ term: '2026-2', departments: DEPARTMENTS, needed: [...NEEDED, { code: 'ZZZ 99' }] });
  assert.equal(result.status, 'partial');
  assert.deepEqual(result.missing, ['ZZZ 99']);
});
test('a signed-out session stops the sweep instead of hammering AISIS', async () => {
  const { instance, requested } = collector({ fail: () => true, concurrency: 1 });
  const result = await instance.collect({ term: '2026-2', departments: DEPARTMENTS, needed: NEEDED });
  assert.equal(result.status, 'failed');
  assert.equal(requested.length, 3);
});
test('sections already saved count as found and progress is reported', async () => {
  const { instance, requested } = collector();
  const updates = [];
  const result = await instance.collect({
    term: '2026-2', departments: DEPARTMENTS, needed: [{ code: 'STS 10' }],
    known: [{ course: 'STS 10', section: 'A', time: 'W 1300-1600' }],
    onProgress: progress => updates.push(progress)
  });
  assert.equal(result.status, 'complete');
  assert.equal(requested.length, 0);
  assert.equal(updates.at(-1).done, true);
  assert.deepEqual(updates.at(-1).missing, []);
});
