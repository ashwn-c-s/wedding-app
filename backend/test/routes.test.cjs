const test=require('node:test');
const assert=require('node:assert/strict');
const {once}=require('node:events');
const supabasePath=require.resolve('../dist/lib/supabase');
let plans=[];let authResult;
const db={auth:{getUser:async()=>authResult},rpc:async(name,args)=>{const plan=plans.shift();assert.ok(plan,`Unexpected RPC ${name}`);assert.equal(name,plan.rpc);return typeof plan.result==='function'?plan.result(args):plan.result;},from(table){
  const plan=plans.shift();assert.ok(plan,`Unexpected table ${table}`);assert.equal(table,plan.table);
  const calls=[];const query=new Proxy({}, {get(_target,prop){if(prop==='then')return(resolve,reject)=>Promise.resolve(typeof plan.result==='function'?plan.result(calls):plan.result).then(resolve,reject);return(...args)=>{calls.push([prop,...args]);return query;};}});
  return query;
}};
require.cache[supabasePath]={id:supabasePath,filename:supabasePath,loaded:true,exports:{supabase:db}};
const app=require('../dist/index').default;
const server=app.listen(0,'127.0.0.1');
const token='11111111-1111-4111-8111-111111111111';
const eid='22222222-2222-4222-8222-222222222222';
const guest={id:'guest',name:'Test',phone:'123',party_size:2,invite_token:token};
const ok=data=>({data,error:null});
const guestPlan=()=>({table:'guests',result:ok(guest)});
const adminPlan=role=>({table:'admin_users',result:ok({role})});
async function request(path,method='GET',body,authenticated=false){
  if(!server.listening)await once(server,'listening');
  const headers={'Content-Type':'application/json'};if(authenticated)headers.Authorization='Bearer test-jwt';
  const response=await fetch(`http://127.0.0.1:${server.address().port}${path}`,{method,headers,body:body===undefined || method==='GET'?undefined:JSON.stringify(body)});
  assert.equal(response.headers.get('cache-control'),'no-store');assert.equal(response.headers.get('referrer-policy'),'no-referrer');
  const data=await response.json();assert.equal(plans.length,0,'Expected database operation was skipped');return{status:response.status,data};
}
test.after(()=>server.close());
test.beforeEach(()=>{plans=[];authResult={data:{user:{id:'admin-id'}},error:null};});
test('malformed invitation rejects without querying the database',async()=>{assert.equal((await request('/api/invite/bad-token')).status,404);});
test('unknown invitation returns 404',async()=>{plans=[{table:'guests',result:ok(null)}];assert.equal((await request(`/api/invite/${token}`)).status,404);});
test('default public events only request visible wedding and reception events',async()=>{
  plans=[{table:'events',result:calls=>{assert.ok(calls.some(c=>c[0]==='eq'&&c[1]==='is_visible'&&c[2]===true));assert.deepEqual(calls.find(c=>c[0]==='in').slice(1),['slug',['wedding','reception']]);return ok([{id:eid}]);}}];
  assert.deepEqual((await request('/api/invite/defaultevents')).data,{venues:[{id:eid}]});
});
test('personalized invitation uses inner joined permitted visible events and omits phone/token',async()=>{
  plans=[guestPlan(),{table:'guest_events',result:calls=>{assert.ok(calls.some(c=>c[0]==='select'&&c[1].includes('events!inner')));assert.ok(calls.some(c=>c[0]==='eq'&&c[1]==='event.is_visible'));return ok([{event:{id:eid,is_visible:true}}]);}}];
  const {data}=await request(`/api/invite/${token}`);assert.deepEqual(data.guest,{id:'guest',name:'Test',party_size:2});assert.equal(data.events[0].id,eid);
});
test('personalized celebrations sort by complete date and time regardless of assignment order',async()=>{
  const schedule=[
    {id:'reception',date:'2026-11-15T12:00:00+00:00'},
    {id:'eve',date:'2026-11-14T11:30:00+00:00'},
    {id:'wedding',date:'2026-11-15T05:00:00+00:00'},
    {id:'mehndi',date:'2026-11-14T04:30:00+00:00'},
  ];
  plans=[guestPlan(),{table:'guest_events',result:ok(schedule.map(event=>({event})))}];
  const {data}=await request(`/api/invite/${token}`);
  assert.deepEqual(data.events.map(event=>event.id),['mehndi','eve','wedding','reception']);
});
test('venue ordering compares instants across timezone offsets and breaks equal-time ties consistently',async()=>{
  const schedule=[
    {id:'late',date:'2026-11-15T10:00:00Z'},
    {id:'b',date:'2026-11-15T10:30:00+05:30'},
    {id:'a',date:'2026-11-15T05:00:00Z'},
    {id:'earlier',date:'2026-11-15T04:00:00Z'},
  ];
  plans=[guestPlan(),{table:'guest_events',result:ok(schedule.map(event=>({event:[event]})))}];
  const {data}=await request(`/api/invite/${token}/venues`);
  assert.deepEqual(data.venues.map(event=>event.id),['earlier','a','b','late']);
});
test('saved RSVP rejects all changes before any write',async()=>{
  plans=[guestPlan(),{table:'rsvps',result:ok([{id:'saved'}])}];assert.equal((await request(`/api/invite/${token}/rsvp`,'POST',{responses:[]})).status,409);
});
test('unauthorized event RSVP never reaches insert',async()=>{
  plans=[guestPlan(),{table:'rsvps',result:ok([])},{table:'guest_events',result:ok([{event:{id:eid}}])}];
  assert.equal((await request(`/api/invite/${token}/rsvp`,'POST',{responses:[{event_id:token,attending:true}]})).status,400);
});
test('RSVP submits through the guest-locking RPC and maps concurrent conflicts',async()=>{
  for(const conflict of [false,true]){
    plans=[guestPlan(),{table:'rsvps',result:ok([])},{table:'guest_events',result:ok([{event:{id:eid}}])},{rpc:'submit_rsvp_atomic',result:args=>{assert.deepEqual(args,{p_guest_id:'guest',p_invite_token:token,p_responses:[{event_id:eid,attending:false}]});return conflict?{error:{code:'P0001',message:'RSVP_ALREADY_SUBMITTED'}}:ok({success:true});}}];
    assert.equal((await request(`/api/invite/${token}/rsvp`,'POST',{responses:[{event_id:eid,attending:false}]})).status,conflict?409:200);
  }
});

