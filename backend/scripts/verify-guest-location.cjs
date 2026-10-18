// No guest records are read or changed. An invalid RPC mode guarantees no writes.
const fs=require('node:fs'),path=require('node:path');
require('dotenv').config({path:path.join(__dirname,'../.env'),quiet:true});
const {createClient}=require('@supabase/supabase-js');
const settings={auth:{persistSession:false,autoRefreshToken:false}};
const args={p_mode:'verify-only-invalid',p_guest_id:null,p_name:null,p_phone:null,p_party_size:null,p_event_ids:[],p_tag_ids:null,p_new_tags:null,p_tag_mode:'replace',p_location:null};
async function main(){
 const service=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,settings);
 const column=await service.from('guests').select('location').limit(0);
 if(column.error)throw new Error(`Guest location column unavailable (${column.error.code})`);
 console.log('Location column: available (no guest data fetched)');
 const {error}=await service.rpc('save_guest_atomic_v3',args);
 if(error?.code!=='P0001'||error.message!=='INVALID_GUEST')throw new Error(`Location save RPC not ready (${error?.code||'unexpected success'})`);
 console.log('Transactional save RPC: available; invalid input rejected before writes');
 const source=fs.readFileSync(path.join(__dirname,'../../frontend/wedding-frontend/src/environments/environment.prod.ts'),'utf8');
 const key=source.match(/supabaseAnonKey:\s*['"]([^'"]+)['"]/)?.[1];
 if(!key)throw new Error('Public client configuration unavailable');
 const anon=createClient(process.env.SUPABASE_URL,key,settings);
 const denied=await anon.rpc('save_guest_atomic_v3',args);
 if(!denied.error||!['42501','PGRST202'].includes(denied.error.code))throw new Error('Anonymous RPC access not confirmed denied');
 console.log('Anonymous save RPC: denied');
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
