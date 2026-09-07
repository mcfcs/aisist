const { test } = require('node:test');
const assert = require('node:assert/strict');
const C = require('../lib/core');
test('interdisciplinary subjects use their department codes and retain lowercase i in PDF filenames', () => {
  assert.equal(C.departmentFor('ARTS 180.08i', '**IE**'), 'FA');
  assert.equal(C.departmentFor('BIO 21i', '**IE**'), 'BIO');
  assert.equal(C.departmentFor('CHEM 184.1i', '**IE**'), 'CH');
  assert.equal(C.departmentFor('MSYS 116', '**IE**'), 'DISCS');
  assert.equal(C.departmentFor('ENE 13.05i', '**IE**'), 'EN');
  assert.equal(C.departmentFor('ENGG 183.01i', '**IE**'), 'ECE');
  assert.equal(C.departmentFor('UNKNOWN 123', '**IE**'), '');
  assert.match(C.syllabusUrl({year:2026, semester:1, department:'BIO', course:'BIO 21i', section:'M', professor:'MOCK, ROBERT ANDREW L.'}), /CS-BIO-BIO21i-MOCK_R-M-2026-1.pdf$/);
});
test('comma-separated teaching teams do not become one instructor', () => {
  assert.deepEqual(C.parseInstructors('MOCK, ROBERT ANDREW L., ILLUSTRATION, ADRIAN RAY N.'), ['MOCK, ROBERT ANDREW L.', 'ILLUSTRATION, ADRIAN RAY N.']);
  assert.deepEqual(C.parseInstructors('SPECIMEN, ARTHUR, JR.'), ['SPECIMEN, ARTHUR JR.']);
});

test('single-instructor syllabus filename is exact', () => {
  assert.equal(C.syllabusUrl({ year: 2025, semester: 2, department: 'DISCS', course: 'MSYS 116', professor: 'EXAMPLE, ALEXANDER E.', section: 'C' }), 'https://aisis.ateneo.edu/syllabi/2025/2/CS-DISCS-MSYS116-EXAMPLE_A-C-2025-2.pdf');
});
test('co-taught syllabus combines all instructors in AISIS order', () => {
  const row = { year:2026, semester:1, department:'DISCS', course:'CSCI 21', section:'K', professors:['DEMO, R.', 'TESTER, J.'] };
  assert.equal(C.syllabusUrl(row), 'https://aisis.ateneo.edu/syllabi/2026/1/CS-DISCS-CSCI21-DEMO_R_TESTER_J-K-2026-1.pdf');
  assert.match(C.syllabusUrl({...row, professors:undefined, professor:'FICTION, ARTHUR H., PLACEHOLDER, Riley Jordan', section:'N2'}), /CSCI21-FICTION_A_PLACEHOLDER_R-N2-2026-1.pdf$/);
  assert.match(C.syllabusUrl({...row, professors:[...row.professors].reverse()}), /TESTER_J_DEMO_R/);
  assert.match(C.syllabusUrl({...row, professors:['DEMO, R.', 'TBA, -']}), /DEMO_R_TBA_-/);
});
test('intersession, special sections and missing metadata', () => {
  const data = { year: 2026, semester: 0, department: 'DISCS', course: 'CSCI 199.2', professor: 'SAMPLE, JAMIE ROBIN T.', section: 'THES/DISS' };
  assert.match(C.syllabusUrl(data), /SAMPLE_J-THES%2FDISS-2026-0.pdf$/);
  assert.throws(() => C.syllabusUrl({ ...data, department: '**IE**' }));
  assert.throws(() => C.syllabusUrl({ ...data, professor: 'TBA' }));
  assert.match(C.syllabusUrl({ ...data, professor: 'TBA, -' }), /TBA_--/);
  assert.throws(() => C.syllabusUrl({ ...data, year: '' }));
});
test('normalizes names without mistaking a different first name', () => {
  assert.deepEqual(C.professorSlugs('EXAMPLE, ALEXANDER E.'), ['example-alexander']);
  assert.deepEqual(C.professorSlugs('SAMPLE, JAMIE ROBIN T.'), ['sample-jamie-robin', 'sample-jamie']);
  assert.equal(C.nameKey('EXAMPLE, ALEXANDER E.'), C.nameKey('Example, Alexander'));
  assert.notEqual(C.nameKey('Example, Alexandra'), C.nameKey('Example, Alexander'));
});
test('course-specific averages exclude unscored reviews and similar course codes', () => {
  const reviews = [{ course: 'MSYS116', rating: 4 }, { course: 'msys 116', rating: null }, { course: 'MSYS 116', rating: 2 }, { course: 'MSYS 116.1', rating: 5 }, { course: '', rating: 5 }];
  const result = C.prioritize({ reviews }, 'MSYS 116');
  assert.equal(result.courseScore, 3); assert.equal(result.courseRatingCount, 2);
  assert.equal(result.matching.length, 3); assert.equal(result.other.length, 2);
  assert.equal(C.prioritize({ reviews }, 'MSYS 20').courseScore, null);
});
test('Flight parser resolves byte-length text, filters other professors and rejects mismatched profiles', () => {
  const body = 'Long review\nwith café and 😊. <script>alert(1)</script>';
  const payload = { professor: { id: 485, slug: 'example-alexander', display_name: 'Example, Alexander E.' }, stat: { professor_id: 485, score: 3.6, student_count: 0 }, comment: [
    { id: 1, professor_id: 485, body: '$a', title: 'A review', course_id: 2, rating: 4 },
    { id: 2, professor_id: 999, body: 'Wrong professor', rating: 5 },
    { id: 3, professor_id: 485, parent_comment_id: 1, body: 'A reply' }
  ], course: { id: 2, course_code: 'MSYS 116' } };
  const flight = `a:T${Buffer.byteLength(body).toString(16)},${body}b:${JSON.stringify(payload)}\n`;
  const html = `<script>self.__next_f.push(${JSON.stringify([1, flight])})</script>`;
  for (const source of [flight, html]) {
    const data = C.parseProfessor(source, 'EXAMPLE, ALEXANDER E.');
    assert.equal(data.reviews.length, 1); assert.equal(data.reviews[0].body, body); assert.equal(data.reviews[0].course, 'MSYS 116');
  }
  assert.throws(() => C.parseProfessor(flight, 'EXAMPLE, ALEXANDRA'));
});

test('FACILE surname spaces, suffix positions and section punctuation are preserved', () => {
  const row = { year:2022, semester:1, department:'PS', course:'PHYS 23.01', section:'A(MEN)' };
  for (const [professor, part] of [['SAMPLE NAME, C.', 'SAMPLE%20NAME_C'], ['MOCK-NAME, Q.', 'MOCK-NAME_Q'], ['EXAMPLE, JR., QUINN', 'EXAMPLE%2C%20JR._Q'], ['SAMPLE II, F.', 'SAMPLE%20II_F'], ['MOCK, SJ, F.', 'MOCK%2C%20SJ_F'], ['FICTION, A. JR.', 'FICTION_A']]) {
    assert.ok(C.syllabusUrl({...row, professor}).includes(part + '-A(MEN)-'));
  }
  assert.deepEqual(C.parseInstructors('EXAMPLE, JR., QUINN, SAMPLE NAME, C.'), ['EXAMPLE, JR., QUINN', 'SAMPLE NAME, C.']);
});
