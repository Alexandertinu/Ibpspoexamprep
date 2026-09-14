import test from 'node:test';
import assert from 'node:assert/strict';
import { renderMarkdown } from '../src/markdown.js';

test('renders Markdown tables as accessible HTML tables', () => {
  const html = renderMarkdown('| Topic | Accuracy |\n|---|---:|\n| Ratio | 62% |\n| DI | 81% |');
  assert.match(html, /class="chat-table-wrap"/);
  assert.match(html, /<th>Topic<\/th>/);
  assert.match(html, /<td>Ratio<\/td>/);
  assert.match(html, /<td>81%<\/td>/);
});

test('renders headings, lists, emphasis and code', () => {
  const html = renderMarkdown('## Plan\n- Review **Ratio**\n- Practise `10 min`');
  assert.match(html, /<h2>Plan<\/h2>/);
  assert.match(html, /<ul>/);
  assert.match(html, /<strong>Ratio<\/strong>/);
  assert.match(html, /<code>10 min<\/code>/);
});

test('escapes model-supplied HTML and unsafe links', () => {
  const html = renderMarkdown('<script>alert(1)</script>\n[bad](javascript:alert(1))\n[good](https://example.com)');
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script&gt;/);
  assert.doesNotMatch(html, /href="javascript:/);
  assert.match(html, /href="https:\/\/example.com"/);
});
