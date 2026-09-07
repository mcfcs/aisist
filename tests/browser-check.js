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
 const schedule = `<style>body{font:12px Arial}td{padding:8px}</style><select name="applicablePeriod"><option value="2026-1">2026-1</option></select><select name="deptCode"><option value="DISCS">DISCS</option></select><table><tr><td>Subject Code</td><td>Section</td><td>Course Title</td><td>Units</td><td>Time</td><td>Room</td><td>Instructor</td></tr><tr><td>CSCI 21</td><td>A</td><td>Sample Course</td><td>3</td><td>T-F</td><td>Sample Room</td><td>EXAMPLE, ALEXANDER E.</td></tr></table>`;
 const payload={professor:{id:1,slug:'example-alexander',display_name:'Example, Alexander E.'},stat:{professor_id:1,score:3,comment_count:2},comment:[{id:1,professor_id:1,body:'Synthetic review for another course.',title:'Other course',course_id:2,rating:2},{id:2,professor_id:1,body:'Synthetic matching review. '.repeat(30),title:'Matching course',course_id:3,rating:4}],courses:[{id:2,course_code:'CSCI 20'},{id:3,course_code:'CSCI 21'}]};
 const profile=`<script>self.__next_f.push(${JSON.stringify([1,`0:${JSON.stringify(payload)}\n`])})</script>`;
 await context.route('https://profstopick.com/**',r=>r.fulfill({contentType:'text/html',body:profile}));
 let native=false;
 await context.route('https://aisis.ateneo.edu/**',r=>{
  if(r.request().url().includes('/syllabi/'))return r.fulfill({contentType:r.request().method()==='HEAD'?'application/pdf':'text/plain',body:r.request().method()==='HEAD'?'':'Synthetic PDF navigation fixture'});
  return r.fulfill({contentType:'text/html',body:native?schedule.replace('</table>','<tr><td>View class syllabus</td></tr></table>'):schedule});
 });
 const page=await context.newPage(); const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('https://aisis.ateneo.edu/j_aisis/J_VCSC.do');
 const syllabus=page.getByRole('link',{name:'Syllabus',exact:true});await syllabus.waitFor();
 const [pdf]=await Promise.all([page.waitForEvent('popup'),syllabus.click()]);await pdf.waitForLoadState();assert.match(pdf.url(),/EXAMPLE_A-A-2026-1.pdf$/);await pdf.close();
 await page.getByRole('button',{name:'Prof reviews'}).click();const dialog=page.getByRole('dialog');await dialog.locator('article').first().waitFor();
 assert.equal(await dialog.locator('article h3').first().textContent(),'Matching course');
 await dialog.getByLabel('Show reviews').selectOption('course');assert.equal(await dialog.locator('article').count(),1);
 await dialog.getByRole('button',{name:'Read full review'}).click();assert.equal(await dialog.getByRole('button',{name:'Show less'}).getAttribute('aria-expanded'),'true');
 await page.setViewportSize({width:320,height:640});assert.equal(await dialog.locator('.content').evaluate(e=>e.scrollWidth<=e.clientWidth),true);await page.keyboard.press('Escape');
 for(const endpoint of ['J_VCEC.do','J_VMCS.do']){await page.goto(`https://aisis.ateneo.edu/j_aisis/${endpoint}`);await page.waitForTimeout(250);assert.equal(await page.locator('[data-companion-cell]').count(),0);}
 native=true;await page.goto('https://aisis.ateneo.edu/j_aisis/J_VCSC.do');await page.waitForTimeout(250);assert.equal(await page.locator('[data-companion-cell]').count(),0);
 const worker=context.serviceWorkers()[0];assert.ok(worker);const manifest=await worker.evaluate(()=>chrome.runtime.getManifest());assert.equal(manifest.icons['128'],'eagle.jpg');assert.equal(manifest.action.default_icon['16'],'eagle.jpg');
 await page.goto(new URL('popup.html',worker.url()).href);assert.equal(await page.locator('h1 img').evaluate(img=>img.complete&&img.naturalWidth>0),true);
 fs.mkdirSync('test-results',{recursive:true});await page.screenshot({path:'test-results/popup.png'});assert.deepEqual(errors,[]);
 console.log('Chromium MV3: synthetic syllabus navigation, course-first reviews, page restrictions, 320px layout and eagle image passed.');
 } finally {await context.close();}
 execFileSync(process.execPath,['tests/availability-browser.js'],{stdio:'inherit'});
})().catch(e=>{console.error(e);process.exitCode=1;});
