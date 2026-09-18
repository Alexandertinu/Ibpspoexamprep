import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSubjectLibrary, inferTestLevel, subjectsForTest, testProgress } from '../src/practice-library.js';

const bank = [
  { id: 'r1', subject: 'Reasoning Ability', topic: 'Puzzle', type: 'mcq' },
  { id: 'q1', subject: 'Quantitative Aptitude', topic: 'Ratio', type: 'mcq' },
  { id: 'e1', subject: 'English Language', topic: 'Essay', type: 'descriptive' },
  { id: 'c1', subject: 'Computer Awareness', topic: 'Basics', type: 'mcq' },
];
const tests = [
  { id: 'reasoning', title: 'SBI Clerk Prelims Reasoning', subjects: ['Reasoning Ability'], types: ['mcq'] },
  { id: 'quant', title: 'Quant Chapter Drill', questionIds: ['q1'], types: ['mcq'] },
  { id: 'essay', title: 'Descriptive Mains Practice', subjects: ['English Language'], types: ['descriptive'] },
  { id: 'mixed', title: 'Mixed Objective Mock', subjects: [], types: ['mcq'] },
];
const attempts = [{ id: 'a1', testId: 'reasoning', title: 'SBI Clerk Prelims Reasoning', completedAt: '2026-09-01', analytics: { accuracy: 80 } }];

test('test levels use explicit metadata first and sensible title fallback', () => {
  assert.equal(inferTestLevel({ title: 'Anything', level: 'practice' }), 'Practice');
  assert.equal(inferTestLevel(tests[0]), 'Prelims');
  assert.equal(inferTestLevel(tests[2]), 'Mains');
  assert.equal(inferTestLevel(tests[1]), 'Practice');
});

test('test subjects are derived from filters or fixed question IDs', () => {
  assert.deepEqual(subjectsForTest(tests[0], bank), ['Reasoning Ability']);
  assert.deepEqual(subjectsForTest(tests[1], bank), ['Quantitative Aptitude']);
  assert.deepEqual(subjectsForTest(tests[3], bank), ['Mixed Practice']);
});

test('test progress distinguishes completed and untouched tests', () => {
  assert.equal(testProgress(tests[0], attempts).solved, true);
  assert.equal(testProgress(tests[0], attempts).latest.id, 'a1');
  assert.equal(testProgress(tests[1], attempts).solved, false);
});

test('subject library groups tests and counts completion state', () => {
  const library = buildSubjectLibrary(tests, bank, attempts);
  const reasoning = library.find((entry) => entry.subject === 'Reasoning Ability');
  const quant = library.find((entry) => entry.subject === 'Quantitative Aptitude');
  assert.equal(reasoning.solvedCount, 1);
  assert.equal(reasoning.untouchedCount, 0);
  assert.equal(quant.tests[0].level, 'Practice');
  assert.ok(library.some((entry) => entry.subject === 'Mixed Practice'));
  const computer = library.find((entry) => entry.subject === 'Computer Awareness');
  assert.equal(computer.tests.length, 0);
  assert.equal(computer.questionCount, 1);
});
