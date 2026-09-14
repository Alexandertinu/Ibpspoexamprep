import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeImportedBank, normalizeImportedTest, starterBank } from '../src/questions.js';

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
