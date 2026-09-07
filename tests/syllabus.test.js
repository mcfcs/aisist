const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createChecker}=require('../lib/syllabus');
const url='https://aisis.ateneo.edu/syllabi/2026/1/CS-DISCS-CSCI21-DEMO_R_TESTER_J-K-2026-1.pdf';
test('availability distinguishes missing PDFs from login, server, and network failures',async()=>{
 for(const [status,type,state] of [[200,'application/pdf','available'],[404,'text/html','missing'],[410,'text/html','missing'],[403,'text/html','unknown'],[500,'text/html','unknown'],[302,'text/html','unknown']]) {
  const c=createChecker({fetch:async()=>new Response(null,{status,headers:{'content-type':type}})});
  assert.equal((await c.check(url)).state,state);
 }
 assert.equal((await createChecker({fetch:async()=>{throw new Error('offline')}}).check(url)).state,'unknown');
});
test('HEAD fallback checks a bounded PDF prefix, recognizes Oracle missing page, leaves login usable',async()=>{
 for(const [body,state] of [['%PDF-1.7 test','available'],['<h1>Not Found</h1>The requested URL /syllabi/a.pdf was not found on this server.','missing'],['<form>Sign in</form>','unknown']]) {
  let calls=0;
  const c=createChecker({fetch:async(u,o)=>{calls++;if(o.method==='HEAD')return new Response(null,{status:405});assert.equal(o.headers.Range,'bytes=0-2047');assert.equal(o.credentials,'same-origin');return new Response(body);}});
  assert.equal((await c.check(url)).state,state);assert.equal(calls,2);
 }
});
test('cache survives checker instances, expires missing statuses and supports forced recheck',async()=>{
 let time=1000,calls=0;const saved=new Map();
 const options={now:()=>time,fetch:async()=>{calls++;return new Response(null,{status:404})},cache:{get:async k=>saved.get(k),set:async(k,v)=>saved.set(k,v)}};
 await createChecker(options).check(url);const c=createChecker(options);await c.check(url);assert.equal(calls,1);
 time+=300001;await c.check(url);assert.equal(calls,2);await c.check(url,{force:true});assert.equal(calls,3);
});
test('deduplicates requests, limits concurrency and refuses external URLs',async()=>{
 let active=0,max=0,calls=0;
 const c=createChecker({fetch:async()=>{calls++;active++;max=Math.max(max,active);await new Promise(r=>setTimeout(r,5));active--;return new Response(null,{status:404});}});
 await Promise.all([c.check(url),c.check(url),...Array.from({length:8},(_,i)=>c.check(url.replace('-K-',`-K${i}-`)))]);
 assert.equal(calls,9);assert.equal(max,3);assert.equal((await c.check('https://example.com/file.pdf')).state,'unknown');assert.equal(calls,9);
});
