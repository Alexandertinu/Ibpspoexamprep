import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');

test('dynamic imported identifiers are escaped before HTML attribute interpolation', () => {
  for (const snippet of [
    'data-start-test="${escapeHTML(test.id)}"',
    'data-open-attempt="${escapeHTML(a.id)}"',
    'data-select-question="${escapeHTML(q.id)}"',
    'data-mock-question="${escapeHTML(question.id)}"',
    'data-open-chat="${escapeHTML(chat.id)}"',
  ]) assert.ok(source.includes(snippet), `missing: ${snippet}`);
});

test('Tutor restores and persists attached attempt and question context', () => {
  assert.match(source, /a\.id===current\.contextAttemptId\?'selected'/);
  assert.match(source, /q\.id===current\.contextQuestionId\?'selected'/);
  assert.match(source, /contextAttemptId:event\.target\.value/);
  assert.match(source, /contextQuestionId:event\.target\.value/);
});

test('the final exam question opens submit review instead of navigating to itself', () => {
  assert.match(source, /state\.current===state\.questions\.length-1\?'Review & Submit'/);
  assert.match(source, /if\(state\.current===state\.questions\.length-1\)showSubmit\(\)/);
});

test('backup data is prepared before live application state is replaced', () => {
  assert.match(source, /const prepared=prepareBackup\(await readJSONFile/);
  assert.match(source, /bank=prepared\.bank;attempts=prepared\.attempts/);
});
