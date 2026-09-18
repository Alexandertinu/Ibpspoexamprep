import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRandomMockConfig, buildSelectedMockConfig, matchingMockQuestions } from '../src/mock-builder.js';

const bank = [
  { id: 'q1', type: 'mcq', subject: 'Quantitative Aptitude', topic: 'Ratio', question: 'Ratio question 1' },
  { id: 'q2', type: 'mcq', subject: 'Quantitative Aptitude', topic: 'Ratio', question: 'Ratio question 2' },
  { id: 'q3', type: 'mcq', subject: 'Quantitative Aptitude', topic: 'Data Interpretation', question: 'Read the table' },
  { id: 'q4', type: 'descriptive', subject: 'English Language', topic: 'Essay', question: 'Write an essay' },
];

test('matchingMockQuestions filters by subject, chapters, type and search text', () => {
  assert.deepEqual(matchingMockQuestions(bank, { subject: 'Quantitative Aptitude', topics: ['Ratio'], type: 'mcq' }).map((q) => q.id), ['q1', 'q2']);
  assert.deepEqual(matchingMockQuestions(bank, { subject: 'Quantitative Aptitude', type: 'mcq', query: 'table' }).map((q) => q.id), ['q3']);
});

test('random chapter mode validates inputs and creates a random-selection config', () => {
  const config = buildRandomMockConfig({ title: 'Ratio Drill', subject: 'Quantitative Aptitude', topics: ['Ratio'], type: 'mcq', count: 2, durationMinutes: 15, level: 'Prelims', shuffle: true }, bank);
  assert.equal(config.selectionStrategy, 'random');
  assert.equal(config.count, 2);
  assert.equal(config.durationMinutes, 15);
  assert.equal(config.level, 'Prelims');
  assert.deepEqual(config.topics, ['Ratio']);
  assert.throws(() => buildRandomMockConfig({ title: 'Bad', subject: 'Quantitative Aptitude', topics: ['Ratio'], count: 3, durationMinutes: 10 }, bank), /Question count/);
});

test('manual mode keeps only existing unique question IDs and the chosen duration', () => {
  const config = buildSelectedMockConfig({ title: 'My Questions', questionIds: ['q3', 'q1', 'q3', 'missing'], durationMinutes: 12, shuffle: false }, bank);
  assert.deepEqual(config.questionIds, ['q3', 'q1']);
  assert.equal(config.durationMinutes, 12);
  assert.equal(config.shuffle, false);
  assert.equal(config.level, 'Practice');
  assert.throws(() => buildSelectedMockConfig({ title: 'Empty', questionIds: [], durationMinutes: 10 }, bank), /Select at least one/);
});

test('custom subjects remain selectable in random and exact-question mocks without a built-in subject whitelist', () => {
  const customBank = [
    { id: 'custom-a', subject: 'English Language and Literature', topic: 'Poetry', type: 'mcq', question: 'Identify the metre.' },
    { id: 'custom-b', subject: 'English Language and Literature', topic: 'Poetry', type: 'descriptive', question: 'Compare the poems.' },
    ...bank,
  ];
  const subject = 'English Language and Literature';
  const random = buildRandomMockConfig({ title: 'Literature Mock', subject, topics: ['Poetry'], type: 'both', count: 2, durationMinutes: 30 }, customBank);
  assert.deepEqual(random.subjects, [subject]);
  assert.deepEqual(random.types, ['mcq', 'descriptive']);
  assert.equal(random.count, 2);
  const selected = buildSelectedMockConfig({ title: 'Literature Selection', questionIds: ['custom-b', 'custom-a'], durationMinutes: 30, shuffle: false }, customBank);
  assert.deepEqual(selected.subjects, [subject]);
  assert.deepEqual(selected.questionIds, ['custom-b', 'custom-a']);
  assert.equal(selected.shuffle, false);
});
