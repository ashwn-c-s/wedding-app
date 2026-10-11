const test=require('node:test');
const assert=require('node:assert/strict');
const {once}=require('node:events');
process.env.SUPABASE_SERVICE_ROLE_KEY='test-gallery-secret';
let role='full',user='admin',plans=[],object={size:100,contentType:'image/jpeg'},signError=null;
const ok=data=>({data,error:null});
const storage={getPublicUrl:path=>({data:{publicUrl:`https://photos.example/${path}`}}),createSignedUploadUrl:async path=>{assert.match(path,/^(pre|post)\/[\da-f-]{36}\.(jpg|png|webp)$/);return signError?{error:signError}:ok({token:'storage-token'});},info:async()=>ok(object)};
const db={auth:{getUser:async()=>ok({user:{id:user}})},storage:{from:bucket=>{assert.equal(bucket,'wedding-photos');return storage;}},from(table){
  if(table==='admin_users')return {select:()=>({eq:()=>({maybeSingle:async()=>ok({role})})})};
  assert.equal(table,'photos');const plan=plans.shift();assert.ok(plan,'Unexpected photo query');const calls=[];
  const query=new Proxy({},{get:(_,prop)=>prop==='then'?(resolve,reject)=>Promise.resolve(typeof plan==='function'?plan(calls):plan).then(resolve,reject):(...args)=>{calls.push([prop,...args]);return query;}});return query;
}};
const path=require.resolve('../dist/lib/supabase');require.cache[path]={id:path,filename:path,loaded:true,exports:{supabase:db}};
const app=require('../dist/index').default;const server=app.listen(0,'127.0.0.1');
async function request(endpoint,body,auth=true){if(!server.listening)await once(server,'listening');const response=await fetch(`http://127.0.0.1:${server.address().port}/api/${endpoint}`,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json',...(auth?{Authorization:'Bearer jwt'}:{})},body:body===undefined?undefined:JSON.stringify(body)});const data=await response.json();assert.equal(plans.length,0);return {status:response.status,data};}
const draft={album:'pre',type:'image/jpeg',size:100,caption:'A memory'};
async function prepare(){return (await request('admin/gallery/upload',draft)).data;}
test.beforeEach(()=>{role='full';user='admin';plans=[];object={size:100,contentType:'image/jpeg'};signError=null;});test.after(()=>server.close());
test('gallery returns public photo fields without guest identifiers',async()=>{
  plans=[calls=>{assert.ok(calls.some(call=>call[0]==='range'));return ok([{id:'p',storage_path:'pre/p.jpg',caption:'A memory',album_type:'pre',created_at:'now',guest_id:'secret'}]);}];
  const result=await request('gallery',undefined,false);assert.equal(result.status,200);assert.deepEqual(result.data.photos,[{id:'p',caption:'A memory',album_type:'pre',created_at:'now',url:'https://photos.example/pre/p.jpg'}]);
});
test('unavailable gallery returns retryable failure',async()=>{plans=[{error:{message:'unavailable'}}];assert.equal((await request('gallery',undefined,false)).status,503);});
test('anonymous and restricted users cannot sign or publish photos',async()=>{
  for(const endpoint of ['upload','publish']){assert.equal((await request(`admin/gallery/${endpoint}`,{},false)).status,401);role='restricted';assert.equal((await request(`admin/gallery/${endpoint}`,{})).status,403);}
});
test('invalid image type, album, size and caption never reach storage',async()=>{
  for(const change of [{type:'image/svg+xml'},{album:'other'},{size:16*1024*1024},{size:0},{caption:'x'.repeat(301)}])assert.equal((await request('admin/gallery/upload',{...draft,...change})).status,400);
});
test('signing errors return a retryable response',async()=>{signError={message:'storage offline'};assert.equal((await request('admin/gallery/upload',draft)).status,503);});
test('publication rejects tampered and different-administrator intents',async()=>{
  const upload=await prepare();assert.equal((await request('admin/gallery/publish',{intent:upload.intent+'tampered'})).status,400);
  user='other';assert.equal((await request('admin/gallery/publish',{intent:upload.intent})).status,400);
});
test('publication verifies the stored file and inserts server-authorized values',async()=>{
  const upload=await prepare();const intent=JSON.parse(Buffer.from(upload.intent.split('.')[0],'base64url'));
  plans=[ok(null),calls=>{const insert=calls.find(call=>call[0]==='insert')[1];assert.deepEqual(insert,{id:intent.id,storage_path:upload.path,caption:'A memory',album_type:'pre'});return ok({...insert,created_at:'now'});}];
  assert.equal((await request('admin/gallery/publish',{intent:upload.intent,album:'post',path:'other/file'})).status,201);
});
test('file mismatch cannot create a gallery record',async()=>{const upload=await prepare();object={size:101,contentType:'image/jpeg'};plans=[ok(null)];assert.equal((await request('admin/gallery/publish',{intent:upload.intent})).status,400);});
test('retrying a published intent returns the same record without another insert',async()=>{const upload=await prepare();plans=[ok({id:'same',storage_path:upload.path,album_type:'pre',caption:'A memory',created_at:'now'})];const result=await request('admin/gallery/publish',{intent:upload.intent});assert.equal(result.status,200);assert.equal(result.data.photo.id,'same');});
test('publication database failure can be retried without another upload',async()=>{const upload=await prepare();plans=[ok(null),{error:{code:'503'}}];const result=await request('admin/gallery/publish',{intent:upload.intent});assert.equal(result.status,503);assert.match(result.data.error,/Retry publishing/);});
