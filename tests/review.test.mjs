import test from 'node:test';
import assert from 'node:assert/strict';
import { formatReviewDuration, reviewOptionState, reviewStatus } from '../src/review.js';

test('review status maps attempt results to palette tones', () => {
  assert.deepEqual(reviewStatus('Correct'), { tone: 'correct', label: 'Correct' });
  assert.deepEqual(reviewStatus('Wrong'), { tone: 'wrong', label: 'Incorrect' });
  assert.deepEqual(reviewStatus('Skipped'), { tone: 'skipped', label: 'Skipped' });
  assert.deepEqual(reviewStatus('Pending Review'), { tone: 'pending', label: 'Pending Review' });
});

test('review options distinguish the submitted and correct answers', () => {
  const question = { type: 'mcq', answer: 2 };
  assert.deepEqual(reviewOptionState(question, 1, 1), { correct: false, chosen: true, wrongChoice: true, className: 'wrong-choice', label: 'Your answer' });
  assert.deepEqual(reviewOptionState(question, 1, 2), { correct: true, chosen: false, wrongChoice: false, className: 'correct-choice', label: 'Correct answer' });
  assert.equal(reviewOptionState(question, 2, 2).label, 'Your answer · Correct');
});

test('review time formats seconds for human-readable telemetry', () => {
  assert.equal(formatReviewDuration(42), '42s');
  assert.equal(formatReviewDuration(125), '2m 05s');
  assert.equal(formatReviewDuration(undefined), '0s');
});
