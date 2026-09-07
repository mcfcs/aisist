(function (root) {
  'use strict';
  const ORIGIN = 'https://aisis.ateneo.edu';
  const TTL = { available: 10 * 60 * 1000, missing: 5 * 60 * 1000, unknown: 30 * 1000 };
  function allowedUrl(value) {
    try {
      const url = new URL(value);
      return url.origin === ORIGIN && !url.username && !url.password && !url.search && !url.hash && /^\/syllabi\/20\d{2}\/[012]\/[^/]+\.pdf$/.test(url.pathname);
    } catch { return false; }
  }
  async function prefix(response, limit = 2048) {
    if (!response.body) return '';
    const reader = response.body.getReader(), chunks = [];
    let size = 0;
    try {
      while (size < limit) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = value.subarray(0, limit - size); chunks.push(chunk); size += chunk.length;
      }
    } finally { await reader.cancel().catch(() => {}); }
    const bytes = new Uint8Array(size); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    return new TextDecoder().decode(bytes);
  }
  function redirected(response) { return response.type === 'opaqueredirect' || response.redirected || (response.status >= 300 && response.status < 400); }
  async function probe(url, fetcher) {
    const options = { credentials: 'same-origin', redirect: 'manual', cache: 'no-store' };
    try {
      const head = await fetcher(url, { ...options, method: 'HEAD', signal: AbortSignal.timeout(10000) });
      if (redirected(head)) return { state: 'unknown', reason: 'AISIS redirected the request; you may need to sign in.' };
      if ([404, 410].includes(head.status)) return { state: 'missing', reason: `AISIS returned HTTP ${head.status}. No PDF is available at this link.` };
      if (head.ok && /^application\/pdf\b/i.test(head.headers.get('content-type') || '') && head.headers.get('content-length') !== '0') return { state: 'available', reason: 'AISIS confirmed a PDF at this link.' };
      if (!head.ok && ![405, 501].includes(head.status)) return { state: 'unknown', reason: `Could not verify the PDF (HTTP ${head.status}).` };
      // Some older servers reject HEAD or return misleading content types. Ask
      // for only the start of the file and cancel the stream if Range is ignored.
      const response = await fetcher(url, { ...options, method: 'GET', headers: { Range: 'bytes=0-2047', Accept: 'application/pdf,*/*;q=0.5' }, signal: AbortSignal.timeout(10000) });
      if (redirected(response)) { await response.body?.cancel().catch(() => {}); return { state: 'unknown', reason: 'AISIS redirected the request; you may need to sign in.' }; }
      if ([404, 410].includes(response.status)) { await response.body?.cancel().catch(() => {}); return { state: 'missing', reason: `AISIS returned HTTP ${response.status}. No PDF is available at this link.` }; }
      if (!response.ok) { await response.body?.cancel().catch(() => {}); return { state: 'unknown', reason: `Could not verify the PDF (HTTP ${response.status}).` }; }
      const start = await prefix(response);
      if (/^\s*%PDF-\d\.\d/.test(start)) return { state: 'available', reason: 'AISIS returned a PDF at this link.' };
      if (/<h1[^>]*>\s*Not Found\s*<\/h1>/i.test(start) && /requested URL[\s\S]*was not found on this server/i.test(start)) return { state: 'missing', reason: 'AISIS returned its Not Found page instead of a PDF.' };
      return { state: 'unknown', reason: 'AISIS did not return a recognizable PDF. You may need to sign in.' };
    } catch (error) {
      return { state: 'unknown', reason: /timeout|abort/i.test(error.name || '') ? 'The availability check timed out. You can still try opening the link.' : 'The availability check failed. You can still try opening the link.' };
    }
  }
  function createChecker({ fetch: fetcher, now = Date.now, cache, concurrency = 3 } = {}) {
    const memory = new Map(), pending = new Map(), queue = [];
    let active = 0;
    const fresh = record => record && Object.hasOwn(TTL, record.state) && Number.isFinite(record.checkedAt) && record.checkedAt <= now() && record.expiresAt > now() && record.expiresAt <= now() + TTL[record.state];
    async function run(url, force) {
      let stored = memory.get(url);
      if (!force && !fresh(stored)) { try { stored = await cache?.get(url); } catch {} }
      if (!force && fresh(stored)) { memory.set(url, stored); return stored; }
      const result = await probe(url, fetcher);
      const record = { ...result, checkedAt: now(), expiresAt: now() + TTL[result.state] };
      memory.set(url, record);
      if (memory.size > 500) memory.delete(memory.keys().next().value);
      try { await cache?.set(url, record); } catch {}
      return record;
    }
    function pump() {
      while (active < Math.max(1, concurrency) && queue.length) {
        const job = queue.shift(); active++;
        const finish = () => { active--; pending.delete(job.url); pump(); };
        run(job.url, job.force).then(value => { finish(); job.resolve(value); }, error => { finish(); job.reject(error); });
      }
    }
    function check(url, { force = false } = {}) {
      if (!allowedUrl(url)) return Promise.resolve({ state: 'unknown', reason: 'Not an AISIS syllabus URL.' });
      if (pending.has(url)) return pending.get(url);
      if (!force && fresh(memory.get(url))) return Promise.resolve(memory.get(url));
      const promise = new Promise((resolve, reject) => { queue.push({ url, force, resolve, reject }); });
      pending.set(url, promise); pump(); return promise;
    }
    return { check };
  }
  const api = { createChecker, allowedUrl };
  root.AisisSyllabus = api;
  if (typeof module !== 'undefined') module.exports = api;
})(globalThis);
