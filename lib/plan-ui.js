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
    .week{display:grid;grid-template-columns:52px repeat(var(--days),minmax(96px,1fr));grid-template-rows:auto repeat(var(--slots),var(--slot-height,${SLOT_HEIGHT}px));font-size:11px;line-height:1.25}
    .week-corner,.week-day{background:#b0bcdf;color:#000080;font-weight:bold;text-align:center;padding:4px 2px;position:sticky;top:0;z-index:2;border-bottom:1px solid #929fc8}
    .week-corner{grid-column:1;left:0;z-index:3}
    .week-hour{grid-column:1;text-align:right;padding-right:5px;color:#555;font-size:10px;border-top:1px solid #d7d7d7;background:#fff;position:sticky;left:0;z-index:1}
    .week-line{border-top:1px solid #e3e3e3;border-left:1px solid #e3e3e3}
    .week-block{border:1px solid #929fc8;border-left:4px solid #000080;padding:2px 4px;overflow:hidden;color:#000;min-width:0}
    .week-block b{display:block;color:#000080;font-size:11px;overflow-wrap:anywhere}
    .week-block .name{color:#222;font-size:10px;overflow-wrap:anywhere;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
    .week-block span{display:block;color:#444;font-size:10px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .week-block.clash{border-color:#b98f8f;border-left-color:#7d2020;background:#fff4f4!important}
    .week-block.planned{border-style:dashed;border-left-style:solid}
    .week-empty{padding:18px;text-align:center;color:#555}
    .pick-wrap{overflow-x:auto}
    .pick-list{width:100%;border-collapse:collapse;font-size:12px}
    .pick-list th{background:#b0bcdf;color:#000080;text-align:left;padding:5px 6px;font-weight:bold;white-space:nowrap}
    .pick-list td{padding:5px 6px;border-bottom:1px solid #ddd;vertical-align:top}
    .pick-list tr.clash td{background:#fff4f4}
    .pick-list .title{color:#333}.pick-list .planned{color:#000080;font-size:11px}
    .pick-list .swatch{display:inline-block;width:9px;height:9px;border:1px solid #929fc8;margin-right:5px;vertical-align:baseline}
    .pick-list .numeric{text-align:right;white-space:nowrap}
    .note{font-size:11px;color:#555;margin:6px 0 0}.note.flag{color:#7d2020}
    .remaining-list{list-style:none;margin:0;padding:0;font-size:12px}
    .remaining-list li{display:flex;flex-wrap:wrap;gap:4px 12px;justify-content:space-between;padding:6px 0;border-bottom:1px solid #eee}
    .remaining-list li:last-child{border-bottom:0}
    .remaining-list .tag{color:#555;font-size:11px}.remaining-list .done{color:#000080;font-weight:bold}
    .suggest-course{border-top:1px solid #ccc;padding:9px 0}.suggest-course:first-child{border-top:0}
    .suggest-head{display:flex;flex-wrap:wrap;gap:2px 12px;justify-content:space-between;align-items:baseline;margin-bottom:4px}
    .suggest-head b{color:#000080;font-size:13px}.suggest-head .tag{color:#555;font-size:11px}.suggest-head .done{color:#000080;font-weight:bold;font-size:11px}
    .offer{display:flex;gap:10px;justify-content:space-between;align-items:center;padding:5px 0 5px 10px;border-left:3px solid #dfe4f3}
    .offer+.offer{border-top:1px solid #f0f0f0}.offer.picked{background:#f4f6fc;border-left-color:#000080}.offer.clash{border-left-color:#b98f8f}
    .offer-main{display:grid;gap:1px;min-width:0}.offer-main b{color:#000080;font-size:12px}
    .offer-time{font-size:12px}.offer-meta{font-size:11px;color:#555;overflow-wrap:anywhere}.offer-meta.flag{color:#7d2020}
    .suggest-empty{font-size:12px;color:#555;padding:2px 0 2px 10px}
    .suggest-other{margin-top:12px}.suggest-other>summary{color:#000080;font-size:12px;cursor:pointer}
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
    const spans = (end - start) / SLOT;
    week.style.setProperty('--days', days.length);
    week.style.setProperty('--slots', spans);
    // A twelve-hour day would otherwise be drawn at the row height of a
    // four-hour one and run far past the bottom of the screen.
    week.style.setProperty('--slot-height', `${Math.max(8, Math.min(18, Math.round(560 / spans)))}px`);
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
        const block = el('div', null, `week-block${clashing.has(P.sectionKey(item.pick)) ? ' clash' : ''}${P.isCustom(item.pick) ? ' planned' : ''}`);
        block.style.gridColumn = String(index + 2);
        block.style.gridRow = `${rowOf(item.start)} / span ${Math.max(1, Math.round((item.end - item.start) / SLOT))}`;
        block.style.background = colorFor(item.pick.course);
        block.style.width = `calc(100% / ${item.columns})`;
        block.style.marginLeft = `calc(${item.column} * 100% / ${item.columns})`;
        block.append(el('b', `${item.pick.course} ${item.pick.section}`.trim()));
        if (P.clean(item.pick.title)) block.append(el('div', P.clean(item.pick.title), 'name'));
        block.append(el('span', `${P.timeLabel(item.start)}–${P.timeLabel(item.end)}`));
        if (P.clean(item.pick.room)) block.append(el('span', P.clean(item.pick.room)));
        if (P.isCustom(item.pick)) block.append(el('span', 'planned block'));
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
    for (const [label, className] of [['Course'], ['Course title'], ['Section'], ['Units', 'numeric'], ['Time'], ['Room'], ['Instructor'], ['', 'numeric']]) headRow.append(el('th', label, className));
    head.append(headRow);
    const body = el('tbody');
    for (const pick of P.sortPicks(picks)) {
      const row = el('tr', null, clashing.has(P.sectionKey(pick)) ? 'clash' : '');
      const course = el('td');
      const swatch = el('span', '', 'swatch');
      swatch.style.background = colorFor(pick.course);
      course.append(swatch, document.createTextNode(pick.course));
      course.title = P.clean(pick.title);
      const title = el('td', null, 'title');
      title.append(document.createTextNode(P.clean(pick.title) || '—'));
      if (P.isCustom(pick)) title.append(el('div', 'Planned block, not an AISIS section', 'planned'));
      row.append(course, title, el('td', P.clean(pick.section)), el('td', String(pick.units || ''), 'numeric'),
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
  function clashesWith(section, picks) {
    const own = P.meetingsOf(section);
    return picks.some(pick => P.sectionKey(pick) !== P.sectionKey(section)
      && P.meetingsOf(pick).some(other => own.some(mine => mine.day === other.day && mine.start < other.end && other.start < mine.end)));
  }
  function offerRow(section, { picks, onToggle }) {
    const inDraft = picks.some(pick => P.sectionKey(pick) === P.sectionKey(section));
    const clash = !inDraft && clashesWith(section, picks);
    const row = el('div', null, `offer${inDraft ? ' picked' : ''}${clash ? ' clash' : ''}`);
    const main = el('div', null, 'offer-main');
    main.append(el('b', `Section ${P.clean(section.section) || '—'}`));
    main.append(el('span', P.meetingLabel(section) || 'TBA', 'offer-time'));
    main.append(el('span', [P.clean(section.room) || 'Room TBA', P.clean(section.instructors) || 'Instructor TBA'].join(' · '), 'offer-meta'));
    const free = Number.parseInt(section.freeSlots, 10);
    const notes = [];
    if (Number.isFinite(free)) notes.push(free > 0 ? `${free} free slot${free === 1 ? '' : 's'}` : free === 0 ? 'no free slots' : `over capacity (${free})`);
    if (clash) notes.push('clashes with this draft');
    if (notes.length) main.append(el('span', notes.join(' · '), `offer-meta${clash || (Number.isFinite(free) && free <= 0) ? ' flag' : ''}`));
    row.append(main);
    const action = el('button', inDraft ? 'Remove' : 'Add', 'quiet');
    action.type = 'button';
    action.setAttribute('aria-label', `${inDraft ? 'Remove' : 'Add'} ${section.course} section ${section.section}`);
    action.addEventListener('click', () => onToggle(section));
    row.append(action);
    return row;
  }
  const VISIBLE_OFFERINGS = 4;
  function courseBlock(entry, { picks, onToggle, searching, onPlan }) {
    const holder = el('div', null, 'suggest-course');
    const head = el('div', null, 'suggest-head');
    const inDraft = section => picks.some(pick => P.sectionKey(pick) === P.sectionKey(section));
    const picked = picks.some(pick => P.matchRemaining(pick.course, [entry.course]));
    const name = P.titleFor(entry.course.code, entry.offerings);
    head.append(el('b', name ? `${entry.course.code} · ${name}` : entry.course.code));
    head.append(el('span', [`${entry.course.units} units`, entry.course.categoryLabel, P.programTag(entry.course)].filter(Boolean).join(' · '), 'tag'));
    if (picked) head.append(el('span', '✓ in draft', 'done'));
    holder.append(head);
    if (!entry.offerings.length) {
      const empty = el('div', null, 'suggest-empty');
      empty.append(el('span', searching ? 'Looking for sections…' : 'No section is offered this term.'));
      if (!searching && onPlan) {
        const plan = el('button', 'Add a planned time', 'quiet');
        plan.type = 'button';
        plan.style.marginLeft = '10px';
        plan.addEventListener('click', () => onPlan(entry.course));
        empty.append(plan);
      }
      holder.append(empty);
      return holder;
    }
    // A course with many sections, such as a thesis, would otherwise bury the
    // rest of the program, so only the first few stay open.
    const ordered = [...entry.offerings].sort((a, b) => inDraft(b) - inDraft(a));
    const hidden = [];
    for (const [index, section] of ordered.entries()) {
      const row = offerRow(section, { picks, onToggle });
      if (index >= VISIBLE_OFFERINGS && !inDraft(section)) { row.hidden = true; hidden.push(row); }
      holder.append(row);
    }
    if (hidden.length) {
      const label = `Show all ${ordered.length} sections`;
      const more = el('button', label, 'quiet');
      more.type = 'button';
      more.addEventListener('click', () => {
        const expanding = hidden[0].hidden;
        for (const row of hidden) row.hidden = !expanding;
        more.textContent = expanding ? 'Show fewer sections' : label;
        more.setAttribute('aria-expanded', String(expanding));
      });
      more.setAttribute('aria-expanded', 'false');
      holder.append(more);
    }
    return holder;
  }
  // The planner's main surface: what the program still needs for the chosen
  // term, and every section of it found in that term's listings.
  function suggestionPanel({ remaining, sections, term, picks = [], onToggle, onPlan, searching = false }) {
    const wrap = el('div', null, 'suggest');
    const groups = P.suggestions(remaining, sections, term);
    if (!remaining.length) {
      wrap.append(el('p', 'Your program of study lists no courses as still not taken.', 'muted'));
      return wrap;
    }
    if (groups.due.length) {
      for (const entry of groups.due) wrap.append(courseBlock(entry, { picks, onToggle, searching, onPlan }));
    } else {
      wrap.append(el('p', 'Your program files no remaining course under this semester. The courses still not taken are listed below.', 'muted'));
    }
    if (groups.other.length) {
      const other = el('details', null, 'suggest-other');
      other.append(el('summary', `${groups.other.length} more course${groups.other.length === 1 ? '' : 's'} not yet taken, filed under another semester`));
      other.open = !groups.due.length;
      for (const entry of groups.other) other.append(courseBlock(entry, { picks, onToggle, searching, onPlan }));
      wrap.append(other);
    }
    return wrap;
  }
  // The grid drawn again on a canvas, so a draft can be saved or sent as a
  // picture. Drawing it directly keeps the export free of page styling and of
  // any dependency on rasterising live DOM.
  function gridImage(picks, { term = '', name = '', scale = 2 } = {}) {
    const scheduled = (picks || []).filter(pick => P.meetingsOf(pick).length);
    const days = P.usedDays(scheduled);
    const { start, end } = P.gridBounds(scheduled);
    const hours = (end - start) / 60;
    const pad = 18, titleH = name || term ? 48 : 12, headH = 26, gutter = 54, colW = 168, hourH = 62;
    const width = pad * 2 + gutter + days.length * colW;
    const height = pad * 2 + titleH + headH + hours * hourH + 20;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    const ctx = canvas.getContext('2d');
    ctx.scale(scale, scale);
    const font = (size, weight = '') => `${weight} ${size}px Arial, Helvetica, sans-serif`.trim();
    const clip = (text, max) => {
      if (ctx.measureText(text).width <= max) return text;
      let cut = text;
      while (cut.length > 1 && ctx.measureText(cut + '…').width > max) cut = cut.slice(0, -1);
      return cut + '…';
    };
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, width, height);
    let y = pad;
    if (titleH > 12) {
      ctx.fillStyle = '#000080';
      ctx.font = font(17, 'bold');
      ctx.fillText(name || 'Draft schedule', pad, y + 16);
      ctx.fillStyle = '#555';
      ctx.font = font(12);
      ctx.fillText([P.termLabel(term), `${scheduled.length} of ${(picks || []).length} sections shown`, `${P.totalUnits(picks)} units`].filter(Boolean).join('  ·  '), pad, y + 34);
      y += titleH;
    }
    const gridTop = y + headH;
    const rowY = minutes => gridTop + ((minutes - start) / 60) * hourH;
    ctx.fillStyle = '#b0bcdf';
    ctx.fillRect(pad, y, gutter + days.length * colW, headH);
    ctx.fillStyle = '#000080';
    ctx.font = font(12, 'bold');
    ctx.textAlign = 'center';
    for (const [index, day] of days.entries()) ctx.fillText(P.DAY_NAMES[day], pad + gutter + index * colW + colW / 2, y + 17);
    ctx.textAlign = 'left';
    ctx.strokeStyle = '#d7d7d7';
    ctx.lineWidth = 1;
    for (let minutes = start; minutes <= end; minutes += 60) {
      const lineY = Math.round(rowY(minutes)) + 0.5;
      ctx.beginPath();
      ctx.moveTo(pad, lineY);
      ctx.lineTo(pad + gutter + days.length * colW, lineY);
      ctx.stroke();
      if (minutes < end) {
        ctx.fillStyle = '#555';
        ctx.font = font(11);
        ctx.fillText(P.timeLabel(minutes), pad + 6, rowY(minutes) + 14);
      }
    }
    ctx.strokeStyle = '#e3e3e3';
    for (let index = 0; index <= days.length; index++) {
      const lineX = Math.round(pad + gutter + index * colW) + 0.5;
      ctx.beginPath();
      ctx.moveTo(lineX, gridTop);
      ctx.lineTo(lineX, rowY(end));
      ctx.stroke();
    }
    const clashing = clashingKeys(picks);
    for (const [index, day] of days.entries()) {
      const items = scheduled.flatMap(pick => P.meetingsOf(pick).filter(meeting => meeting.day === day).map(meeting => ({ ...meeting, pick })));
      for (const item of layout(items)) {
        const slotW = colW / item.columns;
        const x = pad + gutter + index * colW + item.column * slotW + 2;
        const top = rowY(item.start) + 2;
        const boxW = slotW - 4, boxH = Math.max(18, rowY(item.end) - rowY(item.start) - 4);
        const clash = clashing.has(P.sectionKey(item.pick));
        ctx.fillStyle = clash ? '#fff4f4' : colorFor(item.pick.course);
        ctx.fillRect(x, top, boxW, boxH);
        ctx.strokeStyle = clash ? '#b98f8f' : '#929fc8';
        ctx.strokeRect(Math.round(x) + 0.5, Math.round(top) + 0.5, Math.round(boxW), Math.round(boxH));
        ctx.fillStyle = clash ? '#7d2020' : '#000080';
        ctx.fillRect(x, top, 4, boxH);
        let textY = top + 14;
        const room = boxW - 12;
        ctx.fillStyle = '#000080';
        ctx.font = font(12, 'bold');
        ctx.fillText(clip(`${item.pick.course} ${item.pick.section}`.trim(), room), x + 8, textY);
        ctx.fillStyle = '#333';
        ctx.font = font(10);
        if (P.clean(item.pick.title) && boxH > 30) ctx.fillText(clip(P.clean(item.pick.title), room), x + 8, textY += 13);
        ctx.fillStyle = '#555';
        if (boxH > 44) ctx.fillText(`${P.timeLabel(item.start)}–${P.timeLabel(item.end)}`, x + 8, textY += 12);
        if (P.clean(item.pick.room) && boxH > 56) ctx.fillText(clip(P.clean(item.pick.room), room), x + 8, textY += 12);
        if (P.isCustom(item.pick) && boxH > 68) ctx.fillText('planned block', x + 8, textY += 12);
      }
    }
    const arranged = (picks || []).filter(pick => !P.meetingsOf(pick).length);
    if (arranged.length) {
      ctx.fillStyle = '#555';
      ctx.font = font(11);
      ctx.fillText(clip(`By arrangement: ${arranged.map(pick => `${pick.course} ${pick.section}`).join(', ')}`, width - pad * 2), pad, rowY(end) + 15);
    }
    return canvas;
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
  const api = { styles, el, colorFor, grid, gridImage, pickTable, summary, clashingKeys, clashesWith, offerRow, suggestionPanel, SLOT, SLOT_HEIGHT };
  root.AisisPlanUi = api;
  if (typeof module !== 'undefined') module.exports = api;
})(globalThis);
