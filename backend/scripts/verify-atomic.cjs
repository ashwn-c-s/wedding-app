// Read-only validation probes: both requests fail before any data mutation.
require('dotenv').config({quiet:true});
const {createClient}=require('@supabase/supabase-js');
const client=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
(async()=>{
  const checks=[
    ['save_guest_atomic',{p_mode:'verify',p_guest_id:null,p_name:'',p_phone:'',p_party_size:0,p_event_ids:[]},'INVALID_GUEST'],
    ['submit_rsvp_atomic',{p_guest_id:null,p_invite_token:null,p_responses:[]},'GUEST_NOT_FOUND'],
  ];
  for(const [name,args,expected] of checks){
    const {error}=await client.rpc(name,args);
    if(error?.code!=='P0001' || error.message!==expected) throw new Error(`${name} is not installed or did not pass its safe validation probe.`);
    console.log(`${name}: installed; validation probe passed without changing records.`);
  }
})().catch(error=>{console.error(error.message);process.exitCode=1;});
