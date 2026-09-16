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
  function createCollector({ load, departmentFor = () => '', concurrency = 2, failureLimit = 3 } = {}) {
    let current = null;
    function collect({ term, departments, needed, known = [], onProgress } = {}) {
      if (current && current.term === term && !current.settled) return current.promise;
      if (current) current.cancelled = true;
      const state = {
        term, cancelled: false, settled: false, scanned: 0, failures: 0,
        total: departments.length, sections: [...known], department: ''
      };
      const report = extra => onProgress?.({
        term, scanned: state.scanned, total: state.total, department: state.department,
        missing: missingFrom(needed, state.sections).map(course => course.code), ...extra
      });
      const queue = orderDepartments(needed, departments, departmentFor);
      state.promise = (async () => {
        const results = [];
        const pending = [...queue];
        const worker = async () => {
          while (pending.length && !state.cancelled) {
            if (needed.length && !missingFrom(needed, state.sections).length) break;
            const code = pending.shift();
            state.department = code;
            report();
            try {
              const sections = await load(term, code);
              state.scanned++;
              state.sections = state.sections.concat(sections);
              results.push(...sections);
              report({ sections });
            } catch (error) {
              state.failures++;
              // Repeated failures mean a signed-out session, not a bad code.
              if (state.failures >= failureLimit) { state.cancelled = true; state.error = error; break; }
            }
          }
        };
        await Promise.all(Array.from({ length: Math.max(1, Math.min(concurrency, pending.length || 1)) }, worker));
        state.settled = true;
        state.department = '';
        const missing = missingFrom(needed, state.sections);
        const status = state.error ? 'failed' : missing.length ? 'partial' : 'complete';
        report({ status, done: true });
        return { status, scanned: state.scanned, total: state.total, sections: results, missing: missing.map(course => course.code) };
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
