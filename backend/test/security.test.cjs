const test = require('node:test');
const assert = require('node:assert/strict');
const {validateResponses,parseCsv,validateEventPatch,summarize} = require('../dist/lib/validation');
const ids = ['11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222'];
test('RSVP requires the exact permitted event set with real booleans',()=>{
  const responses=ids.map(event_id=>({event_id,attending:true}));
  assert.deepEqual(validateResponses({responses},ids),responses);
  for(const body of [null,{}, {responses:[]},{responses:[responses[0]]},{responses:[responses[0],responses[0]]},{responses:[{event_id:ids[0],attending:'false'}]},{responses:[{event_id:'malformed',attending:true}]}]) assert.throws(()=>validateResponses(body,ids));
  assert.throws(()=>validateResponses({responses},[ids[0]]),/not permitted/);
});
test('CSV supports quoted commas, quotes and CRLF; rejects malformed quoting',()=>{
  assert.deepEqual(parseCsv('name,phone,party_size,events\r\n"Family, \'A\'",123,3,wedding+reception\n'),[['name','phone','party_size','events'],["Family, 'A'",'123','3','wedding+reception']]);
  assert.deepEqual(parseCsv('"A ""quote""",b'),[['A "quote"','b']]);
  assert.throws(()=>parseCsv('"unfinished'));assert.throws(()=>parseCsv('"a"bad,b'));
});
test('event updates whitelist fields, validate dates and reject unsafe links',()=>{
  assert.deepEqual(validateEventPatch({name:' Wedding ',date:'2026-12-20',is_visible:false}),{name:'Wedding',date:'2026-12-20',is_visible:false});
  for(const body of [{id:ids[0]},{created_at:'now'},{date:'2026-02-30'},{maps_url:'javascript:alert(1)'},{is_visible:'false'},{name:''},{},[]]) assert.throws(()=>validateEventPatch(body));
});
test('RSVP dashboard counts unique guests and party sizes rather than response rows',()=>{
  const guests=[{id:'a',party_size:3},{id:'b',party_size:2},{id:'c',party_size:1}];
  const events=[{id:'w'},{id:'r'}];
  const assignments=[{guest_id:'a',event_id:'w'},{guest_id:'a',event_id:'r'},{guest_id:'b',event_id:'w'},{guest_id:'c',event_id:'w'}];
  const responses=[{guest_id:'a',event_id:'w',attending:true},{guest_id:'a',event_id:'r',attending:false},{guest_id:'b',event_id:'w',attending:false}];
  assert.deepEqual(summarize(guests,events,assignments,responses),{counts:{invited:3,confirmed:1,declined:1,pending:1},event_counts:[{event_id:'w',invited:3,confirmed:1,declined:1,pending:1,attendees:3},{event_id:'r',invited:1,confirmed:0,declined:1,pending:0,attendees:0}]});
});
test('admin pagination includes records beyond the default Supabase row limit',async()=>{
  const {allRows}=require('../dist/lib/pagination');const offsets=[];
  const result=await allRows(async(from,to)=>{offsets.push([from,to]);return{data:from===0?Array.from({length:1000},(_,id)=>({id})):[{id:1000}],error:null};});
  assert.equal(result.data.length,1001);assert.deepEqual(offsets,[[0,999],[1000,1999]]);
});
test('event editor preserves live timestamp precision and timezone, supports date-only compatibility',()=>{
  for(const date of ['2026-11-15T05:00:00+00:00','2026-11-15T10:30:00+05:30','2026-11-15T05:00:00.123Z','2026-11-15']) assert.deepEqual(validateEventPatch({date}),{date});
  for(const date of ['2026-02-30T05:00:00Z','2026-11-15T25:00:00Z','2026-11-15T05:00:00','2026-11-15bogus']) assert.throws(()=>validateEventPatch({date}));
});
