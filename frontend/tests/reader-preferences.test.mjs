import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

// Exercise the actual persisted store with isolated browser storage.
const storage = new Map();
globalThis.window = { localStorage: {
  getItem: key => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, value),
  removeItem: key => storage.delete(key),
} };
const source = readFileSync(new URL('../src/store/useReaderPreferences.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
  .replace('from "zustand"', `from '${import.meta.resolve('zustand')}'`)
  .replace('from "zustand/middleware"', `from '${import.meta.resolve('zustand/middleware')}'`);
const { useReaderPreferences: store } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
const key = 'nexus-reader-preferences-v1';

test('font size remains usable for invalid or out-of-range inputs', () => {
  store.getState().setFontSize(200);
  assert.equal(store.getState().fontSize, 24);
  store.getState().setFontSize(-1);
  assert.equal(store.getState().fontSize, 16);
  store.getState().setFontSize(NaN);
  assert.equal(store.getState().fontSize, 18);
});

test('display choices survive rehydration and restore resets persisted settings', async () => {
  store.getState().setTypeface('sans');
  store.getState().setMeasure('wide');
  store.getState().setIllustrations(false);
  const saved = storage.get(key);
  store.getState().restore();
  storage.set(key, saved);
  await store.persist.rehydrate();
  assert.equal(store.getState().typeface, 'sans');
  assert.equal(store.getState().measure, 'wide');
  assert.equal(store.getState().illustrations, false);
  assert.deepEqual(Object.keys(JSON.parse(saved).state).sort(), ['fontSize', 'illustrations', 'measure', 'typeface']);
  store.getState().restore();
  assert.deepEqual(JSON.parse(storage.get(key)).state, { fontSize: 18, typeface: 'serif', measure: 'comfortable', illustrations: true });
});

test('malformed persisted values cannot replace actions or break the reader', async () => {
  storage.set(key, JSON.stringify({state:{ fontSize: -100, typeface: 'invalid', measure: {}, illustrations: 'false', restore: 'invalid' }, version:0}));
  await store.persist.rehydrate();
  assert.equal(store.getState().fontSize, 16);
  assert.equal(store.getState().typeface, 'serif');
  assert.equal(store.getState().measure, 'comfortable');
  assert.equal(store.getState().illustrations, true);
  assert.equal(typeof store.getState().restore, 'function');
});
