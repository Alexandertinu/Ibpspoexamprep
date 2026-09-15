import test from 'node:test';
import assert from 'node:assert/strict';
import { buildQuestionCoachPrompt, reviewChatKey, reviewChatTitle } from '../src/review-ai.js';

const packet = {
  exam: 'Quant Day 18',
  summary: { score: 11.75, maxScore: 45, accuracy: 72, wrong: 5, skipped: 27 },
  responses: [
    { number: 1, question: 'Find x.', response: '42500', correctOption: '48000', status: 'Wrong', activeSeconds: 255, visits: 1, answerChanges: 0, markedForReview: false, explanation: '0.36x = 17280.' },
    { number: 2, question: 'Another question.', response: '10', correctOption: '10', status: 'Correct', activeSeconds: 40 },
  ],
};

test('question review chat keys are stable per attempt and question', () => {
  assert.equal(reviewChatKey('a1', 'q1'), 'review:a1:q1');
  assert.notEqual(reviewChatKey('a1', 'q1'), reviewChatKey('a1', 'q2'));
});

test('question review title identifies the question, topic and mock', () => {
  assert.match(reviewChatTitle({ title: 'Quant Day 18' }, { number: 1, topic: 'Arithmetic' }), /Q1 Review · Arithmetic · Quant Day 18/);
});

test('initial coach prompt focuses on one question while carrying the full attempt', () => {
  const prompt = buildQuestionCoachPrompt({ attemptPacket: packet, questionNumber: 1 });
  assert.match(prompt, /Analyse only question 1/);
  assert.match(prompt, /Why the student's answer was wrong/);
  assert.match(prompt, /fastest safe exam method/);
  assert.match(prompt, /"activeSeconds": 255/);
  assert.match(prompt, /"score": 11.75/);
  assert.match(prompt, /Another question/);
});

test('follow-up coach prompt includes question chat history and new message', () => {
  const prompt = buildQuestionCoachPrompt({ attemptPacket: packet, questionNumber: 1, history: [{ role: 'assistant', content: 'Use weighted interest.' }], userMessage: 'Show a shorter method.' });
  assert.match(prompt, /Show a shorter method/);
  assert.match(prompt, /COACH: Use weighted interest/);
});

test('coach prompt rejects a missing question number', () => {
  assert.throws(() => buildQuestionCoachPrompt({ attemptPacket: packet, questionNumber: 99 }), /not available/);
});
