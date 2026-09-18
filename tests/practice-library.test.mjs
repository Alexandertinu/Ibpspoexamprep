import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSubjectLibrary, inferTestLevel, questionsForTest, subjectsForTest, testProgress } from '../src/practice-library.js';

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

test('same-title tests use attempt IDs rather than sharing completion state', () => {
  const first = { id: 'first', title: 'My Practice', subjects: ['Computer Awareness'] };
  const second = { id: 'second', title: 'My Practice', subjects: ['Computer Awareness'] };
  const history = [
    { id: 'genuine', testId: 'first', title: first.title, completedAt: '2026-09-01', analytics: { accuracy: 65 } },
    { id: 'preview', testId: 'second', title: second.title, isTestRun: true, completedAt: '2026-09-02' },
  ];
  assert.equal(testProgress(first, history).attempts, 1);
  assert.equal(testProgress(second, history).solved, false);
  const subject = buildSubjectLibrary([first, second], bank, history).find((entry) => entry.subject === 'Computer Awareness');
  assert.equal(subject.solvedCount, 1);
  assert.equal(subject.untouchedCount, 1);
  assert.equal(testProgress({ ...first, title: 'Renamed Practice' }, history).solved, true);
});

test('legacy title-only attempts count only when the test catalog makes the title unambiguous', () => {
  const first = { id: 'first', title: 'Legacy Mock' };
  const second = { id: 'second', title: 'Legacy Mock' };
  const history = [{ title: 'Legacy Mock', completedAt: '2026-09-01' }];
  assert.equal(testProgress(first, history).solved, false);
  assert.equal(testProgress(first, history, [first]).solved, true);
  assert.equal(testProgress(first, history, [first, second]).solved, false);
  assert.equal(testProgress(second, history, [first, second]).solved, false);
  assert.equal(testProgress({}, [{}]).solved, false);
  assert.equal(testProgress({ title: 'Other Mock' }, history).solved, false);
  const identifiedHistory = [{ testId: 'deleted-test', title: 'Legacy Mock' }];
  assert.equal(testProgress(first, identifiedHistory, [first]).solved, false);
});

test('subject library includes arbitrary empty catalog subjects for their first import', () => {
  const library = buildSubjectLibrary([], [], [], ['Cell Biology', 'English Language and Literature', 'Cell Biology', ' ']);
  assert.deepEqual(library.map((entry) => entry.subject), ['Cell Biology', 'English Language and Literature']);
  assert.ok(library.every((entry) => entry.questionCount === 0 && entry.tests.length === 0 && entry.solvedCount === 0));
});

test('fixed question lists preserve selection order and never expand an empty list to the whole bank', () => {
  assert.deepEqual(questionsForTest({ questionIds: ['c1', 'r1', 'missing', 'c1'] }, bank).map((question) => question.id), ['c1', 'r1']);
  assert.deepEqual(questionsForTest({ questionIds: [] }, bank), []);
  assert.deepEqual(questionsForTest({ questionIds: ['missing'] }, bank), []);
  assert.deepEqual(questionsForTest({ subjects: ['Computer Awareness'] }, bank).map((question) => question.id), ['c1']);
});
