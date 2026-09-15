import test from 'node:test';
import assert from 'node:assert/strict';
import { buildQuestionCoachPrompt, buildQuestionMemory, compactAttemptContext, reviewChatKey, reviewChatTitle } from '../src/review-ai.js';

const packet = {
  exam: 'Quant Day 18',
  completedAt: '2026-09-15T10:00:00Z',
  summary: { score: 11.75, maxScore: 45, accuracy: 72, wrong: 5, skipped: 27 },
  subjectBreakdown: [{ name: 'Quantitative Aptitude', accuracy: 72 }],
  topicBreakdown: [{ name: 'Arithmetic', accuracy: 60 }],
  responses: [
    { questionId: 'q1', number: 1, topic: 'Arithmetic', question: 'Find x.', response: '42500', correctOption: '48000', status: 'Wrong', activeSeconds: 255, visits: 1, answerChanges: 0, markedForReview: false, explanation: '0.36x = 17280.' },
    { questionId: 'q2', number: 2, topic: 'Ratio', question: 'Another question.', response: '10', correctOption: '10', status: 'Correct', activeSeconds: 40 },
  ],
};

test('one review chat key is stable for the whole attempt', () => {
  assert.equal(reviewChatKey('a1'), 'review:a1');
  assert.equal(reviewChatKey('a1', 'ignored-question'), reviewChatKey('a1'));
  assert.notEqual(reviewChatKey('a1'), reviewChatKey('a2'));
});

test('review title identifies one persistent mock coaching session', () => {
  assert.equal(reviewChatTitle({ title: 'Quant Day 18' }), 'Mock Coach · Quant Day 18');
});

test('compact attempt context omits full question text but keeps performance signals', () => {
  const compact = compactAttemptContext(packet);
  assert.equal(compact.summary.score, 11.75);
  assert.equal(compact.responseIndex[0].activeSeconds, 255);
  assert.equal(compact.responseIndex[0].question, undefined);
  assert.equal(JSON.stringify(compact).includes('Another question'), false);
});

test('first analysis includes full attempt exactly when requested', () => {
  const first = buildQuestionCoachPrompt({ attemptPacket: packet, questionNumber: 1, includeFullAttempt: true });
  const later = buildQuestionCoachPrompt({ attemptPacket: packet, questionNumber: 2, includeFullAttempt: false });
  assert.match(first, /FULL_ATTEMPT_CONTEXT_FIRST_TIME_ONLY/);
  assert.match(first, /Another question/);
  assert.doesNotMatch(later, /FULL_ATTEMPT_CONTEXT_FIRST_TIME_ONLY/);
  assert.doesNotMatch(later, /Find x\./);
  assert.match(later, /COMPACT_ATTEMPT_SESSION/);
});

test('later question prompt includes accumulated coaching memory and cross-question rules', () => {
  const memory = [buildQuestionMemory(packet.responses[0], 'The student multiplied the weighted rate incorrectly.')];
  const prompt = buildQuestionCoachPrompt({ attemptPacket: packet, questionNumber: 2, questionMemories: memory });
  assert.match(prompt, /weighted rate incorrectly/);
  assert.match(prompt, /similar concepts written in different ways/);
});

test('follow-up prompt carries recent unified mock chat', () => {
  const prompt = buildQuestionCoachPrompt({ attemptPacket: packet, questionNumber: 1, history: [{ role: 'assistant', questionNumber: 11, content: 'Check percentage conversion.' }], userMessage: 'Show a shorter method.' });
  assert.match(prompt, /Show a shorter method/);
  assert.match(prompt, /Q11 COACH: Check percentage conversion/);
});

test('question memory stores a compact coach summary', () => {
  const memory = buildQuestionMemory(packet.responses[0], '  Use   weighted interest.  ');
  assert.equal(memory.questionId, 'q1');
  assert.equal(memory.coachSummary, 'Use weighted interest.');
});

test('coach prompt rejects a missing question number', () => {
  assert.throws(() => buildQuestionCoachPrompt({ attemptPacket: packet, questionNumber: 99 }), /not available/);
});
