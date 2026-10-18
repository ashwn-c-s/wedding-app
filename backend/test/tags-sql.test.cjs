const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {PGlite}=require('@electric-sql/pglite');const db=new PGlite();
const event='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222',missing='33333333-3333-4333-8333-333333333333';
async function save(mode='create',id=null,name='Guest',phone='123',tags=[],names=[],tagMode=mode==='import'?'add':'replace',events=[event]){return (await db.query('select save_guest_atomic_v2($1,$2,$3,$4,2,$5::uuid[],$6::uuid[],$7::text[],$8) result',[mode,id,name,phone,events,tags,names,tagMode])).rows[0].result;}
async function snapshot(){return (await db.query("select (select json_agg(g order by id) from guests g) guests,(select json_agg(a order by guest_id,tag_id) from guest_tag_assignments a) assignments,(select json_agg(t order by id) from guest_tags t) tags,(select json_agg(e order by id) from guest_events e) events")).rows[0];}
test.before(async()=>{
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
 create table events(id uuid primary key,is_visible boolean default true);
 create table guests(id uuid primary key default gen_random_uuid(),name text not null,phone text unique not null,party_size integer not null,invite_token uuid not null default gen_random_uuid());
 create table guest_events(id uuid primary key default gen_random_uuid(),guest_id uuid references guests(id),event_id uuid references events(id),unique(guest_id,event_id));
 create table rsvps(id uuid primary key default gen_random_uuid(),guest_id uuid references guests(id),event_id uuid references events(id),attending boolean,unique(guest_id,event_id));`);
 for(const file of ['atomic-guest-saves.sql','guest-tags.sql'])await db.exec(fs.readFileSync(path.join(__dirname,'../../database',file),'utf8'));
 // A reviewed migration can be rerun without duplicating tables or labels.
 await db.exec(fs.readFileSync(path.join(__dirname,'../../database/guest-tags.sql'),'utf8'));
});
test.beforeEach(async()=>{await db.exec('truncate guest_tags,guest_tag_assignments,guests,events,guest_events,rsvps cascade');await db.query('insert into events(id) values($1),($2)',[event,other]);});test.after(()=>db.close());
test('guest, events and normalized tags save together without duplicate catalogue entries',async()=>{
 const first=await save('create',null,'One','123',[],[' Office   friends ','office friends']);assert.equal(first.guest.tags.length,1);assert.equal(first.guest.tags[0].name,'Office friends');
 const second=await save('create',null,'Two','456',[],['OFFICE FRIENDS']);assert.equal(first.guest.tags[0].id,second.guest.tags[0].id);assert.equal((await db.query('select count(*)::int n from guest_tags')).rows[0].n,1);
});
test('tag validation failure rolls back guest, events and newly created labels',async()=>{
 await assert.rejects(save('create',null,'One','123',[],['Office','invalid|tag']),/INVALID_TAGS/);assert.deepEqual(await snapshot(),{guests:null,assignments:null,tags:null,events:null});
 await assert.rejects(save('create',null,'One','123',[missing],[]),/TAG_NOT_FOUND/);assert.equal((await db.query('select count(*)::int n from guests')).rows[0].n,0);
});
test('tag edits preserve RSVP and invitation token, while event locks remain enforced',async()=>{
 const {guest}=await save('create',null,'One','123',[],['Office']);await db.query('insert into rsvps(guest_id,event_id,attending) values($1,$2,true)',[guest.id,event]);
 const edit=await save('edit',guest.id,'One','123',[],["Father's relatives"]);assert.equal(edit.guest.invite_token,guest.invite_token);assert.equal(edit.guest.responses.length,1);assert.equal(edit.guest.tags[0].name,"Father's relatives");
 const before=await snapshot();await assert.rejects(save('edit',guest.id,'Changed','123',[],['School'],'replace',[other]),/GUEST_RSVP_LOCKED/);assert.deepEqual(await snapshot(),before);
});
test('removing a guest label keeps the shared tag and other guest assignments',async()=>{
 const one=await save('create',null,'One','123',[],['Office']);const two=await save('create',null,'Two','456',[],['Office']);
 const edit=await save('edit',one.guest.id,'One','123',[],[]);assert.deepEqual(edit.guest.tags,[]);assert.equal((await db.query('select count(*)::int n from guest_tags')).rows[0].n,1);assert.equal((await db.query('select guest_id from guest_tag_assignments')).rows[0].guest_id,two.guest.id);
});
test('CSV tag additions preserve prior labels; omitted tags preserve everything',async()=>{
 const {guest}=await save('import',null,'One','123',[],['Office']);const edit=await save('import',null,'One','123',[],['School']);assert.equal(edit.guest.tags.length,2);
 const unchanged=await save('import',null,'One','123',null,null);assert.equal(unchanged.guest.tags.length,2);
 const legacy=(await db.query('select save_guest_atomic($1,null,$2,$3,2,$4::uuid[]) result',['import','One','123',[event]])).rows[0].result;assert.equal(legacy.guest.id,guest.id);assert.equal((await db.query('select count(*)::int n from guest_tag_assignments')).rows[0].n,2);
});
test('more than ten combined tags rolls back the entire import row',async()=>{
 const initial=await save('create',null,'One','123',[],Array.from({length:10},(_,i)=>'Tag '+i));const before=await snapshot();await assert.rejects(save('import',null,'One','123',[],['Extra']),/TOO_MANY_TAGS/);assert.deepEqual(await snapshot(),before);assert.equal(initial.guest.tags.length,10);
});
test('rename applies globally and duplicate normalized names are rejected',async()=>{
 const {guest}=await save('create',null,'One','123',[],['Office','School']);await db.query('update guest_tags set name=$1 where id=$2',['Colleagues',guest.tags.find(t=>t.name==='Office').id]);
 const edit=await save('edit',guest.id,'One','123',null,null);assert.ok(edit.guest.tags.some(t=>t.name==='Colleagues'));await assert.rejects(db.query('insert into guest_tags(name) values($1)',['colleagues']),/unique/);
});
test('new tables deny anonymous/authenticated access and only service role can run the RPC',async()=>{
 const result=(await db.query("select has_table_privilege('anon','guest_tags','select') anon,has_table_privilege('authenticated','guest_tag_assignments','insert') authenticated,has_function_privilege('anon','save_guest_atomic_v2(text,uuid,text,text,integer,uuid[],uuid[],text[],text)','execute') rpc_anon,has_function_privilege('service_role','save_guest_atomic_v2(text,uuid,text,text,integer,uuid[],uuid[],text[],text)','execute') rpc_service,(select relrowsecurity from pg_class where oid='guest_tags'::regclass) rls")).rows[0];assert.deepEqual(result,{anon:false,authenticated:false,rpc_anon:false,rpc_service:true,rls:true});
});
