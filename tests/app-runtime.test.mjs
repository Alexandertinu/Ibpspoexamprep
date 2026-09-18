import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';
import * as questions from '../src/questions.js';
import * as analytics from '../src/analytics.js';
import * as markdown from '../src/markdown.js';
import * as review from '../src/review.js';
import * as reviewAI from '../src/review-ai.js';
import * as builder from '../src/mock-builder.js';
import * as progress from '../src/progress.js';
import * as library from '../src/practice-library.js';
import * as ai from '../src/ai.js';

const source = readFileSync(new URL('../src/app.js', import.meta.url), 'utf8').replace(/^import .*;\s*$/gm, '');
function runtime(){
  const elements=new Map();
  const element=()=>({value:'',disabled:false,checked:false,innerHTML:'',textContent:'',dataset:{},style:{},children:[],classList:{add(){},remove(){},toggle(){}},addEventListener(){},remove(){},focus(){},select(){},scrollIntoView(){},querySelector(){return element()},querySelectorAll(){return []}});
  const document={body:element(),hidden:false,querySelector(selector){if(!elements.has(selector))elements.set(selector,element());return elements.get(selector)},querySelectorAll(){return []},createElement:element,addEventListener(){}};
  document.body.append=()=>{};
  const data=new Map();
  const storage={hasPersistenceIssue:()=>false,loadBank:()=>null,loadAttempts:()=>[],loadTests:()=>[],loadSettings:()=>({}),loadAIConfig:()=>null,loadAIProfiles:()=>[],loadAIKeys:()=>({}),loadTutor:()=>[],loadTutorChats:()=>[],loadMistakeState:()=>({})};
  for(const name of ['Bank','Attempts','Tests','Settings','AIConfig','AIProfiles','AIKeys','Tutor','TutorChats','MistakeState','Active']){
    storage['save'+name]=value=>{data.set(name,structuredClone(value));return true};storage['clear'+name]=()=>data.delete(name);
  }
  storage.loadActive=()=>data.get('Active')||null;
  const context=vm.createContext({...questions,...analytics,...markdown,...review,...reviewAI,...builder,...progress,...library,...ai,storage,document,navigator:{},location:{protocol:'file:'},crypto:webcrypto,console,URL,Blob,Map,Set,Date,structuredClone,FormData:class{constructor(values){this.values=values}get(k){return this.values[k]??null}},confirm:()=>true,setTimeout:()=>0,clearTimeout(){},setInterval:()=>0,clearInterval(){}});
  context.window=context;context.addEventListener=()=>{};
  vm.runInContext(source,context);
  return {run:code=>vm.runInContext(code,context),document,data};
}

test('boot renders subject-focused dashboard without network dependencies',()=>{
 const r=runtime();assert.match(r.document.querySelector('#app').innerHTML,/Make today/);
 r.run("navigate('tests')");assert.match(r.document.querySelector('#app').innerHTML,/subject-library/);
 assert.doesNotMatch(r.document.querySelector('#app').innerHTML,/id="mock-builder-form"/);
});
test('identical question IDs in different mock imports are isolated',()=>{
 const r=runtime();const result=r.run("const x=[{id:'Q001',setId:'SET-01'},{id:'Q002',setId:'SET-01'}];[isolateMockQuestions(x,'first'),isolateMockQuestions(x,'second')]");
 assert.notEqual(result[0][0].id,result[1][0].id);assert.notEqual(result[0][0].setId,result[1][0].setId);assert.equal(result[0][0].setId,result[0][1].setId);
});
test('empty fixed-question tests cannot accidentally use the whole question bank',()=>{
 const r=runtime();assert.equal(r.run('materializeTest({questionIds:[]}).length'),0);
});
test('solution tables are retained for review but never rendered in live questions',()=>{
 const r=runtime();r.run("const mediaQ={topic:'Coding Decoding',table:{caption:'Decoded Words and Codes',headers:['Word','Code'],rows:[['apple','xy']]}};");
 assert.doesNotMatch(r.run('renderQuestionMedia(mediaQ)'),/xy/);
 assert.match(r.run('renderQuestionMedia(mediaQ,true)'),/xy/);
});
test('manual mode disables hidden random-count constraint',()=>{
 const r=runtime();r.document.querySelector('input[name="mock-mode"]:checked').value='manual';r.run('updateMockBuilderMode()');
 assert.equal(r.document.querySelector('#mock-random-count').disabled,true);
});
test('review reply remains attached to originating attempt after navigation',async()=>{
 const r=runtime();r.run("aiConfig={provider:'openai',baseUrl:'https://example.invalid/v1',model:'test',authMode:'none'};currentAttempt={id:'first',title:'First',analytics:buildAnalytics({questions:starterBank.slice(0,1)})};var resolveAI;var calls=0;callAI=()=>{calls++;return new Promise(resolve=>resolveAI=resolve)}");
 const pending=r.run("runReviewAI(currentAttempt.analytics.rows[0],'',true)");
 await r.run("runReviewAI(currentAttempt.analytics.rows[0],'Duplicate')");assert.equal(r.run('calls'),1);
 r.run("currentAttempt={...currentAttempt,id:'second'};resolveAI('First attempt reply')");await pending;
 assert.equal(r.run("tutorChats.find(c=>c.contextKey==='review:first').messages.at(-1).content"),'First attempt reply');
 assert.equal(r.run("tutorChats.some(c=>c.contextKey==='review:second')"),false);
});
test('Tutor reply does not leak into a newly opened chat',async()=>{
 const r=runtime();r.run("aiConfig={provider:'openai',baseUrl:'https://example.invalid/v1',model:'test',authMode:'none'};var oldChat=activeTutorChatId;var resolveAI;callAI=()=>new Promise(resolve=>resolveAI=resolve)");
 r.document.querySelector('#tutor-input').value='Explain ratios';const pending=r.run('sendTutorMessage()');r.run("startNewTutorChat();resolveAI('Ratio reply')");await pending;
 assert.equal(r.run("tutorChats.find(c=>c.id===oldChat).messages.at(-1).content"),'Ratio reply');assert.equal(r.run('activeTutorChat().messages.length'),0);
});
test('whole DI context is included in the coach packet',()=>{
 const q={id:'q',subject:'Quant',topic:'DI',question:'Read table',type:'mcq',options:['1','2'],answer:0,passage:'Original directions',marks:1,table:{headers:['Data'],rows:[['123']]}};
 const packet=analytics.buildCoachPacket({title:'DI'},analytics.buildAnalytics({questions:[q]}));
 assert.equal(packet.responses[0].passage,q.passage);assert.deepEqual(packet.responses[0].table,q.table);assert.deepEqual(packet.responses[0].options,q.options);
});
