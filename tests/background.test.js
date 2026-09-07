const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const C = require('../lib/core');

test('worker validates sender, omits credentials, caches and refreshes public profile requests', async () => {
  let listener, calls = 0;
  const cache = {};
  const profile = { name: 'Example, Alexander E.', reviews: [] };
  const context = vm.createContext({
    importScripts() {}, AisisCore: { ...C, parseProfessor: () => ({ ...profile }) }, AbortSignal,
    fetch: async (url, options) => {
      calls++; assert.equal(url, 'https://profstopick.com/professor/example-alexander'); assert.equal(options.credentials, 'omit');
      return { ok: true, text: async () => 'public response' };
    },
    chrome: { runtime: { id: 'test-extension', onMessage: { addListener(fn) { listener = fn; } } }, storage: { session: { get: async key => ({ [key]: cache[key] }), set: async value => Object.assign(cache, value) } } }
  });
  vm.runInContext(fs.readFileSync('background.js', 'utf8'), context);
  const message = { type: 'professor', name: 'EXAMPLE, ALEXANDER E.' };
  const sender = { id: 'test-extension', url: 'https://aisis.ateneo.edu/j_aisis/J_VCSC.do' };
  assert.equal(listener(message, { ...sender, url: 'https://evil.example/' }, () => assert.fail('Untrusted sender')), undefined);
  assert.equal(listener(message, { ...sender, id: 'other-extension' }, () => assert.fail('Untrusted extension')), undefined);
  const send = msg => new Promise(resolve => assert.equal(listener(msg, sender, resolve), true));
  const results = await Promise.all([send(message), send(message)]);
  assert.ok(results.every(r => r.ok)); assert.equal(calls, 1);
  await send(message); assert.equal(calls, 1);
  await send({ ...message, refresh: true }); assert.equal(calls, 2);
});