test('refresh retrieves persisted confirmation status',async()=>{
  plans=[guestPlan(),{table:'rsvps',result:ok([{event_id:eid,attending:true}])}];
  assert.deepEqual((await request(`/api/invite/${token}/rsvp-status`)).data,{submitted:true,responses:[{event_id:eid,attending:true}]});
});
test('unauthenticated and nonadmin sessions are rejected',async()=>{
  assert.equal((await request('/api/admin/session')).status,401);
  plans=[{table:'admin_users',result:ok(null)}];assert.equal((await request('/api/admin/session','GET',undefined,true)).status,403);
  authResult={data:{user:null},error:{message:'expired'}};assert.equal((await request('/api/admin/session','GET',undefined,true)).status,401);
});
test('restricted admins obtain role but cannot perform privileged operations',async()=>{
  plans=[adminPlan('restricted')];assert.deepEqual((await request('/api/admin/session','GET',undefined,true)).data,{role:'restricted'});
  for(const [path,method] of [['/api/admin/guests','GET'],['/api/admin/guests/import','POST'],['/api/admin/events','GET'],[`/api/admin/events/${eid}`,'PATCH']]){
    plans=[adminPlan('restricted')];assert.equal((await request(path,method,{},true)).status,403);
  }
});
test('full admins can update whitelisted existing event fields',async()=>{
  plans=[adminPlan('full'),{table:'events',result:calls=>{assert.deepEqual(calls.find(c=>c[0]==='update')[1],{venue_name:'New venue'});return ok({id:eid,venue_name:'New venue'});}}];
  assert.equal((await request(`/api/admin/events/${eid}`,'PATCH',{venue_name:'New venue'},true)).status,200);
  plans=[adminPlan('full')];assert.equal((await request(`/api/admin/events/${eid}`,'PATCH',{id:token},true)).status,400);
});
test('import saves valid rows atomically and does not write invalid records',async()=>{
  plans=[adminPlan('full'),{table:'events',result:ok([{id:eid,slug:'wedding'}])},{rpc:'save_guest_atomic',result:args=>{assert.equal(args.p_mode,'import');assert.deepEqual(args.p_event_ids,[eid]);return ok({created:true,guest});}}];
  const {data}=await request('/api/admin/guests/import','POST',{csv:'name,phone,party_size,events\nGood,123,2,wedding\nBad,456,no,wedding\nUnknown,789,1,invalid'},true);assert.equal(data.created,1);assert.equal(data.failed,2);
});

test('idempotent import uses the atomic function for an existing guest',async()=>{
  plans=[adminPlan('full'),{table:'events',result:ok([{id:eid,slug:'wedding'}])},{rpc:'save_guest_atomic',result:ok({created:false,guest})}];
  const {data}=await request('/api/admin/guests/import','POST',{csv:'name,phone,party_size,events\nGood,123,2,wedding'},true);assert.equal(data.updated,1);
});

