// All schedules, names, profiles and responses in this check are synthetic.
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
(async () => {
 const extension = path.resolve('.');
 const context = await chromium.launchPersistentContext('', {channel:'chromium',headless:true,viewport:{width:1000,height:700},args:[`--disable-extensions-except=${extension}`,`--load-extension=${extension}`]});
 try {
 const schedule = `<style>body{font:12px Arial}td{padding:8px}</style><form action="https://aisis.ateneo.edu/j_aisis/J_VCSC.do" method="post"><select name="applicablePeriod"><option value="2026-1">2026-1</option></select><select name="deptCode"><option value="DISCS">DISCS</option><option value="SOCSCI">SOCSCI</option><option value="OTHER">OTHER</option></select><select name="subjCode"><option value="ALL">ALL</option></select></form><table><tr><td>Subject Code</td><td>Section</td><td>Course Title</td><td>Units</td><td>Time</td><td>Room</td><td>Instructor</td><td>Max No</td><td>Lang</td><td>Level</td><td>Free Slots</td><td>Remarks</td></tr><tr><td>CSCI 21</td><td>A</td><td>Sample Course</td><td>3</td><td>T-F 0930-1100(FULLY ONSITE)</td><td>Sample Room</td><td>EXAMPLE, ALEXANDER E.</td><td>30</td><td>ENG</td><td>U</td><td>5</td><td>Synthetic remark.</td></tr></table>`;
 // Synthetic program of study: the listed course is still marked not yet taken.
 const program = `<table><tr><td>Total Units</td><td>Units Taken</td><td>Remaining Units</td></tr><tr><td>120</td><td>90</td><td>30</td></tr><tr><td>Fourth Year</td></tr><tr><td>First Semester</td></tr><tr><td><a title="NOT YET TAKEN">N</a></td><td>CSCI 21</td><td>3</td><td><a title="MAJOR">M</a></td><td>Y</td><td>N</td></tr><tr><td><a title="NOT YET TAKEN">N</a></td><td>STS 10</td><td>3</td><td><a title="CORE">C</a></td><td>Y</td><td>N</td></tr></table>`;
 // STS 10 sits outside DISCS, so the planner must sweep another department for it.
 const socsci = schedule.replace('<option value="DISCS">DISCS</option>','<option value="SOCSCI">SOCSCI</option>').replace('CSCI 21','STS 10').replace('Sample Course','Science, Technology and Society').replace('T-F 0930-1100','W 1300-1600');
 const empty = schedule.replace('<option value="DISCS">DISCS</option>','<option value="OTHER">OTHER</option>').replace(/<table>[\s\S]*<\/table>/,'<p>No classes found.</p>');
 const posted = [];
 const payload={professor:{id:1,slug:'example-alexander',display_name:'Example, Alexander E.'},stat:{professor_id:1,score:3,comment_count:2},comment:[{id:1,professor_id:1,body:'Synthetic review for another course.',title:'Other course',course_id:2,rating:2},{id:2,professor_id:1,body:'Synthetic matching review. '.repeat(30),title:'Matching course',course_id:3,rating:4}],courses:[{id:2,course_code:'CSCI 20'},{id:3,course_code:'CSCI 21'}]};
 const profile=`<script>self.__next_f.push(${JSON.stringify([1,`0:${JSON.stringify(payload)}\n`])})</script>`;
 await context.route('https://profstopick.com/**',r=>r.fulfill({contentType:'text/html',body:profile}));
 let native=false;
 await context.route('https://aisis.ateneo.edu/**',r=>{
  if(r.request().url().includes('/syllabi/'))return r.fulfill({contentType:r.request().method()==='HEAD'?'application/pdf':'text/plain',body:r.request().method()==='HEAD'?'':'Synthetic PDF navigation fixture'});
  if(r.request().url().includes('J_VIPS.do'))return r.fulfill({contentType:'text/html',body:program});
  if(r.request().url().includes('welcome.do'))return r.fulfill({contentType:'text/html',body:'<table><tr><td>Site Map</td></tr><tr><td align="right">CLASS SCHEDULE</td><td>View the schedule of all classes being offered</td></tr></table>'});
  if(r.request().method()==='POST'){
   const code=new URLSearchParams(r.request().postData()||'').get('deptCode');
   posted.push(code);
   return r.fulfill({contentType:'text/html',body:code==='DISCS'?schedule:code==='SOCSCI'?socsci:empty});
  }
  return r.fulfill({contentType:'text/html',body:native?schedule.replace('</table>','<tr><td>View class syllabus</td></tr></table>'):schedule});
 });
 const worker0=context.serviceWorkers()[0]||await context.waitForEvent('serviceworker');
 const page=await context.newPage(); const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('https://aisis.ateneo.edu/j_aisis/J_VCSC.do');
 const syllabus=page.getByRole('link',{name:'Syllabus',exact:true});await syllabus.waitFor();
 const [pdf]=await Promise.all([page.waitForEvent('popup'),syllabus.click()]);await pdf.waitForLoadState();assert.match(pdf.url(),/EXAMPLE_A-A-2026-1.pdf$/);await pdf.close();
 await page.getByRole('button',{name:'Prof reviews'}).click();const dialog=page.getByRole('dialog');await dialog.locator('article').first().waitFor();
 assert.equal(await dialog.locator('article h3').first().textContent(),'Matching course');
 await dialog.getByLabel('Show reviews').selectOption('course');assert.equal(await dialog.locator('article').count(),1);
 await dialog.getByRole('button',{name:'Read full review'}).click();assert.equal(await dialog.getByRole('button',{name:'Show less'}).getAttribute('aria-expanded'),'true');
 await page.setViewportSize({width:320,height:640});assert.equal(await dialog.locator('.content').evaluate(e=>e.scrollWidth<=e.clientWidth),true);await page.keyboard.press('Escape');

 // Schedule planner: program matching, the draft bar, the weekly grid and the planner tab.
 await page.getByText('In your program', {exact:false}).first().waitFor();
 await page.getByRole('button',{name:'Add to plan'}).click();
 await page.getByText('1 course · 3 units').waitFor();
 // Opening the planner sweeps departments for the courses the program needs.
 await page.getByRole('button',{name:'Plan my schedule'}).click();
 const draft=page.getByRole('dialog');
 await draft.locator('.week-block').first().waitFor();
 await page.waitForFunction(()=>{
  const bar=document.querySelector('[data-companion-bar]');
  return bar&&!/Finding sections/.test(bar.shadowRoot.textContent);
 },null,{timeout:30000});
 await page.waitForTimeout(600);
 assert.ok(posted.includes('DISCS')&&posted.includes('SOCSCI'),'swept '+posted.join(','));
 assert.equal(await draft.locator('.week-block').count(),2);
 assert.equal(await draft.locator('.pick-list tbody tr').count(),1);
 const suggested=await draft.locator('.suggest-course').allTextContents();
 assert.ok(suggested.some(t=>/CSCI 21/.test(t)&&/in draft/.test(t)),suggested.join(' // '));
 const sts=suggested.find(t=>/STS 10/.test(t));
 assert.ok(sts,'STS 10 was not suggested: '+suggested.join(' // '));
 assert.match(sts,/Wed 13:00/);assert.match(sts,/Sample Room/);
 await draft.locator('.suggest-course').filter({hasText:'STS 10'}).locator('.offer button').first().click();
 await page.waitForTimeout(500);
 assert.equal(await page.getByRole('dialog').locator('.week-block').count(),3);
 await page.keyboard.press('Escape');
 // The per-course popup lists every section of one course against the draft.
 await page.getByRole('button',{name:'Plan course'}).first().click();
 const course=page.getByRole('dialog');
 await course.locator('.offer').first().waitFor();
 assert.match(await course.locator('.match-note').textContent(),/still needs CSCI 21/);
 await page.keyboard.press('Escape');
 const planner=await context.newPage();
 await planner.goto(new URL('planner.html?term=2026-1',worker0.url()).href);
 await planner.locator('.week-block').first().waitFor();
 assert.match(await planner.locator('#subtitle').textContent(),/First Semester, SY 2026-2027/);
 assert.equal(await planner.locator('.pick-list tbody tr').count(),2);
 assert.match(await planner.locator('#summary').textContent(),/Units: 6/);
 assert.match(await planner.locator('#suggestHeading').textContent(),/First Semester, SY 2026-2027/);
 // The planner tab reads AISIS itself rather than relying on a schedule tab.
 await planner.waitForFunction(()=>/Read \d+ of|already collected/.test(document.getElementById('progress').textContent),null,{timeout:30000});
 assert.equal(await planner.locator('#notice').evaluate(n=>n.hidden),true);
 assert.equal(await planner.locator('#term option').count(),1);
 assert.ok((await planner.locator('.suggest-course').allTextContents()).some(t=>/STS 10/.test(t)));
 await planner.locator('#search').fill('CSCI');
 await planner.locator('.result').first().waitFor();
 assert.match(await planner.locator('.result').first().textContent(),/CSCI 21 A/);
 await planner.locator('.result button').first().click();
 await planner.waitForTimeout(500);
 assert.match(await planner.locator('#summary').textContent(),/Courses: 1/);
 await planner.close();
 // The AISIS home page links to the planner.
 const home=await context.newPage();
 await home.goto('https://aisis.ateneo.edu/j_aisis/welcome.do');
 await home.locator('[data-companion-home]').waitFor();
 const [fromHome]=await Promise.all([context.waitForEvent('page'),home.getByText('MY DRAFT SCHEDULES').click()]);
 assert.ok(fromHome.url().includes('planner.html'));
 await fromHome.close();await home.close();
 // Toggling a tool off in the popup removes it from an open AISIS page.
 const popup=await context.newPage();
 await popup.goto(new URL('popup.html',worker0.url()).href);
 await popup.locator('#reviews').uncheck();
 await popup.getByText('Turned off: Prof reviews.').waitFor();
 await page.bringToFront();
 await page.getByRole('button',{name:'Prof reviews'}).waitFor({state:'detached'});
 assert.ok(await page.getByRole('link',{name:'Syllabus',exact:true}).count()>0);
 await popup.locator('#reviews').check();
 await popup.getByText('All tools are on.').waitFor();
 await popup.close();
 for(const endpoint of ['J_VCEC.do','J_VMCS.do']){await page.goto(`https://aisis.ateneo.edu/j_aisis/${endpoint}`);await page.waitForTimeout(250);assert.equal(await page.locator('[data-companion-cell]').count(),0);}
 native=true;await page.goto('https://aisis.ateneo.edu/j_aisis/J_VCSC.do');await page.waitForTimeout(250);assert.equal(await page.locator('[data-companion-cell]').count(),0);
 const worker=context.serviceWorkers()[0];assert.ok(worker);const manifest=await worker.evaluate(()=>chrome.runtime.getManifest());assert.equal(manifest.icons['128'],'icons/eagle-128.png');assert.equal(manifest.action.default_icon['16'],'icons/eagle-16.png');
 await page.goto(new URL('popup.html',worker.url()).href);
 for (const [size, file] of Object.entries(manifest.icons)) {
  const dimensions = await page.evaluate(async file => { const img = new Image(); img.src = file; await img.decode(); return [img.naturalWidth, img.naturalHeight]; }, file);
  assert.deepEqual(dimensions, [Number(size), Number(size)]);
 }
assert.equal(await page.locator('h1 img').evaluate(img=>img.complete&&img.naturalWidth>0),true);
 fs.mkdirSync('test-results',{recursive:true});await page.screenshot({path:'test-results/popup.png'});assert.deepEqual(errors,[]);
 console.log('Chromium MV3: synthetic syllabus navigation, course-first reviews, program matching, draft schedule, planner tab, feature toggles, page restrictions, 320px layout and eagle image passed.');
 } finally {await context.close();}
 execFileSync(process.execPath,['tests/availability-browser.js'],{stdio:'inherit'});
})().catch(e=>{console.error(e);process.exitCode=1;});
