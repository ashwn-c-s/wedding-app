const test=require('node:test');
const assert=require('node:assert/strict');
const {once}=require('node:events');
const supabasePath=require.resolve('../dist/lib/supabase');
let plans=[];let authResult;
const db={auth:{getUser:async()=>authResult},from(table){
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
test('default public events only request visible event data',async()=>{
  plans=[{table:'events',result:calls=>{assert.ok(calls.some(c=>c[0]==='eq'&&c[1]==='is_visible'&&c[2]===true));return ok([{id:eid}]);}}];
  assert.deepEqual((await request('/api/invite/defaultevents')).data,{venues:[{id:eid}]});
});
test('personalized invitation uses inner joined permitted visible events and omits phone/token',async()=>{
  plans=[guestPlan(),{table:'guest_events',result:calls=>{assert.ok(calls.some(c=>c[0]==='select'&&c[1].includes('events!inner')));assert.ok(calls.some(c=>c[0]==='eq'&&c[1]==='event.is_visible'));return ok([{event:{id:eid,is_visible:true}}]);}}];
  const {data}=await request(`/api/invite/${token}`);assert.deepEqual(data.guest,{id:'guest',name:'Test',party_size:2});assert.equal(data.events[0].id,eid);
});
test('saved RSVP rejects all changes before any write',async()=>{
  plans=[guestPlan(),{table:'rsvps',result:ok([{id:'saved'}])}];assert.equal((await request(`/api/invite/${token}/rsvp`,'POST',{responses:[]})).status,409);
});
test('unauthorized event RSVP never reaches insert',async()=>{
  plans=[guestPlan(),{table:'rsvps',result:ok([])},{table:'guest_events',result:ok([{event:{id:eid}}])}];
  assert.equal((await request(`/api/invite/${token}/rsvp`,'POST',{responses:[{event_id:token,attending:true}]})).status,400);
});
test('RSVP inserts complete response set and maps concurrent unique conflict to locked response',async()=>{
  for(const conflict of [false,true]){
    plans=[guestPlan(),{table:'rsvps',result:ok([])},{table:'guest_events',result:ok([{event:{id:eid}}])},{table:'rsvps',result:calls=>{assert.deepEqual(calls.find(c=>c[0]==='insert')[1],[{guest_id:'guest',event_id:eid,attending:false}]);return conflict?{error:{code:'23505'}}:ok(null);}}];
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
test('import reports each row and does not write invalid records',async()=>{
  plans=[adminPlan('full'),{table:'events',result:ok([{id:eid,slug:'wedding'}])},{table:'guests',result:ok(null)},{table:'guests',result:ok({id:'new'})},{table:'guest_events',result:ok(null)}];
  const {data}=await request('/api/admin/guests/import','POST',{csv:'name,phone,party_size,events\nGood,123,2,wedding\nBad,456,no,wedding\nUnknown,789,1,invalid'},true);
  assert.equal(data.created,1);assert.equal(data.failed,2);
});
test('idempotent import preserves token and existing confirmed details',async()=>{
  plans=[adminPlan('full'),{table:'events',result:ok([{id:eid,slug:'wedding'}])},{table:'guests',result:ok({id:'g',name:'Good',party_size:2})},{table:'rsvps',result:ok([{id:'r'}])},{table:'guest_events',result:ok([{event_id:eid}])}];
  const {data}=await request('/api/admin/guests/import','POST',{csv:'name,phone,party_size,events\nGood,123,2,wedding'},true);assert.equal(data.updated,1);
});
test('assignment failure is explicitly reported without destructive rollback',async()=>{
  plans=[adminPlan('full'),{table:'events',result:ok([{id:eid,slug:'wedding'}])},{table:'guests',result:ok(null)},{table:'guests',result:ok({id:'new'})},{table:'guest_events',result:{error:{code:'fail'}}}];
  const {data}=await request('/api/admin/guests/import','POST',{csv:'name,phone,party_size,events\nGood,123,2,wedding'},true);assert.equal(data.failed,1);assert.match(data.results[0].message,/Guest created but event assignment failed/);
});
test('restricted dashboard contains permitted event IDs and no phones or invite tokens',async()=>{
  plans=[adminPlan('restricted'),{table:'guests',result:ok([{id:'g',name:'Test',party_size:2}])},{table:'events',result:ok([{id:eid}])},{table:'rsvps',result:ok([])},{table:'guest_events',result:ok([{guest_id:'g',event_id:eid}])}];
  const {status,data}=await request('/api/admin/rsvps','GET',undefined,true);
  assert.equal(status,200);assert.deepEqual(data.guests,[{id:'g',name:'Test',party_size:2,event_ids:[eid]}]);assert.deepEqual(data.counts,{invited:1,confirmed:0,declined:0,pending:1});
});
test('guest import rejects existing assignment changes before writing',async()=>{
  plans=[adminPlan('full'),{table:'events',result:ok([{id:eid,slug:'wedding'}])},{table:'guests',result:ok({id:'g',name:'Good',party_size:2})},{table:'rsvps',result:ok([])},{table:'guest_events',result:ok([{event_id:token}])}];
  const {data}=await request('/api/admin/guests/import','POST',{csv:'name,phone,party_size,events\nGood,123,2,wedding'},true);assert.equal(data.failed,1);assert.match(data.results[0].message,/assignments differ/);
});

test('restricted admins cannot create guests, edit guests or create events',async()=>{
  for(const [path,method] of [['/api/admin/guests','POST'],[`/api/admin/guests/${token}`,'PATCH'],['/api/admin/events','POST']]){
    plans=[adminPlan('restricted')];assert.equal((await request(path,method,{},true)).status,403);
  }
});
test('guest creation validates fields and requires real assigned events before inserting',async()=>{
  plans=[adminPlan('full')];assert.equal((await request('/api/admin/guests','POST',{name:'A',phone:'123',party_size:0,event_ids:[eid]},true)).status,400);
  plans=[adminPlan('full'),{table:'events',result:ok([])}];assert.equal((await request('/api/admin/guests','POST',{name:'A',phone:'123',party_size:1,event_ids:[eid]},true)).status,400);
  plans=[adminPlan('full'),{table:'events',result:ok([{id:eid}])},{table:'guests',result:calls=>{assert.deepEqual(calls.find(c=>c[0]==='insert')[1],{name:'A',phone:'123',party_size:2});return ok({...guest,id:token,name:'A'});}},{table:'guest_events',result:calls=>{assert.deepEqual(calls.find(c=>c[0]==='insert')[1],[{guest_id:token,event_id:eid}]);return ok(null);}}];
  const result=await request('/api/admin/guests','POST',{name:' A ',phone:'123',party_size:2,event_ids:[eid]},true);assert.equal(result.status,201);assert.deepEqual(result.data.guest.event_ids,[eid]);
});
test('guest creation reports duplicate phones and partial assignment failure',async()=>{
  plans=[adminPlan('full'),{table:'events',result:ok([{id:eid}])},{table:'guests',result:{error:{code:'23505'}}}];assert.equal((await request('/api/admin/guests','POST',{name:'A',phone:'123',party_size:1,event_ids:[eid]},true)).status,409);
  plans=[adminPlan('full'),{table:'events',result:ok([{id:eid}])},{table:'guests',result:ok({...guest,id:token})},{table:'guest_events',result:{error:{code:'failure'}}}];
  const result=await request('/api/admin/guests','POST',{name:'A',phone:'123',party_size:1,event_ids:[eid]},true);assert.equal(result.status,503);assert.equal(result.data.guest_id,token);assert.match(result.data.error,/Guest created/);
});
test('confirmed guest details can change without replacing their token or RSVP',async()=>{
  plans=[adminPlan('full'),{table:'guests',result:ok({id:token,invite_token:eid})},{table:'guest_events',result:ok([{event_id:eid}])},{table:'rsvps',result:ok([{event_id:eid,attending:true}])},{table:'events',result:ok([{id:eid}])},{table:'guests',result:calls=>{assert.deepEqual(calls.find(c=>c[0]==='update')[1],{name:'Changed',phone:'456',party_size:3});return ok({...guest,id:token,invite_token:eid,name:'Changed'});}}];
  const result=await request(`/api/admin/guests/${token}`,'PATCH',{name:'Changed',phone:'456',party_size:3,event_ids:[eid]},true);assert.equal(result.status,200);assert.equal(result.data.guest.invite_token,eid);assert.deepEqual(result.data.guest.responses,[{event_id:eid,attending:true}]);
});
test('confirmed guest event changes are rejected before any write',async()=>{
  plans=[adminPlan('full'),{table:'guests',result:ok({id:token})},{table:'guest_events',result:ok([{event_id:eid}])},{table:'rsvps',result:ok([{event_id:eid,attending:true}])},{table:'events',result:ok([{id:token}])}];
  assert.equal((await request(`/api/admin/guests/${token}`,'PATCH',{name:'A',phone:'123',party_size:1,event_ids:[token]},true)).status,409);
});
test('pending guest event update adds and removes only the selected guest assignments',async()=>{
  plans=[adminPlan('full'),{table:'guests',result:ok({id:token})},{table:'guest_events',result:ok([{event_id:eid}])},{table:'rsvps',result:ok([])},{table:'events',result:ok([{id:token}])},{table:'guests',result:ok({...guest,id:token})},{table:'guest_events',result:calls=>{assert.deepEqual(calls.find(c=>c[0]==='upsert')[1],[{guest_id:token,event_id:token}]);return ok(null);}},{table:'guest_events',result:calls=>{assert.ok(calls.some(c=>c[0]==='eq'&&c[1]==='guest_id'&&c[2]===token));assert.deepEqual(calls.find(c=>c[0]==='in').slice(1),['event_id',[eid]]);return ok(null);}}];
  assert.equal((await request(`/api/admin/guests/${token}`,'PATCH',{name:'A',phone:'123',party_size:1,event_ids:[token]},true)).status,200);
});
test('event creation requires fields, rejects duplicate slugs and returns created event',async()=>{
  plans=[adminPlan('full')];assert.equal((await request('/api/admin/events','POST',{name:'Dinner'},true)).status,400);
  const body={name:'Dinner',slug:'family-dinner',date:'2026-11-14T18:00:00+05:30',is_visible:false};
  plans=[adminPlan('full'),{table:'events',result:ok({...body,id:eid})}];const result=await request('/api/admin/events','POST',body,true);assert.equal(result.status,201);assert.equal(result.data.event.slug,body.slug);
  plans=[adminPlan('full'),{table:'events',result:{error:{code:'23505'}}}];assert.equal((await request('/api/admin/events','POST',body,true)).status,409);
});

test('guest edit reports partial removal failure without touching saved responses',async()=>{
  plans=[adminPlan('full'),{table:'guests',result:ok({id:token})},{table:'guest_events',result:ok([{event_id:eid}])},{table:'rsvps',result:ok([])},{table:'events',result:ok([{id:token}])},{table:'guests',result:ok({...guest,id:token})},{table:'guest_events',result:ok(null)},{table:'guest_events',result:{error:{code:'failure'}}}];
  const result=await request(`/api/admin/guests/${token}`,'PATCH',{name:'A',phone:'123',party_size:1,event_ids:[token]},true);assert.equal(result.status,503);assert.match(result.data.error,/old events could not be removed/);
});
