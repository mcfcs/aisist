(function (root) {
  'use strict';
  const P = root.AisisPlan;
  // AISIS has no endpoint that lists one course across departments, so the
  // planner reads department listings for the chosen term until every course
  // the program still needs has been seen. Departments that are likely to own
  // a needed course are read first and the sweep stops as soon as nothing is
  // left to find, so most programs need only a handful of requests.
  function orderDepartments(needed, departments, departmentFor) {
    const likely = new Set();
    for (const course of needed) {
      const code = departmentFor(course.code);
      if (code && departments.includes(code)) likely.add(code);
    }
    return [...likely, ...departments.filter(code => !likely.has(code))];
  }
  function missingFrom(needed, sections) {
    return needed.filter(course => !sections.some(section => P.matchRemaining(section.course, [course])));
  }
  function createCollector({ load, departmentFor = () => '', concurrency = 2, failureLimit = 6 } = {}) {
    let current = null;
    function collect({ term, departments, needed = [], known = [], onProgress } = {}) {
      if (current && current.term === term && !current.settled) return current.promise;
      if (current) current.cancelled = true;
      const state = {
        term, cancelled: false, settled: false, scanned: 0, failures: 0,
        total: departments.length, sections: [...known], department: '', errors: []
      };
      const report = extra => {
        try {
          onProgress?.({
            term, scanned: state.scanned, total: state.total, department: state.department,
            errors: state.errors.slice(), missing: missingFrom(needed, state.sections).map(course => course.code), ...extra
          });
        } catch { /* A failing listener must not stop the sweep. */ }
      };
      const satisfied = () => needed.length > 0 && missingFrom(needed, state.sections).length === 0;
      state.promise = (async () => {
        const collected = [];
        // A department that fails once is tried again at the end: the listings
        // differ hugely in size and the largest can simply time out.
        async function pass(queue, { retry }) {
          const failed = [];
          const worker = async () => {
            while (queue.length && !state.cancelled) {
              if (satisfied()) break;
              const code = queue.shift();
              state.department = code;
              report();
              try {
                const sections = await load(term, code);
                state.scanned++;
                state.sections = state.sections.concat(sections);
                collected.push(...sections);
                // A department read on the retry pass clears its earlier error.
                state.errors = state.errors.filter(entry => entry.department !== code);
                report({ sections });
              } catch (error) {
                state.failures++;
                failed.push(code);
                if (!state.errors.some(entry => entry.department === code)) {
                  state.errors.push({ department: code, message: String(error?.message || error) });
                }
                report();
                // Many failures in a row mean a signed-out session, not a slow listing.
                if (state.failures >= failureLimit && !state.scanned) { state.cancelled = true; state.error = error; break; }
              }
            }
          };
          await Promise.all(Array.from({ length: Math.max(1, Math.min(concurrency, queue.length || 1)) }, worker));
          return retry && failed.length && !state.cancelled && !satisfied() ? pass(failed, { retry: false }) : undefined;
        }
        await pass(orderDepartments(needed, departments, departmentFor), { retry: true });
        state.settled = true;
        state.department = '';
        const missing = missingFrom(needed, state.sections);
        const status = state.cancelled && !state.scanned ? 'failed' : missing.length || state.errors.length ? 'partial' : 'complete';
        report({ status, done: true });
        return { status, scanned: state.scanned, total: state.total, sections: collected, errors: state.errors, missing: missing.map(course => course.code) };
      })();
      current = state;
      return state.promise;
    }
    function cancel() { if (current) current.cancelled = true; }
    return { collect, cancel };
  }
  const api = { createCollector, orderDepartments, missingFrom };
  root.AisisOfferings = api;
  if (typeof module !== 'undefined') module.exports = api;
})(globalThis);
