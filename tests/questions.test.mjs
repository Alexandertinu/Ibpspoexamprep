import test from 'node:test';
import assert from 'node:assert/strict';
import { completeQuestionSets, migrateStoredBank, normalizeImportedBank, normalizeImportedTest, shuffleItems, shuffleQuestionSets, starterBank } from '../src/questions.js';

test('starter bank has unique valid ids and supports four subjects plus descriptive', () => {
  const ids = new Set();
  for (const question of starterBank) {
    assert.ok(question.id && !ids.has(question.id));
    ids.add(question.id);
    assert.ok(question.subject && question.section && question.question);
    if (question.type === 'descriptive') assert.equal(question.answer, null);
    else {
      assert.ok(question.options.length >= 2);
      assert.ok(Number.isInteger(question.answer) && question.answer < question.options.length);
    }
  }
  assert.ok(new Set(starterBank.map((question) => question.subject)).size >= 4);
  assert.ok(starterBank.some((question) => question.type === 'descriptive'));
});

test('normalizer accepts arbitrary subjects and descriptive questions', () => {
  const [question] = normalizeImportedBank({ questions: [{ type: 'descriptive', subject: 'Computer Knowledge', section: 'Writing', topic: 'Cybersecurity', question: 'Explain phishing.', marks: 10, rubric: ['Accuracy'] }] });
  assert.equal(question.subject, 'Computer Knowledge');
  assert.equal(question.type, 'descriptive');
  assert.deepEqual(question.options, []);
  assert.equal(question.answer, null);
});

test('normalizer rejects objective questions with invalid keys', () => {
  assert.throws(() => normalizeImportedBank([{ question: 'Bad', options: ['A', 'B'], answer: 5 }]), /invalid zero-based answer/);
});

test('normalizer rejects blank MCQ keys and unsafe IDs while preserving zero values', () => {
  assert.throws(() => normalizeImportedBank([{ id: 'bad id', question: 'Bad ID', options: ['A', 'B'], answer: 0 }]), /Question ID/);
  assert.throws(() => normalizeImportedBank([{ question: 'No key', options: ['A', 'B'], answer: null }]), /invalid zero-based answer/);
  const [question] = normalizeImportedBank([{ id: 'safe-id', question: 'Zero values', options: ['A', 'B'], answer: 0, marks: 0, negativeMarks: 0 }]);
  assert.equal(question.marks, 0);
  assert.equal(question.negativeMarks, 0);
});

test('normalizer preserves table data on questions', () => {
  const [question] = normalizeImportedBank([{ question: 'Read the table.', options: ['A', 'B'], answer: 0, table: { caption: 'Sales', headers: ['Region', 'Amount'], rows: [['North', '100'], ['South', '200']] } }]);
  assert.ok(question.table);
  assert.equal(question.table.caption, 'Sales');
  assert.deepEqual(question.table.headers, ['Region', 'Amount']);
  assert.deepEqual(question.table.rows, [['North', '100'], ['South', '200']]);
});

test('normalizer preserves image data on questions', () => {
  const [question] = normalizeImportedBank([{ question: 'See the chart.', options: ['A', 'B'], answer: 1, image: { src: 'https://example.com/chart.png', alt: 'Revenue chart', caption: 'Q1 revenue' } }]);
  assert.ok(question.image);
  assert.equal(question.image.src, 'https://example.com/chart.png');
  assert.equal(question.image.caption, 'Q1 revenue');
});

test('normalizer drops invalid table and image data silently', () => {
  const [question] = normalizeImportedBank([{ question: 'Plain question.', options: ['A', 'B'], answer: 0, table: { headers: [], rows: [] }, image: { src: '' } }]);
  assert.equal(question.table, undefined);
  assert.equal(question.image, undefined);
});

test('normalizeImportedTest creates a runnable test from JSON', () => {
  const result = normalizeImportedTest({ title: 'Quant Mock', durationMinutes: 15, questions: [{ question: 'Q1?', options: ['A', 'B'], answer: 0 }, { question: 'Q2?', options: ['C', 'D'], answer: 1 }] });
  assert.equal(result.title, 'Quant Mock');
  assert.equal(result.durationMinutes, 15);
  assert.equal(result.questions.length, 2);
  assert.equal(result.questions[0].type, 'mcq');
});

test('normalizeImportedTest accepts a test wrapper object', () => {
  const result = normalizeImportedTest({ test: { title: 'Wrapped Mock', questions: [{ question: 'Q1?', options: ['A', 'B'], answer: 0 }] } });
  assert.equal(result.title, 'Wrapped Mock');
});

test('normalizeImportedTest rejects empty payloads', () => {
  assert.throws(() => normalizeImportedTest({}), /title/);
  assert.throws(() => normalizeImportedTest({ title: 'Empty', questions: [] }), /no valid questions/);
});

test('normalizeImportedTest auto-computes duration when omitted', () => {
  const result = normalizeImportedTest({ title: 'Auto Duration', questions: [{ question: 'Q1?', options: ['A', 'B'], answer: 0 }] });
  assert.ok(result.durationMinutes >= 1);
});

test('normalizeImportedTest respects shuffle flag', () => {
  const result = normalizeImportedTest({ title: 'No Shuffle', shuffle: false, questions: [{ question: 'Q1?', options: ['A', 'B'], answer: 0 }] });
  assert.equal(result.shuffle, false);
});

