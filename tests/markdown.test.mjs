import test from 'node:test';
import assert from 'node:assert/strict';
import { renderMarkdown } from '../src/markdown.js';

test('inline code is literal, not reformatted into emphasis or links', () => {
  assert.equal(renderMarkdown('`**literal** [link](https://example.com) <b>text</b>`'), '<p><code>**literal** [link](https://example.com) &lt;b&gt;text&lt;/b&gt;</code></p>');
});

test('link destinations are not rewritten as Markdown markup', () => {
  const html = renderMarkdown('[**Docs**](https://example.com/**path**?a=1&b=2)');
  assert.equal(html, '<p><a href="https://example.com/**path**?a=1&amp;b=2" target="_blank" rel="noopener noreferrer"><strong>Docs</strong></a></p>');
});

test('HTML, quotes and entity tricks stay escaped in links, code and tables', () => {
  const link = renderMarkdown('[<img src=x onerror=alert(1)>](https://example.com/?q="x"&amp;b=2)');
  assert.doesNotMatch(link, /<img/);
  assert.match(link, /&lt;img/);
  assert.match(link, /q=%22x%22&amp;amp;b=2/);
  assert.equal(renderMarkdown('`&lt;script&gt; "x"`'), '<p><code>&amp;lt;script&amp;gt; &quot;x&quot;</code></p>');
  const table = renderMarkdown('| Head |\n| --- |\n| <svg onload=alert(1)> |');
  assert.doesNotMatch(table, /<svg/);
  assert.match(table, /&lt;svg/);
  const code = renderMarkdown('```js" onmouseover="x\n<script>\n```');
  assert.match(code, /data-language="js&quot; onmouseover=&quot;x"/);
  assert.match(code, /&lt;script&gt;/);
});

test('invalid and non-HTTP links remain plain text', () => {
  const html = renderMarkdown('[broken](https://) [unsafe](javascript:alert) [encoded](javascript&#58;alert) [file](file:///etc/passwd)');
  assert.doesNotMatch(html, /<a /);
  assert.match(html, /javascript&amp;#58;alert/);
});

test('links work on the first line of a paragraph as well as later lines', () => {
  const html = renderMarkdown('[First](https://first.example)\n[Second](https://second.example)');
  assert.equal((html.match(/<a /g) || []).length, 2);
});

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
  assert.match(html, /href="https:\/\/example.com\/"/);
});