test('atomic import failure reports that the row was not changed',async()=>{
  plans=[adminPlan('full'),{table:'events',result:ok([{id:eid,slug:'wedding'}])},{rpc:'save_guest_atomic',result:{error:{code:'23503'}}}];
  const {data}=await request('/api/admin/guests/import','POST',{csv:'name,phone,party_size,events\nGood,123,2,wedding'},true);assert.equal(data.failed,1);assert.match(data.results[0].message,/Nothing was changed for this row/);
});

test('restricted dashboard contains permitted event IDs and no phones or invite tokens',async()=>{
  plans=[adminPlan('restricted'),{table:'guests',result:ok([{id:'g',name:'Test',party_size:2}])},{table:'events',result:ok([{id:eid}])},{table:'rsvps',result:ok([])},{table:'guest_events',result:ok([{guest_id:'g',event_id:eid}])}];
  const {status,data}=await request('/api/admin/rsvps','GET',undefined,true);
  assert.equal(status,200);assert.deepEqual(data.guests,[{id:'g',name:'Test',party_size:2,event_ids:[eid]}]);assert.deepEqual(data.counts,{invited:1,confirmed:0,declined:0,pending:1});
});
test('guest import reports the database assignment lock',async()=>{
  plans=[adminPlan('full'),{table:'events',result:ok([{id:eid,slug:'wedding'}])},{rpc:'save_guest_atomic',result:{error:{code:'P0001',message:'IMPORT_ASSIGNMENTS_DIFFER'}}}];
  const {data}=await request('/api/admin/guests/import','POST',{csv:'name,phone,party_size,events\nGood,123,2,wedding'},true);assert.equal(data.failed,1);assert.match(data.results[0].message,/assignments differ/);
});

test('restricted admins cannot create guests, edit guests or create events',async()=>{
  for(const [path,method] of [['/api/admin/guests','POST'],[`/api/admin/guests/${token}`,'PATCH'],['/api/admin/events','POST']]){
    plans=[adminPlan('restricted')];assert.equal((await request(path,method,{},true)).status,403);
  }
});
test('guest creation validates before RPC and returns the atomic result',async()=>{
  plans=[adminPlan('full')];assert.equal((await request('/api/admin/guests','POST',{name:'A',phone:'123',party_size:0,event_ids:[eid]},true)).status,400);
  plans=[adminPlan('full'),{rpc:'save_guest_atomic',result:{error:{code:'P0001',message:'INVALID_EVENTS'}}}];assert.equal((await request('/api/admin/guests','POST',{name:'A',phone:'123',party_size:1,event_ids:[eid]},true)).status,400);
  plans=[adminPlan('full'),{rpc:'save_guest_atomic',result:args=>{assert.deepEqual(args,{p_mode:'create',p_guest_id:null,p_name:'A',p_phone:'123',p_party_size:2,p_event_ids:[eid]});return ok({created:true,guest:{...guest,event_ids:[eid],responses:[]}});}}];
  const result=await request('/api/admin/guests','POST',{name:' A ',phone:'123',party_size:2,event_ids:[eid]},true);assert.equal(result.status,201);assert.deepEqual(result.data.guest.event_ids,[eid]);
});

test('guest creation reports duplicates and atomic failure without partial guest creation',async()=>{
  plans=[adminPlan('full'),{rpc:'save_guest_atomic',result:{error:{code:'23505'}}}];assert.equal((await request('/api/admin/guests','POST',{name:'A',phone:'123',party_size:1,event_ids:[eid]},true)).status,409);
  plans=[adminPlan('full'),{rpc:'save_guest_atomic',result:{error:{code:'23503'}}}];const result=await request('/api/admin/guests','POST',{name:'A',phone:'123',party_size:1,event_ids:[eid]},true);assert.equal(result.status,503);assert.match(result.data.error,/Nothing was saved/);assert.equal(result.data.guest_id,undefined);
});

test('guest edit returns the existing token and responses from the atomic function',async()=>{
  plans=[adminPlan('full'),{rpc:'save_guest_atomic',result:args=>{assert.equal(args.p_mode,'edit');assert.equal(args.p_guest_id,token);return ok({guest:{...guest,invite_token:eid,responses:[{event_id:eid,attending:true}]}});}}];
  const result=await request(`/api/admin/guests/${token}`,'PATCH',{name:'Changed',phone:'456',party_size:3,event_ids:[eid]},true);assert.equal(result.status,200);assert.equal(result.data.guest.invite_token,eid);assert.deepEqual(result.data.guest.responses,[{event_id:eid,attending:true}]);
});

