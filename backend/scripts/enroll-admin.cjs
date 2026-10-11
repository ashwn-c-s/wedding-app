// Owner-operated tool only; never exposed through an HTTP endpoint.
// Requires explicit approval of the target email and role before running.
require('dotenv').config({quiet:true});
const {createClient}=require('@supabase/supabase-js');
const email=process.argv[2];
const role=process.argv[3];
if (!email || !['full','restricted'].includes(role)) {
  console.error('Usage: node scripts/enroll-admin.cjs EMAIL full|restricted');
  process.exit(1);
}
const client=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
(async()=>{
  let selected;
  for(let page=1;page<=100;page++) {
    const {data,error}=await client.auth.admin.listUsers({page,perPage:100});
    if(error) throw new Error('Unable to verify the existing Supabase Auth account');
    selected=data.users.find(user=>user.email?.toLowerCase()===email.toLowerCase());
    if(selected || data.users.length<100) break;
  }
  if(!selected) throw new Error('No existing Supabase Auth account matches the approved email. No changes made.');
  if(!selected.email_confirmed_at) throw new Error('Confirm this Supabase Auth email before enrollment. No changes made.');
  const {error}=await client.from('admin_users').upsert({user_id:selected.id,role},{onConflict:'user_id'});
  if(error) throw new Error('Unable to save the approved admin role');
  const {data:verified,error:readError}=await client.from('admin_users').select('role').eq('user_id',selected.id).single();
  if(readError || verified.role!==role) throw new Error('Admin role verification failed');
  console.log('Approved administrator enrollment verified.');
})().catch(error=>{console.error(error.message);process.exitCode=1;});
