import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAnalytics, buildCoachPacket, scoreAttempt } from '../src/analytics.js';

const questions = [
  { id: '1', subject: 'Reasoning Ability', topic: 'Test', question: 'A', options: ['x', 'y'], answer: 0 },
  { id: '2', subject: 'Quantitative Aptitude', topic: 'Test', question: 'B', options: ['x', 'y'], answer: 1 },
  { id: '3', subject: 'Quantitative Aptitude', topic: 'Other', question: 'C', options: ['x', 'y'], answer: 0 },
];

test('scoreAttempt applies +1 and -0.25 and tracks skips', () => {
  const result = scoreAttempt(questions, { 0: 0, 1: 0 });
  assert.equal(result.correct, 1);
  assert.equal(result.wrong, 1);
  assert.equal(result.skipped, 1);
  assert.equal(result.score, 0.75);
  assert.equal(result.accuracy, 50);
});

test('buildAnalytics aggregates active time, visits, changes and topics', () => {
  const result = buildAnalytics({
    questions,
    answers: { 0: 0, 1: 1 },
    timeByQuestion: { 0: 12000, 1: 18000, 2: 5000 },
    visits: { 0: 1, 1: 2, 2: 1 },
    answerChanges: { 1: 1 },
    marked: { 2: true },
  });
  assert.equal(result.totalActiveSeconds, 35);
  assert.equal(result.totalVisits, 4);
  assert.equal(result.totalAnswerChanges, 1);
  assert.equal(result.bySubject.length, 2);
  assert.equal(result.rows[2].marked, true);
});

test('coach packet contains per-question response and timing data', () => {
  const analytics = buildAnalytics({ questions, answers: { 0: 0 }, timeByQuestion: { 0: 9000 } });
  const packet = buildCoachPacket({ title: 'Mock', completedAt: '2026-01-01', elapsedSeconds: 30 }, analytics);
  assert.equal(packet.responses[0].activeSeconds, 9);
  assert.equal(packet.responses[0].response, 'x');
  assert.equal(packet.responses[1].response, null);
});

test('descriptive responses remain pending until graded and then add marks', () => {
  const descriptive = [{ id: 'd1', type: 'descriptive', subject: 'English', section: 'Descriptive', topic: 'Essay', question: 'Write', options: [], answer: null, marks: 20, negativeMarks: 0 }];
  const pending = scoreAttempt(descriptive, { 0: 'A thoughtful response' });
  assert.equal(pending.descriptivePending, 1);
  assert.equal(pending.score, 0);
  assert.equal(pending.rows[0].status, 'Pending Review');
  const graded = scoreAttempt(descriptive, { 0: 'A thoughtful response' }, { 0: { score: 14 } });
  assert.equal(graded.score, 14);
  assert.equal(graded.rows[0].status, 'Graded');
});
