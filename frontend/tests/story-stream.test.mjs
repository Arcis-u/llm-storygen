import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
// Compile the actual dependency-free decoder to ESM; no test copy of the implementation.
const source=readFileSync(new URL('../src/lib/story-stream.ts', import.meta.url),'utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {consumeStoryStream}=await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
const storeSource=readFileSync(new URL('../src/store/useStoryStore.ts', import.meta.url),'utf8');
const storeCode=ts.transpileModule(storeSource,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText.replace("from 'zustand'", `from '${import.meta.resolve('zustand')}'`);
const {useStoryStore}=await import(`data:text/javascript;base64,${Buffer.from(storeCode).toString('base64')}`);
function stream(text, size=1) { const bytes=new TextEncoder().encode(text); return new ReadableStream({start(c){for(let i=0;i<bytes.length;i+=size)c.enqueue(bytes.slice(i,i+size)); c.close();}}); }
function handlers() { const received=[]; return {received, token:t=>received.push(['token',t]),replace:t=>received.push(['replace',t]),status:t=>received.push(['status',t]),roll:n=>received.push(['roll',n]),done:(c,s)=>received.push(['done',c,s])}; }
const done='data: {"type":"done","chapter":{"chapter_number":2},"config":{"is_ended":false}}\r\n\r\n';
test('decodes split UTF-8, CRLF frames, comments and server roll', async()=>{
  const h=handlers(); await consumeStoryStream(stream(': ping\r\n\r\ndata: {"type":"replace","text":"Cánh cửa hé mở"}\r\n\r\ndata: {"type":"roll","value":17}\r\n\r\n'+done),h);
  assert.deepEqual(h.received[0],['replace','Cánh cửa hé mở']); assert.deepEqual(h.received[1],['roll',17]); assert.equal(h.received[2][0],'done');
});
test('rejects silent EOF before completion',async()=>{await assert.rejects(consumeStoryStream(stream('data: {"type":"token","text":"draft"}\n\n'),handlers()),/Kết nối đã ngắt/);});
test('server error ends the stream and never calls done',async()=>{const h=handlers(); await assert.rejects(consumeStoryStream(stream('data: {"type":"error","message":"busy"}\n\n'+done),h),/busy/); assert.equal(h.received.length,0);});
test('accepts final frame without trailing newline',async()=>{const h=handlers();await consumeStoryStream(stream(done.trim()),h);assert.equal(h.received.length,1);});
test('rejects malformed completion',async()=>{await assert.rejects(consumeStoryStream(stream('data: {"type":"done"}\n\n'),handlers()),/không đầy đủ/);});
test('revisions replace instead of accumulating',async()=>{const h=handlers();await consumeStoryStream(stream('data: {"type":"replace","text":"old"}\n\ndata: {"type":"replace","text":"new"}\n\n'+done,7),h);assert.equal(h.received.filter(x=>x[0]==='replace').length,2);});
test('hydration, repeated completion and reset preserve store invariants',()=>{
  const store=useStoryStore;
  store.getState().resetStore();
  const character=store.getState().character;
  const chapter={story_id:'a',chapter_number:1,content:'test',choices:[],summary:'',tone:'ambient',state_changes:{},created_at:''};
  const config={story_id:'a',genre:'cyberpunk',title:'Test',character,quests:[],locations:[],available_organizations:[],available_shop_items:[],plot_triggers:[],is_ended:false};
  store.getState().hydrateStory({story_id:'a',config,chapters:[chapter],is_processing:false,is_game_over:false});
  store.getState().completeTurn(chapter,config); store.getState().completeTurn(chapter,config);
  assert.equal(store.getState().chapters.length,1);
  store.getState().setIsProcessing(true);store.getState().resetStore();
  assert.equal(store.getState().isProcessing,false);assert.equal(store.getState().chapters.length,0);
});
