const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {PGlite}=require('@electric-sql/pglite');const db=new PGlite();
const e1='11111111-1111-4111-8111-111111111111',e2='22222222-2222-4222-8222-222222222222',hidden='33333333-3333-4333-8333-333333333333',missing='44444444-4444-4444-8444-444444444444';
async function save(mode,id,name,phone,size,events){return (await db.query('select public.save_guest_atomic($1,$2,$3,$4,$5,$6::uuid[]) result',[mode,id,name,phone,size,events])).rows[0].result;}
async function rsvp(guest,responses,token=guest.invite_token){return (await db.query('select public.submit_rsvp_atomic($1,$2,$3::jsonb) result',[guest.id,token,JSON.stringify(responses)])).rows[0].result;}
async function snapshot(id){return (await db.query('select name,phone,party_size,invite_token,(select array_agg(event_id order by event_id) from guest_events where guest_id=g.id) event_ids from guests g where id=$1',[id])).rows[0];}
async function failAssignments(){await db.exec(`create or replace function reject_assignment() returns trigger language plpgsql as $$begin if new.event_id='${e2}'::uuid then raise exception 'Test assignment failure'; end if;return new;end;$$;create trigger fail_assignment before insert on guest_events for each row execute function reject_assignment();`);}
test.before(async()=>{
 await db.exec(`create role anon;create role authenticated;create role service_role;
 create table events(id uuid primary key,slug text unique,is_visible boolean default true);
 create table guests(id uuid primary key default gen_random_uuid(),name text not null,phone text unique not null,party_size integer not null,invite_token uuid not null default gen_random_uuid());
 create table guest_events(id uuid primary key default gen_random_uuid(),guest_id uuid not null references guests(id),event_id uuid not null references events(id),unique(guest_id,event_id));
 create table rsvps(id uuid primary key default gen_random_uuid(),guest_id uuid not null references guests(id),event_id uuid not null references events(id),attending boolean not null,unique(guest_id,event_id));`);
 await db.exec(fs.readFileSync(path.join(__dirname,'../../database/atomic-guest-saves.sql'),'utf8'));
});
test.beforeEach(async()=>{await db.exec('drop trigger if exists fail_assignment on guest_events;truncate guests,events,guest_events,rsvps cascade;');await db.query('insert into events(id,slug,is_visible) values($1,\'wedding\',true),($2,\'reception\',true),($3,\'mehndi\',false)',[e1,e2,hidden]);});
test.after(()=>db.close());
test('SQL creation saves all assignments and only service_role has function access',async()=>{
 const {created,guest}=await save('create',null,'Test','123',2,[e1,e2]);assert.equal(created,true);assert.deepEqual(guest.event_ids,[e1,e2]);assert.equal((await snapshot(guest.id)).invite_token,guest.invite_token);
 const result=(await db.query("select has_function_privilege('anon','public.save_guest_atomic(text,uuid,text,text,integer,uuid[])','execute') anon,has_function_privilege('authenticated','public.submit_rsvp_atomic(uuid,uuid,jsonb)','execute') authenticated,has_function_privilege('service_role','public.save_guest_atomic(text,uuid,text,text,integer,uuid[])','execute') service")).rows[0];assert.deepEqual(result,{anon:false,authenticated:false,service:true});
});
test('SQL assignment failure rolls back a new guest entirely',async()=>{
 await failAssignments();await assert.rejects(save('create',null,'Test','123',2,[e1,e2]),/Test assignment failure/);assert.equal((await db.query('select count(*)::int count from guests')).rows[0].count,0);assert.equal((await db.query('select count(*)::int count from guest_events')).rows[0].count,0);
});
test('SQL failed edit rolls back guest details and assignments, preserving the invitation',async()=>{
 const {guest}=await save('create',null,'Original','123',2,[e1]);const before=await snapshot(guest.id);await failAssignments();await assert.rejects(save('edit',guest.id,'Changed','456',5,[e2]),/Test assignment failure/);assert.deepEqual(await snapshot(guest.id),before);
});
test('SQL successful edit replaces assignments and details without replacing the token',async()=>{
 const {guest}=await save('create',null,'Original','123',2,[e1]);const {guest:updated}=await save('edit',guest.id,'Changed','456',5,[e2]);assert.equal(updated.invite_token,guest.invite_token);assert.deepEqual(updated.event_ids,[e2]);assert.equal((await snapshot(guest.id)).name,'Changed');
});
test('SQL saved RSVP locks event changes but permits explicit detail edits',async()=>{
 const {guest}=await save('create',null,'Original','123',2,[e1,e2,hidden]);assert.deepEqual(await rsvp(guest,[{event_id:e1,attending:true},{event_id:e2,attending:false}]),{success:true});await assert.rejects(save('edit',guest.id,'Changed','456',5,[e1]),/GUEST_RSVP_LOCKED/);assert.equal((await snapshot(guest.id)).name,'Original');const {guest:updated}=await save('edit',guest.id,'Changed','456',5,[e1,e2,hidden]);assert.equal(updated.responses.length,2);assert.equal(updated.invite_token,guest.invite_token);await assert.rejects(rsvp(guest,[{event_id:e1,attending:true},{event_id:e2,attending:true}]),/RSVP_ALREADY_SUBMITTED/);
});
test('SQL RSVP rejects an event snapshot that became stale after guest editing',async()=>{
 const {guest}=await save('create',null,'Original','123',2,[e1]);await save('edit',guest.id,'Original','123',2,[e2]);await assert.rejects(rsvp(guest,[{event_id:e1,attending:true}]),/EVENT_ASSIGNMENTS_CHANGED/);assert.equal((await db.query('select count(*)::int count from rsvps')).rows[0].count,0);assert.deepEqual(await rsvp(guest,[{event_id:e2,attending:true}]),{success:true});
});
test('SQL rejects invalid guests, duplicate phones, nonexistent events and forged choices',async()=>{
 await assert.rejects(save('create',null,'A','123',0,[e1]),/INVALID_GUEST/);await assert.rejects(save('create',null,'A','123',1,[e1,e1]),/INVALID_EVENTS/);await assert.rejects(save('create',null,'A','123',1,[missing]),/INVALID_EVENTS/);const {guest}=await save('create',null,'A','123',1,[e1]);await assert.rejects(save('create',null,'B','123',1,[e2]),/unique/);await assert.rejects(rsvp(guest,[{event_id:e1,attending:true}],e2),/GUEST_NOT_FOUND/);await assert.rejects(rsvp(guest,[{event_id:e1,attending:'true'}]),/INVALID_RESPONSES/);await assert.rejects(rsvp(guest,[{event_id:e1,attending:true},{event_id:e1,attending:false}]),/INVALID_RESPONSES/);
});
test('SQL CSV import is atomic per row and retains confirmed guest details',async()=>{
 const result=await save('import',null,'Imported','123',2,[e1]);assert.equal(result.created,true);assert.equal((await save('import',null,'Imported','123',2,[e1])).created,false);await assert.rejects(save('import',null,'Changed','123',3,[e2]),/IMPORT_ASSIGNMENTS_DIFFER/);await rsvp(result.guest,[{event_id:e1,attending:true}]);await assert.rejects(save('import',null,'Changed','123',3,[e1]),/IMPORT_DETAILS_LOCKED/);assert.equal((await snapshot(result.guest.id)).name,'Imported');
});
