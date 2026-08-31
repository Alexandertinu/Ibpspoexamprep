import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const read = (path) => readFile(resolve(root, path), 'utf8');
const stripExports = (source) => source.replace(/\bexport\s+/g, '');
const stripImports = (source) => source.replace(/^import .*;\s*$/gm, '');

const [styles, analytics, questions, storage, ai, app] = await Promise.all([
  read('styles.css'), read('src/analytics.js'), read('src/questions.js'), read('src/storage.js'), read('src/ai.js'), read('src/app.js'),
]);

const script = [analytics, questions, storage, ai].map(stripExports).concat(stripImports(app)).join('\n\n');
const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="theme-color" content="#0789bb"><meta name="description" content="Private offline exam simulator, question bank and optional AI coach">
<title>Prep Studio — Ultimate Exam Practice</title><style>${styles}</style>
</head>
<body>
<div id="app" class="loading-shell"><div class="loading-card"><strong>Prep Studio</strong><span>Loading your private exam workspace…</span></div></div>
<noscript><div class="fatal">JavaScript is required to run this application.</div></noscript>
<input id="question-import" type="file" accept="application/json,.json" hidden><input id="backup-import" type="file" accept="application/json,.json" hidden>
<script>${script.replace(/<\/script>/gi, '<\\/script>')}</script>
</body></html>`;

await writeFile(resolve(root, 'standalone.html'), html);
console.log(`Built standalone.html (${Buffer.byteLength(html)} bytes)`);