test('confirmed guest assignment changes map the atomic RSVP lock to conflict',async()=>{
  plans=[adminPlan('full'),{rpc:'save_guest_atomic',result:{error:{code:'P0001',message:'GUEST_RSVP_LOCKED'}}}];assert.equal((await request(`/api/admin/guests/${token}`,'PATCH',{name:'A',phone:'123',party_size:1,event_ids:[token]},true)).status,409);
});

test('pending guest assignment replacement uses one RPC with the chosen guest and events',async()=>{
  plans=[adminPlan('full'),{rpc:'save_guest_atomic',result:args=>{assert.equal(args.p_guest_id,token);assert.deepEqual(args.p_event_ids,[eid]);return ok({guest:{...guest,event_ids:[eid]}});}}];assert.equal((await request(`/api/admin/guests/${token}`,'PATCH',{name:'A',phone:'123',party_size:1,event_ids:[eid]},true)).status,200);
});

test('event creation requires fields, rejects duplicate slugs and returns created event',async()=>{
  plans=[adminPlan('full')];assert.equal((await request('/api/admin/events','POST',{name:'Dinner'},true)).status,400);
  const body={name:'Dinner',slug:'family-dinner',date:'2026-11-14T18:00:00+05:30',is_visible:false};
  plans=[adminPlan('full'),{table:'events',result:ok({...body,id:eid})}];const result=await request('/api/admin/events','POST',body,true);assert.equal(result.status,201);assert.equal(result.data.event.slug,body.slug);
  plans=[adminPlan('full'),{table:'events',result:{error:{code:'23505'}}}];assert.equal((await request('/api/admin/events','POST',body,true)).status,409);
});

test('guest edit reports a rolled-back database failure',async()=>{
  plans=[adminPlan('full'),{rpc:'save_guest_atomic',result:{error:{code:'23503'}}}];const result=await request(`/api/admin/guests/${token}`,'PATCH',{name:'A',phone:'123',party_size:1,event_ids:[eid]},true);assert.equal(result.status,503);assert.match(result.data.error,/Nothing was changed/);
});
test('RSVP rejects a stale assignment snapshot at the transaction boundary',async()=>{
  plans=[guestPlan(),{table:'rsvps',result:ok([])},{table:'guest_events',result:ok([{event:{id:eid}}])},{rpc:'submit_rsvp_atomic',result:{error:{code:'P0001',message:'EVENT_ASSIGNMENTS_CHANGED'}}}];const result=await request(`/api/invite/${token}/rsvp`,'POST',{responses:[{event_id:eid,attending:true}]});assert.equal(result.status,400);assert.match(result.data.error,/invited events have changed/);
});

