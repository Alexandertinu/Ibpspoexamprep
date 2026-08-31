import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeImportedBank, starterBank } from '../src/questions.js';

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
