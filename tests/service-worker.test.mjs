import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../sw.js', import.meta.url), 'utf8');
const manifest = JSON.parse(await readFile(new URL('../manifest.webmanifest', import.meta.url), 'utf8'));

test('service worker caches only its explicit same-origin static allowlist', () => {
  assert.match(source, /STATIC_URLS/);
  assert.match(source, /url\.origin !== self\.location\.origin/);
  assert.match(source, /!STATIC_URLS\.has\(url\.href\)/);
  assert.match(source, /headers\.has\('authorization'\)/);
  assert.ok(source.indexOf('!STATIC_URLS.has(url.href)') < source.indexOf('event.respondWith'), 'allowlist check must run before cache handling');
});

test('service worker precaches PWA icons and all source modules', () => {
  for (const asset of ['icon-192.svg', 'icon-512.svg', 'review-ai.js', 'mock-builder.js', 'progress.js']) assert.match(source, new RegExp(asset.replace('.', '\\.')));
});

test('manifest provides installable 192px and 512px icons', () => {
  assert.ok(manifest.icons.some((icon) => icon.sizes === '192x192' && icon.type === 'image/svg+xml'));
  assert.ok(manifest.icons.some((icon) => icon.sizes === '512x512' && icon.type === 'image/svg+xml' && icon.purpose.includes('maskable')));
});
