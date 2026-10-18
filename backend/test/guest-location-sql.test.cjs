const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {PGlite}=require('@electric-sql/pglite');const db=new PGlite();
const event='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222';
const location={type:'coordinates',latitude:10.5,longitude:76.2,accuracy_m:8,address:'Home'};
async function save(mode='create',id=null,loc=location,name='Guest',events=[event],tags=['Office']) {return(await db.query('select save_guest_atomic_v3($1,$2,$3,\'123\',2,$4::uuid[],null,$5::text[],\'replace\',$6::jsonb) result',[mode,id,name,events,tags,JSON.stringify(loc)])).rows[0].result;}
async function snapshot(){return(await db.query("select (select jsonb_agg(g order by id) from guests g) guests,(select jsonb_agg(t order by id) from guest_tags t) tags,(select jsonb_agg(a order by guest_id,tag_id) from guest_tag_assignments a) assignments,(select jsonb_agg(e order by id) from guest_events e) events")).rows[0];}
test.before(async()=>{
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
 create table events(id uuid primary key,is_visible boolean default true);
 create table guests(id uuid primary key default gen_random_uuid(),name text not null,phone text unique not null,party_size integer not null,invite_token uuid not null default gen_random_uuid());
 create table guest_events(id uuid primary key default gen_random_uuid(),guest_id uuid references guests(id),event_id uuid references events(id),unique(guest_id,event_id));
 create table rsvps(id uuid primary key default gen_random_uuid(),guest_id uuid references guests(id),event_id uuid references events(id),attending boolean,unique(guest_id,event_id));`);
 for(const file of ['atomic-guest-saves.sql','guest-tags.sql','guest-location.sql','guest-location.sql'])await db.exec(fs.readFileSync(path.join(__dirname,'../../database',file),'utf8'));
});
test.beforeEach(async()=>{await db.exec('drop trigger if exists reject_location on guests;truncate guest_tags,guest_tag_assignments,guests,events,guest_events,rsvps cascade');await db.query('insert into events(id) values($1),($2)',[event,other]);});test.after(()=>db.close());
test('location creates and edits atomically, can be removed, and keeps invitation and RSVP',async()=>{
 const first=await save();assert.deepEqual(first.guest.location,location);
 await db.query('insert into rsvps(guest_id,event_id,attending) values($1,$2,true)',[first.guest.id,event]);
 const maps={type:'maps',maps_url:'https://maps.app.goo.gl/example',address:null};
 const updated=await save('edit',first.guest.id,maps);assert.deepEqual(updated.guest.location,maps);assert.equal(updated.guest.invite_token,first.guest.invite_token);assert.equal(updated.guest.responses.length,1);
 assert.equal((await save('edit',first.guest.id,null)).guest.location,null);
});
test('legacy edits and CSV imports preserve stored location',async()=>{
 const {guest}=await save();
 await db.query('select save_guest_atomic($1,null,\'Guest\',\'123\',2,$2::uuid[])',['import',[event]]);
 await db.query('select save_guest_atomic_v2(\'edit\',$1,\'Guest\',\'123\',2,$2::uuid[])',[guest.id,[event]]);
 assert.deepEqual((await db.query('select location from guests where id=$1',[guest.id])).rows[0].location,location);
});
test('location write failure rolls back guest details, new tags and event replacements',async()=>{
 const {guest}=await save();const before=await snapshot();
 await db.exec("create or replace function reject_test_location() returns trigger language plpgsql as $$begin if new.location->>'address'='reject' then raise exception 'test location failure';end if;return new;end;$$;create trigger reject_location before update on guests for each row execute function reject_test_location();");
 await assert.rejects(save('edit',guest.id,{...location,address:'reject'},'Changed',[other],['New tag']),/test location failure/);assert.deepEqual(await snapshot(),before);
});
test('invalid locations never save and database constraints defend direct writes',async()=>{
 for(const loc of [{type:'coordinates',latitude:91,longitude:0},{type:'coordinates',latitude:null,longitude:0},{type:'coordinates',latitude:0,longitude:0,accuracy_m:-1},{type:'maps',maps_url:'https://maps.app.goo.gl.evil.test/x'},{type:'maps',maps_url:'javascript:alert(1)'},{type:'maps',maps_url:'https://www.google.com/search'}, {type:'maps',maps_url:'https://maps.app.goo.gl/x',extra:'x'}])await assert.rejects(save('create',null,loc),/INVALID_LOCATION/);
 assert.equal((await db.query('select count(*)::int n from guests')).rows[0].n,0);
 const {guest}=await save();await assert.rejects(db.query('update guests set location=$1 where id=$2',[JSON.stringify({type:'coordinates',latitude:0}),guest.id]),/check constraint/);
});
test('new RPC is callable only by the service role',async()=>{
 const signature='save_guest_atomic_v3(text,uuid,text,text,integer,uuid[],uuid[],text[],text,jsonb)';
 const result=(await db.query("select has_function_privilege('anon',$1,'execute') anon,has_function_privilege('authenticated',$1,'execute') authenticated,has_function_privilege('service_role',$1,'execute') service",[signature])).rows[0];assert.deepEqual(result,{anon:false,authenticated:false,service:true});
});