test('full guest lists contain private tags and catalogue usage counts',async()=>{
  plans=[adminPlan('full'),{table:'guests',result:ok([guest])},{table:'guest_events',result:ok([{guest_id:'guest',event_id:eid}])},{table:'rsvps',result:ok([])},{table:'guest_tags',result:ok([{id:eid,name:'Office friends'}])},{table:'guest_tag_assignments',result:ok([{guest_id:'guest',tag_id:eid}])}];
  const {data}=await request('/api/admin/guests','GET',undefined,true);assert.deepEqual(data.guests[0].tags,[{id:eid,name:'Office friends'}]);assert.equal(data.tags[0].guest_count,1);
});
test('full dashboard includes tags without leaking them to restricted users',async()=>{
  plans=[adminPlan('full'),{table:'guests',result:ok([{id:'g',name:'Test',party_size:2}])},{table:'events',result:ok([{id:eid}])},{table:'rsvps',result:ok([])},{table:'guest_events',result:ok([{guest_id:'g',event_id:eid}])},{table:'guest_tags',result:ok([{id:eid,name:'Office'}])},{table:'guest_tag_assignments',result:ok([{guest_id:'g',tag_id:eid}])}];
  const {data}=await request('/api/admin/rsvps','GET',undefined,true);assert.equal(data.guests[0].tags[0].name,'Office');
});
test('restricted and anonymous clients cannot list, create or rename tags',async()=>{
  for(const [path,method] of [['/api/admin/tags','GET'],['/api/admin/tags','POST'],[`/api/admin/tags/${eid}`,'PATCH']]){
    assert.equal((await request(path,method,{},false)).status,401);plans=[adminPlan('restricted')];assert.equal((await request(path,method,{},true)).status,403);
  }
});
test('tag-aware guest saves use one transactional RPC with normalized draft labels',async()=>{
  plans=[adminPlan('full'),{rpc:'save_guest_atomic_v2',result:args=>{assert.deepEqual(args.p_tag_ids,[token]);assert.deepEqual(args.p_new_tags,['School friends']);assert.equal(args.p_tag_mode,'replace');return ok({guest:{...guest,tags:[{id:token,name:'Office'}]}});}}];
  const result=await request(`/api/admin/guests/${token}`,'PATCH',{name:'A',phone:'123',party_size:2,event_ids:[eid],tag_ids:[token],new_tags:[' School   friends ','school friends']},true);assert.equal(result.status,200);assert.equal(result.data.guest.tags[0].name,'Office');
});
test('invalid tags are rejected before any write RPC',async()=>{
  for(const tags of [{tag_ids:null},{tag_ids:['bad']},{new_tags:['bad|tag']},{new_tags:['x'.repeat(41)]},{new_tags:Array.from({length:11},(_,i)=>'Tag '+i)}]){
    plans=[adminPlan('full')];assert.equal((await request('/api/admin/guests','POST',{name:'A',phone:'123',party_size:1,event_ids:[eid],...tags},true)).status,400);
  }
});
test('extended CSV uses add mode while blank labels retain the legacy preserving save',async()=>{
  plans=[adminPlan('full'),{table:'events',result:ok([{id:eid,slug:'wedding'}])},{rpc:'save_guest_atomic_v2',result:args=>{assert.equal(args.p_tag_mode,'add');assert.deepEqual(args.p_new_tags,['Office','School']);return ok({created:true,guest});}},{rpc:'save_guest_atomic',result:ok({created:false,guest})}];
  const result=await request('/api/admin/guests/import','POST',{csv:'name,phone,party_size,events,tags\nA,123,2,wedding,Office|School\nB,456,2,wedding,'},true);assert.equal(result.data.created,1);assert.equal(result.data.updated,1);
});
test('catalogue rename normalizes names and reports collisions without changing assignments',async()=>{
  plans=[adminPlan('full'),{table:'guest_tags',result:calls=>{assert.deepEqual(calls.find(call=>call[0]==='update')[1],{name:'Office friends'});return ok({id:eid,name:'Office friends'});}}];assert.equal((await request(`/api/admin/tags/${eid}`,'PATCH',{name:' Office   friends '},true)).status,200);
  plans=[adminPlan('full'),{table:'guest_tags',result:{error:{code:'23505'}}}];assert.equal((await request(`/api/admin/tags/${eid}`,'PATCH',{name:'Existing'},true)).status,409);
});
test('a tag limit error is actionable and leaves the whole CSV row unsaved',async()=>{
  plans=[adminPlan('full'),{table:'events',result:ok([{id:eid,slug:'wedding'}])},{rpc:'save_guest_atomic_v2',result:{error:{code:'P0001',message:'TOO_MANY_TAGS'}}}];
  const result=await request('/api/admin/guests/import','POST',{csv:'name,phone,party_size,events,tags\nA,123,2,wedding,More'},true);assert.equal(result.data.failed,1);assert.match(result.data.results[0].message,/more than 10 tags/);
});

test('full admin location saves use the transactional v3 RPC and reject bad input before writing',async()=>{
 const location={type:'coordinates',latitude:10.5,longitude:76.2,accuracy_m:12,address:'Home'};
 plans=[adminPlan('full'),{rpc:'save_guest_atomic_v3',result:args=>{assert.deepEqual(args.p_location,location);assert.equal(args.p_guest_id,eid);return ok({guest:{...guest,location}});}}];
 const result=await request(`/api/admin/guests/${eid}`,'PATCH',{name:'Test',phone:'123',party_size:2,event_ids:[eid],location},true);
 assert.equal(result.status,200);assert.deepEqual(result.data.guest.location,location);
 plans=[adminPlan('full')];assert.equal((await request('/api/admin/guests','POST',{name:'Test',phone:'123',party_size:2,event_ids:[eid],location:{type:'coordinates',latitude:99,longitude:0}},true)).status,400);
 plans=[adminPlan('restricted')];assert.equal((await request(`/api/admin/guests/${eid}`,'PATCH',{location},true)).status,403);
});
test('public invitation whitelists exclude private guest location even if a record contains it',async()=>{
 plans=[{table:'guests',result:calls=>{assert.equal(calls.find(c=>c[0]==='select')[1].includes('location'),false);return ok({...guest,location:{type:'coordinates',latitude:10,longitude:76}});}},{table:'guest_events',result:ok([])}];
 const result=await request(`/api/invite/${token}`);assert.deepEqual(result.data.guest,{id:'guest',name:'Test',party_size:2});
});
