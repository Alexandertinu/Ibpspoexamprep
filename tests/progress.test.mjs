import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMistakeNotebook, buildSubjectTrends, summarizeSubjectTrend } from '../src/progress.js';

const question = { id: 'q1', type: 'mcq', subject: 'Quantitative Aptitude', topic: 'Ratio', question: 'Ratio question' };
const attempts = [
  { id: 'a2', title: 'Ratio 2', completedAt: '2026-09-02T00:00:00Z', isTestRun: false, analytics: { bySubject: [{ name: 'Quantitative Aptitude', accuracy: 80, averageSeconds: 45, attempted: 10, correct: 8, wrong: 2, skipped: 0, score: 7.5, maxScore: 10 }], rows: [{ question, status: 'Correct', activeSeconds: 35 }] } },
  { id: 'a1', title: 'Ratio 1', completedAt: '2026-09-01T00:00:00Z', isTestRun: false, analytics: { bySubject: [{ name: 'Quantitative Aptitude', accuracy: 60, averageSeconds: 70, attempted: 10, correct: 6, wrong: 4, skipped: 0, score: 5, maxScore: 10 }], rows: [{ question, status: 'Wrong', activeSeconds: 90 }] } },
];

test('buildSubjectTrends orders points chronologically by subject', () => {
  const [trend] = buildSubjectTrends(attempts);
  assert.equal(trend.subject, 'Quantitative Aptitude');
  assert.deepEqual(trend.points.map((point) => point.accuracy), [60, 80]);
  assert.deepEqual(summarizeSubjectTrend(trend.points), { attempts: 2, latestAccuracy: 80, accuracyChange: 20, latestAverageSeconds: 45, averageAccuracy: 70 });
});

test('mistake notebook keeps wrong questions and recognizes later improvement', () => {
  const [entry] = buildMistakeNotebook(attempts, { q1: { mastered: true, note: 'Review ratios' } });
  assert.equal(entry.questionId, 'q1');
  assert.equal(entry.wrongCount, 1);
  assert.equal(entry.correctCount, 1);
  assert.equal(entry.improved, true);
  assert.equal(entry.mastered, true);
  assert.equal(entry.note, 'Review ratios');
});

test('mistake notebook counts repeated wrong and skipped attempts', () => {
  const extra = { id: 'a3', title: 'Ratio 3', completedAt: '2026-09-03T00:00:00Z', analytics: { bySubject: [], rows: [{ question, status: 'Skipped', activeSeconds: 10 }, { question: { ...question, id: 'q2' }, status: 'Wrong', activeSeconds: 50 }] } };
  const notebook = buildMistakeNotebook([...attempts, extra]);
  assert.equal(notebook.find((entry) => entry.questionId === 'q1').skippedCount, 1);
  assert.equal(notebook.find((entry) => entry.questionId === 'q2').wrongCount, 1);
});
