(function (root) {
  'use strict';
  const P = root.AisisPlan;
  const SLOT = 15, SLOT_HEIGHT = 11;
  // Muted fills that sit beside the AISIS table palette without competing with
  // the navy link colour used for text inside each block.
  const FILLS = ['#dfe4f3', '#dfece9', '#efe6f1', '#e9eddc', '#f2e6e0', '#dee9f0', '#eae5da'];
  const styles = `
    .planner-summary{display:flex;flex-wrap:wrap;gap:8px 18px;align-items:baseline;margin:0 0 10px}
    .planner-summary b{color:#000080}.planner-summary .flag{color:#7d2020}
    .week-wrap{border:1px solid #929fc8;overflow:auto;overscroll-behavior:contain;max-height:52vh;background:#fff}
    .week{display:grid;grid-template-columns:46px repeat(var(--days),minmax(74px,1fr));grid-template-rows:auto repeat(var(--slots),${SLOT_HEIGHT}px);font-size:11px;line-height:1.3}
    .week-corner,.week-day{background:#b0bcdf;color:#000080;font-weight:bold;text-align:center;padding:4px 2px;position:sticky;top:0;z-index:2;border-bottom:1px solid #929fc8}
    .week-corner{grid-column:1;left:0;z-index:3}
    .week-hour{grid-column:1;text-align:right;padding-right:5px;color:#555;font-size:10px;border-top:1px solid #d7d7d7;background:#fff;position:sticky;left:0;z-index:1}
    .week-line{border-top:1px solid #e3e3e3;border-left:1px solid #e3e3e3}
    .week-block{border:1px solid #929fc8;border-left:4px solid #000080;padding:2px 4px;overflow:hidden;color:#000;min-width:0}
    .week-block b{display:block;color:#000080;font-size:11px;overflow-wrap:anywhere}
    .week-block span{display:block;color:#444;font-size:10px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .week-block.clash{border-color:#b98f8f;border-left-color:#7d2020;background:#fff4f4!important}
    .week-empty{padding:18px;text-align:center;color:#555}
    .pick-wrap{overflow-x:auto}
    .pick-list{width:100%;border-collapse:collapse;font-size:12px}
    .pick-list th{background:#b0bcdf;color:#000080;text-align:left;padding:5px 6px;font-weight:bold;white-space:nowrap}
    .pick-list td{padding:5px 6px;border-bottom:1px solid #ddd;vertical-align:top}
    .pick-list tr.clash td{background:#fff4f4}
    .pick-list .swatch{display:inline-block;width:9px;height:9px;border:1px solid #929fc8;margin-right:5px;vertical-align:baseline}
    .pick-list .numeric{text-align:right;white-space:nowrap}
    .note{font-size:11px;color:#555;margin:6px 0 0}.note.flag{color:#7d2020}
    .remaining-list{list-style:none;margin:0;padding:0;font-size:12px}
    .remaining-list li{display:flex;flex-wrap:wrap;gap:4px 12px;justify-content:space-between;padding:6px 0;border-bottom:1px solid #eee}
    .remaining-list li:last-child{border-bottom:0}
    .remaining-list .tag{color:#555;font-size:11px}.remaining-list .done{color:#000080;font-weight:bold}
  `;
  const el = (tag, text, className) => {
    const node = document.createElement(tag);
    if (text != null) node.textContent = text;
    if (className) node.className = className;
    return node;
  };
  function colorFor(course) {
    const key = P.courseKey(course);
    let hash = 0;
    for (const character of key) hash = (hash * 31 + character.charCodeAt(0)) % 9973;
    return FILLS[hash % FILLS.length];
  }
  // Sections that overlap on the same day share the day column side by side so
  // a conflict stays readable instead of hiding one of the two blocks.
  function layout(items) {
    const ordered = [...items].sort((a, b) => a.start - b.start || a.end - b.end);
    const ends = [];
    for (const item of ordered) {
      let column = ends.findIndex(end => end <= item.start);
      if (column < 0) { column = ends.length; ends.push(0); }
      ends[column] = item.end;
      item.column = column;
    }
    for (const item of ordered) item.columns = ends.length;
    return ordered;
  }
  function grid(picks, { clashing = new Set() } = {}) {
    const wrap = el('div', null, 'week-wrap');
    const scheduled = picks.filter(pick => P.meetingsOf(pick).length);
    if (!scheduled.length) {
      wrap.append(el('p', picks.length ? 'Every section in this draft has a TBA or arranged meeting time.' : 'No sections in this draft yet.', 'week-empty'));
      return wrap;
    }
    const days = P.usedDays(scheduled);
    const { start, end } = P.gridBounds(scheduled);
    const week = el('div', null, 'week');
    week.style.setProperty('--days', days.length);
    week.style.setProperty('--slots', (end - start) / SLOT);
    const rowOf = minutes => 2 + Math.round((minutes - start) / SLOT);
    week.append(el('div', '', 'week-corner'));
    for (const day of days) week.append(el('div', P.DAY_NAMES[day], 'week-day'));
    for (let minutes = start; minutes < end; minutes += 60) {
      const hour = el('div', P.timeLabel(minutes), 'week-hour');
      hour.style.gridRow = `${rowOf(minutes)} / span ${60 / SLOT}`;
      week.append(hour);
      for (let index = 0; index < days.length; index++) {
        const line = el('div', null, 'week-line');
        line.style.gridColumn = String(index + 2);
        line.style.gridRow = `${rowOf(minutes)} / span ${60 / SLOT}`;
        week.append(line);
      }
    }
    for (const [index, day] of days.entries()) {
      const items = scheduled.flatMap(pick => P.meetingsOf(pick).filter(meeting => meeting.day === day).map(meeting => ({ ...meeting, pick })));
      for (const item of layout(items)) {
        const block = el('div', null, `week-block${clashing.has(P.sectionKey(item.pick)) ? ' clash' : ''}`);
        block.style.gridColumn = String(index + 2);
        block.style.gridRow = `${rowOf(item.start)} / span ${Math.max(1, Math.round((item.end - item.start) / SLOT))}`;
        block.style.background = colorFor(item.pick.course);
        block.style.width = `calc(100% / ${item.columns})`;
        block.style.marginLeft = `calc(${item.column} * 100% / ${item.columns})`;
        block.append(el('b', `${item.pick.course} ${item.pick.section}`.trim()));
        block.append(el('span', `${P.timeLabel(item.start)}–${P.timeLabel(item.end)}`));
        if (P.clean(item.pick.room)) block.append(el('span', P.clean(item.pick.room)));
        block.title = [`${item.pick.course} ${item.pick.section}`, P.clean(item.pick.title), P.meetingLabel(item.pick), P.clean(item.pick.room), P.clean(item.pick.instructors)].filter(Boolean).join('\n');
        week.append(block);
      }
    }
    wrap.append(week);
    return wrap;
  }
  function pickTable(picks, { onRemove, clashing = new Set() } = {}) {
    const table = el('table', null, 'pick-list');
    const head = el('thead'), headRow = el('tr');
    for (const [label, className] of [['Course'], ['Section'], ['Units', 'numeric'], ['Time'], ['Room'], ['Instructor'], ['', 'numeric']]) headRow.append(el('th', label, className));
    head.append(headRow);
    const body = el('tbody');
    for (const pick of P.sortPicks(picks)) {
      const row = el('tr', null, clashing.has(P.sectionKey(pick)) ? 'clash' : '');
      const course = el('td');
      const swatch = el('span', '', 'swatch');
      swatch.style.background = colorFor(pick.course);
      course.append(swatch, document.createTextNode(pick.course));
      course.title = P.clean(pick.title);
      row.append(course, el('td', P.clean(pick.section)), el('td', String(pick.units || ''), 'numeric'),
        el('td', P.meetingLabel(pick) || 'TBA'), el('td', P.clean(pick.room) || 'TBA'), el('td', P.clean(pick.instructors)));
      const actions = el('td', null, 'numeric');
      if (onRemove) {
        const remove = el('button', 'Remove', 'quiet');
        remove.type = 'button';
        remove.setAttribute('aria-label', `Remove ${pick.course} section ${pick.section} from this draft`);
        remove.addEventListener('click', () => onRemove(pick));
        actions.append(remove);
      }
      row.append(actions);
      body.append(row);
    }
    table.append(head, body);
    // A narrow dialog scrolls the table sideways rather than the whole page.
    const wrap = el('div', null, 'pick-wrap');
    wrap.append(table);
    return wrap;
  }
  function summary(draft, { term } = {}) {
    const picks = draft.picks;
    const clashes = P.conflicts(picks), repeats = P.duplicates(picks);
    const line = el('p', null, 'planner-summary');
    const add = (label, value, flag) => {
      const holder = el('span', `${label}: `);
      holder.append(el('b', value));
      if (flag) holder.className = 'flag';
      line.append(holder);
    };
    add('Courses', String(picks.length));
    add('Units', String(P.totalUnits(picks)));
    add('Conflicts', String(clashes.length), clashes.length > 0);
    if (repeats.length) add('Repeated courses', String(repeats.length), true);
    if (term) line.append(el('span', P.termLabel(term), 'note'));
    return { element: line, clashes, repeats };
  }
  function clashingKeys(picks) {
    const keys = new Set();
    for (const entry of P.conflicts(picks)) { keys.add(P.sectionKey(entry.a)); keys.add(P.sectionKey(entry.b)); }
    return keys;
  }
  const api = { styles, el, colorFor, grid, pickTable, summary, clashingKeys, SLOT, SLOT_HEIGHT };
  root.AisisPlanUi = api;
  if (typeof module !== 'undefined') module.exports = api;
})(globalThis);