test('normalizeImportedTest accepts course format with letter-keyed options and sections', () => {
  const payload = {
    course_title: 'IBPS PO Prelims 2026 Quantitative Aptitude Bundle PDF Course',
    day: 17,
    total_questions: 3,
    sections: [
      {
        section_name: 'Data Interpretation',
        question_range: '1-2',
        context: {
          description: 'Study the table.',
          table: [{ region: 'North', sales: '100' }, { region: 'South', sales: '200' }],
          notes: ['All values in thousands.'],
        },
      },
      { section_name: 'Simplification', question_range: '3-3' },
    ],
    questions: [
      { question_number: 1, type: 'Data Interpretation', question: 'What is total sales?', options: { A: '200', B: '300', C: '400' }, correct_answer: 'B', explanation: 'Add them.' },
      { question_number: 2, type: 'Data Interpretation', question: 'What is North sales?', options: { a: '50', b: '100', c: '150' }, correct_answer: 'b', explanation: 'From table.' },
      { question_number: 3, type: 'Simplification', question: '2+2=?', options: { a: '3', b: '4', c: '5' }, correct_answer: 'b', explanation: 'Math.' },
    ],
  };
  const result = normalizeImportedTest(payload);
  assert.equal(result.title, 'IBPS PO Prelims 2026 Quantitative Aptitude — Day 17');
  assert.equal(result.questions.length, 3);
  // Course topic groups provide context but remain one exam section.
  assert.equal(result.questions[0].subject, 'Quantitative Aptitude');
  assert.equal(result.questions[0].section, 'Quantitative Aptitude');
  assert.equal(result.questions[0].topic, 'Data Interpretation');
  assert.ok(result.questions[0].passage.includes('Study the table'));
  assert.ok(result.questions[0].passage.includes('All values in thousands'));
  assert.ok(result.questions[0].table);
  assert.deepEqual(result.questions[0].table.headers, ['region', 'sales']);
  assert.equal(result.questions[0].table.rows.length, 2);
  // Q1 answer: 'b' → index 1 → '300'
  assert.equal(result.questions[0].answer, 1);
  assert.equal(result.questions[0].options[1], '300');
  // Q3 should have no context
  assert.equal(result.questions[2].passage, '');
  assert.equal(result.questions[2].table, undefined);
  assert.equal(result.questions[2].section, 'Quantitative Aptitude');
  assert.equal(result.questions[2].topic, 'Simplification');
});

test('migrateStoredBank flattens previously imported course subsections', () => {
  const [question] = migrateStoredBank([{ id: 'IBP-D17-Q001', subject: 'IBPS PO Prelims 2026 Quantitative Aptitude', section: 'Data Interpretation - Coaching Centers', topic: 'Data Interpretation', source: 'IBPS PO Prelims 2026 Quantitative Aptitude Bundle PDF Course' }]);
  assert.equal(question.subject, 'Quantitative Aptitude');
  assert.equal(question.section, 'Quantitative Aptitude');
  assert.equal(question.topic, 'Data Interpretation');
});

test('shuffleItems randomizes enabled tests and preserves explicit no-shuffle order', () => {
  const input = [1, 2, 3, 4];
  assert.deepEqual(shuffleItems(input, false, () => 0), input);
  assert.deepEqual(shuffleItems(input, true, () => 0), [2, 3, 4, 1]);
  assert.deepEqual(input, [1, 2, 3, 4]);
});

test('shuffleQuestionSets keeps shared DI or puzzle questions together', () => {
  const input = [
    { id: 'a1', setId: 'set-a' }, { id: 'a2', setId: 'set-a' },
    { id: 'single' },
    { id: 'b1', setId: 'set-b' }, { id: 'b2', setId: 'set-b' },
  ];
  const shuffled = shuffleQuestionSets(input, true, () => 0);
  const ids = shuffled.map((item) => item.id);
  assert.equal(Math.abs(ids.indexOf('a1') - ids.indexOf('a2')), 1);
  assert.equal(Math.abs(ids.indexOf('b1') - ids.indexOf('b2')), 1);
  assert.ok(ids.indexOf('a1') < ids.indexOf('a2'));
  assert.ok(ids.indexOf('b1') < ids.indexOf('b2'));
});

test('completeQuestionSets expands a partial selection to the whole DI or puzzle set', () => {
  const source = [{ id: 's1', setId: 'set-1' }, { id: 's2', setId: 'set-1' }, { id: 's3', setId: 'set-1' }, { id: 'single' }];
  assert.deepEqual(completeQuestionSets(source.slice(0, 2), source).map((item) => item.id), ['s1', 's2', 's3']);
  assert.deepEqual(completeQuestionSets([source[3]], source).map((item) => item.id), ['single']);
});

test('normalizer preserves explicit set IDs and infers repeated shared contexts', () => {
  const questions = normalizeImportedBank({ questions: [
    { id: 'q1', question: 'First?', options: ['A', 'B'], answer: 0, subject: 'Reasoning Ability', topic: 'Puzzle', passage: 'Shared clues' },
    { id: 'q2', question: 'Second?', options: ['A', 'B'], answer: 1, subject: 'Reasoning Ability', topic: 'Puzzle', passage: 'Shared clues' },
    { id: 'q3', question: 'Third?', options: ['A', 'B'], answer: 0, setId: 'manual-set' },
  ] });
  assert.ok(questions[0].setId);
  assert.equal(questions[0].setId, questions[1].setId);
  assert.equal(questions[2].setId, 'manual-set');
});

test('course format rejects an answer key that does not match an option', () => {
  assert.throws(() => normalizeImportedTest({ course_title: 'Quantitative Aptitude Course', day: 1, sections: [], questions: [{ question_number: 1, type: 'Arithmetic', question: 'Bad key?', options: { A: '1', B: '2' }, correct_answer: 'C' }] }), /does not match its option keys/);
});

test('normalizeImportedTest rejects course format with no questions', () => {
  assert.throws(() => normalizeImportedTest({ course_title: 'Test', day: 1, sections: [], questions: [] }), /course format|no valid questions/);
});
