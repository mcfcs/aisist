const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try {
 const page=await browser.newPage({viewport:{width:1000,height:500}});
 let missing=true;const requests=[];
 await page.route('https://aisis.ateneo.edu/**',route=>{
  const url=route.request().url();
  if(url.includes('/syllabi/')){requests.push(url);return route.fulfill({status:url.includes('-A-')?(missing?404:200):403,contentType:'application/pdf',body:''});}
  return route.fulfill({contentType:'text/html',body:`<style>body{font:11px Arial;color:navy}td{padding:8px}tr:nth-child(even){background:#eee}</style><select name="applicablePeriod"><option value="2026-1">2026-1</option></select><select name="deptCode"><option value="DISCS">DISCS</option></select><table><tr><td>Subject Code</td><td>Section</td><td>Course Title</td><td>Units</td><td>Time</td><td>Room</td><td>Instructor</td></tr>${['A','B'].map((section,i)=>`<tr style="${i?'transform:translateY(1800px)':''}"><td>CSCI 21</td><td>${section}</td><td>Introduction to Programming I</td><td>3</td><td>T-F</td><td>F-228</td><td>DEMO, R.</td></tr>`).join('')}</table>`});
 });
 await page.goto('https://aisis.ateneo.edu/j_aisis/J_VCSC.do');
 await page.evaluate(()=>{globalThis.chrome={storage:{local:{get:async()=>({}),set:async()=>{}}}}});
 for(const path of ['lib/core.js','lib/syllabus.js','content.js'])await page.addScriptTag({path});
 const links=page.locator('[data-syllabus-url]');
 await page.waitForFunction(()=>document.querySelector('td[data-companion-cell] span')?.shadowRoot.querySelector('a')?.dataset.syllabusState==='missing');
 assert.equal(requests.length,1);assert.equal(await links.nth(0).getAttribute('href'),null);
 require('node:fs').mkdirSync('test-results', {recursive:true});
 await page.screenshot({path:'test-results/syllabus-availability.png'});
 missing=false;await page.getByRole('button',{name:'Recheck syllabus'}).first().click();
 await page.waitForFunction(()=>document.querySelector('td[data-companion-cell] span').shadowRoot.querySelector('a').dataset.syllabusState==='available');
 await links.nth(1).scrollIntoViewIfNeeded();
 await page.waitForFunction(()=>[...document.querySelectorAll('td[data-companion-cell] span')][1].shadowRoot.querySelector('a').dataset.syllabusState==='unknown');
 assert.ok(await links.nth(1).getAttribute('href'));assert.equal(requests.length,3);
 console.log('Chromium visibility: offscreen rows untouched, 404 disabled, recheck restores PDF, 403 stays usable.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
