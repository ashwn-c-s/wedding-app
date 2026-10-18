// Read-only migration probes. The RPC receives an invalid mode and cannot save records.
const fs=require('node:fs');
const path=require('node:path');
require('dotenv').config({path:path.join(__dirname,'../.env'),quiet:true});
const {createClient}=require('@supabase/supabase-js');
const settings={auth:{persistSession:false,autoRefreshToken:false}};
const args={p_mode:'verify-only-invalid',p_guest_id:null,p_name:null,p_phone:null,p_party_size:null,p_event_ids:[],p_tag_ids:[],p_new_tags:[],p_tag_mode:'replace'};
async function main(){
 const service=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,settings);
 for(const [table,column] of [['guest_tags','id'],['guest_tag_assignments','guest_id']]){
  const {error}=await service.from(table).select(column).limit(0);
  if(error)throw new Error(`${table} is unavailable (${error.code || 'read failed'})`);
  console.log(`${table}: available`);
 }
 const {error}=await service.rpc('save_guest_atomic_v2',args);
 if(error?.code!=='P0001'||error.message!=='INVALID_GUEST')throw new Error(`Tag save RPC is not ready (${error?.code || 'unexpected success'})`);
 console.log('Service-role RPC: available; invalid input rejected before any write');
 const source=fs.readFileSync(path.join(__dirname,'../../frontend/wedding-frontend/src/environments/environment.prod.ts'),'utf8');
 const anonKey=source.match(/supabaseAnonKey:\s*['"]([^'"]+)['"]/)?.[1];
 if(!anonKey)throw new Error('Public client configuration unavailable');
 const anon=createClient(process.env.SUPABASE_URL,anonKey,settings);
 for(const [table,column] of [['guest_tags','id'],['guest_tag_assignments','guest_id']]){
  const {error}=await anon.from(table).select(column).limit(0);
  if(!error || !['42501','PGRST205'].includes(error.code))throw new Error(`${table}: anonymous access is not confirmed denied`);
  console.log(`${table}: anonymous read denied`);
 }
 const denied=await anon.rpc('save_guest_atomic_v2',args);
 if(!denied.error || !['42501','PGRST202'].includes(denied.error.code))throw new Error('Anonymous RPC access is not confirmed denied');
 console.log('Anonymous RPC: denied');
}
main().catch(error=>{console.error(`Guest-tag verification failed: ${error.message}`);process.exitCode=1;});
