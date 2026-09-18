import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const hash=value=>createHash('sha256').update(value).digest('hex');
test('all existing styles remain byte-for-byte unchanged before the scoped workspace theme',()=>{
 const css=readFileSync(new URL('../styles.css',import.meta.url));
 assert.equal(hash(css.subarray(0,40864)),'5afcde578b9ba9c86d79d657f05bccf27aeef168327197298362cfc0af882860');
});
test('TCS live exam markup is unchanged from the approved baseline',()=>{
 const source=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
 const part=source.slice(source.indexOf('function renderExam('),source.indexOf('function examLegend('));
 const markup=part.slice(part.indexOf('app.innerHTML='),part.indexOf(';bindExam();'));
 assert.equal(hash(markup),'b71f14435f37ec4f0f1e7d42bffc3f842d93fb086281d28f6400c482bd757978');
});
