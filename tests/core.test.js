import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectAnswer,checkableURL,httpVerdict,checkURL,estimateCosts,sessionMarkdown} from '../extension/core.js';
const prices={currency:'USD',asOf:'example',models:{demo:{input:'1',output:'4',cachedInput:'0.25'}}};
const record={id:'1',model:'demo',input_tokens:1000,output_tokens:200,cached_input_tokens:200};
test('review deduplicates links and excludes fenced code from candidates',()=>{
 const result=inspectAnswer('Today 40% improved. https://example.com/a. https://example.com/a.\n```\nAlways 2026\n```');
 assert.deepEqual(result.links,['https://example.com/a']);assert.equal(result.candidates.length,1);
});
test('rejects local addresses, credentials and non-HTTPS URLs',()=>{
 for(const url of ['http://example.com','https://localhost','https://127.0.0.1','https://[::1]','https://user:pass@example.com','https://a.internal','https://example.com:8443']) assert.throws(()=>checkableURL(url));
 assert.equal(checkableURL('https://example.com/a#b').href,'https://example.com/a');
});
test('HTTP outcomes do not imply factual verification',()=>{
 assert.match(httpVerdict(200),/not verified/);assert.match(httpVerdict(403),/not proof/);assert.match(httpVerdict(404),/missing/);assert.match(httpVerdict(0,'opaqueredirect'),/not checked/);
});
test('checks use HEAD without credentials or redirects',async()=>{
 const result=await checkURL('https://example.com',async(url,options)=>{assert.equal(options.method,'HEAD');assert.equal(options.credentials,'omit');assert.equal(options.redirect,'manual');return {status:200};});
 assert.equal(result.status,200);
});
test('network failures and aborts stay inconclusive',async()=>{
 assert.equal((await checkURL('https://example.com',async()=>{throw Error('network');})).status,null);
 const result=await checkURL('https://example.com',(_,options)=>new Promise((resolve,reject)=>options.signal.addEventListener('abort',()=>reject(Error('abort')))),1);
 assert.equal(result.status,null);
});
test('exact decimal math accounts for cached input once',()=>{assert.equal(estimateCosts([record],prices).pricedSubtotalUSD,'0.001650000000');});
test('unknown prices are not counted as free',()=>{const r=estimateCosts([{...record,model:'unknown'}],prices);assert.equal(r.unpricedRequests,1);assert.equal(r.rows[0].costUSD,null);});
test('invalid usage and prices fail explicitly',()=>{
 for(const patch of [{input_tokens:-1},{input_tokens:0.5},{cached_input_tokens:1001}]) assert.throws(()=>estimateCosts([{...record,...patch}],prices));
 assert.throws(()=>estimateCosts([record,record],prices));
 assert.throws(()=>estimateCosts([record],{...prices,models:{demo:{input:1,output:'4'}}}));
});
test('checkpoint escapes code fences in Git filenames',()=>{
 const output=sessionMarkdown({git:{schema_version:1,head:'abc',changes:[{path:'```evil'}]}});
 assert.equal(output.split('```').length,3);assert.match(output,/not independently verified/);
});
test('preserves balanced URL parentheses but strips Markdown wrapper',()=>{
 assert.deepEqual(inspectAnswer('[link](https://example.com/a_(b)).').links,['https://example.com/a_(b)']);
});
