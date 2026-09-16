(function (root) {
  'use strict';
  const KEY = 'features-v1';
  // Every tool is on by default, so a fresh install behaves like earlier
  // versions and an unreachable storage area never hides working features.
  const DEFAULTS = { syllabus: true, reviews: true, planner: true };
  const LABELS = {
    syllabus: { name: 'Syllabus links', detail: 'Adds the direct syllabus PDF link and its availability check to each course row.' },
    reviews: { name: 'Prof reviews', detail: 'Adds course-prioritized professor ratings from Profs to Pick.' },
    planner: { name: 'Schedule planner', detail: 'Adds Add to plan, the weekly draft schedule, and Individual Program of Study matching.' }
  };
  const normalize = stored => {
    const values = { ...DEFAULTS };
    for (const key of Object.keys(DEFAULTS)) if (typeof stored?.[key] === 'boolean') values[key] = stored[key];
    return values;
  };
  async function read() {
    try { return normalize((await chrome.storage.sync.get(KEY))[KEY]); } catch { return { ...DEFAULTS }; }
  }
  async function write(values) {
    try { await chrome.storage.sync.set({ [KEY]: normalize(values) }); return true; } catch { return false; }
  }
  function subscribe(listener) {
    try {
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'sync' && changes[KEY]) listener(normalize(changes[KEY].newValue));
      });
    } catch { /* Stored toggles are applied on the next page load instead. */ }
  }
  const api = { KEY, DEFAULTS, LABELS, normalize, read, write, subscribe };
  root.AisisSettings = api;
  if (typeof module !== 'undefined') module.exports = api;
})(globalThis);
