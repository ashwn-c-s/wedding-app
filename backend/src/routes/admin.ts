import {Router} from 'express';
import {atomicError} from '../lib/atomic';
import {allRows} from '../lib/pagination';
import {supabase} from '../lib/supabase';
import {adminAuth,fullAdmin,AdminRequest} from '../middleware/adminAuth';
import {parseCsv,summarize,uuid,validateEventPatch} from '../lib/validation';
import {readTags,tagName,tagInput,validateTaggedGuest,guestRpc} from '../lib/tags';
const router = Router();
router.use(adminAuth);
router.get('/session',(req:AdminRequest,res)=>{res.json({role:req.admin!.role});});
router.get('/guests',fullAdmin,async (_req,res)=>{
  const [guests,assignments,responses,tags] = await Promise.all([
    allRows((from,to)=>supabase.from('guests').select('id,name,phone,party_size,invite_token,created_at').order('name').order('id').range(from,to)),
    allRows((from,to)=>supabase.from('guest_events').select('guest_id,event_id').order('id').range(from,to)),allRows((from,to)=>supabase.from('rsvps').select('guest_id,event_id,attending').order('id').range(from,to)),readTags()]);
  if(guests.error || assignments.error || responses.error || tags.error) {res.status(503).json({error:'Failed to load guests'});return;}
  res.json({tags:tags.tags,guests:(guests.data ?? []).map(guest=>({...guest,tags:tags.byGuest.get(guest.id)||[],event_ids:(assignments.data ?? []).filter(a=>a.guest_id===guest.id).map(a=>a.event_id),responses:(responses.data ?? []).filter(r=>r.guest_id===guest.id).map(r=>({event_id:r.event_id,attending:r.attending}))}))});
});
router.post('/guests',fullAdmin,async (req,res)=>{
  let input;try {input=validateTaggedGuest(req.body);}catch(error){res.status(400).json({error:(error as Error).message});return;}
  const {data,error}=await guestRpc('create',null,input);
  if(error){const failure=atomicError(error,'Unable to create guest. Nothing was saved.','A guest with this phone already exists. Edit that guest instead.');res.status(failure.status).json({error:failure.error});return;}
  res.status(201).json({guest:data.guest});
});
router.patch('/guests/:id',fullAdmin,async (req,res)=>{
  const id=req.params.id;
  if(typeof id!=='string' || !uuid.test(id)){res.status(400).json({error:'Invalid guest ID'});return;}
  let input;try {input=validateTaggedGuest(req.body);}catch(error){res.status(400).json({error:(error as Error).message});return;}
  const {data,error}=await guestRpc('edit',id,input);
  if(error){const failure=atomicError(error,'Unable to save guest. Nothing was changed.','Another guest already uses this phone number.');res.status(failure.status).json({error:failure.error});return;}
  res.json({guest:data.guest});
});
router.post('/guests/import',fullAdmin,async (req,res)=>{
  if(typeof req.body?.csv !== 'string' || req.body.csv.length > 500000) {res.status(400).json({error:'Supply CSV text (maximum 500 KB)'});return;}
  let rows:string[][];
  try { rows = parseCsv(req.body.csv.replace(/^\uFEFF/,'')); } catch(error) {res.status(400).json({error:(error as Error).message});return;}
  const hasTags=rows[0]?.join(',')==='name,phone,party_size,events,tags';
  if(rows.length < 2 || rows.length > 1001 || (!hasTags && rows[0].join(',') !== 'name,phone,party_size,events')) {res.status(400).json({error:'CSV requires name,phone,party_size,events headers, an optional final tags column, and 1–1000 records'});return;}
  const {data:events,error} = await supabase.from('events').select('id,slug');
  if(error) {res.status(503).json({error:'Unable to validate events'});return;}
  const results:{row:number;phone?:string;status:'created'|'updated'|'error';message?:string}[] = [];
  const seen = new Set<string>();
  for(let i=1;i<rows.length;i++) {
    const [name,phone,size,eventText,tagText] = rows[i];
    try {
      if(rows[i].length !== (hasTags?5:4) || !name || name.length > 200 || !phone || phone.length > 50 || !/^\d+$/.test(size) || !Number.isSafeInteger(Number(size)) || Number(size)<1 || Number(size)>1000) throw new Error('Invalid name, phone, or party size');
      if(seen.has(phone)) throw new Error('Duplicate phone within this CSV'); seen.add(phone);
      const slugs = eventText.split('+').map(s=>s.trim());
      if(!slugs.length || slugs.some(s=>!s) || new Set(slugs).size !== slugs.length) throw new Error('Supply unique event slugs separated by +');
      const eventIds = slugs.map(slug=>events?.find(event=>event.slug===slug)?.id);
      if(eventIds.some(id=>!id)) throw new Error('Unknown event slug');
      const tags=hasTags && tagText?.trim()?tagInput({new_tags:tagText.split('|')}):{};
      const {data:saved,error:saveError}=await guestRpc('import',null,{name,phone,party_size:Number(size),event_ids:eventIds as string[],...tags});
      if(saveError) throw new Error(atomicError(saveError,'Unable to save this row. Nothing was changed for this row.','Phone already exists; refresh and retry this row.').error);
      results.push({row:i+1,phone,status:saved.created?'created':'updated'});
    } catch(error) {results.push({row:i+1,phone,status:'error',message:(error as Error).message});}
  }
  res.json({results,created:results.filter(r=>r.status==='created').length,updated:results.filter(r=>r.status==='updated').length,failed:results.filter(r=>r.status==='error').length});
});
router.get('/rsvps',async (req:AdminRequest,res)=>{
  const [guests,events,responses,assignments,tags] = await Promise.all([
    allRows((from,to)=>supabase.from('guests').select('id,name,party_size').order('name').order('id').range(from,to)),supabase.from('events').select('*').order('date'),
    allRows((from,to)=>supabase.from('rsvps').select('guest_id,event_id,attending,submitted_at').order('id').range(from,to)),allRows((from,to)=>supabase.from('guest_events').select('guest_id,event_id').order('id').range(from,to)),req.admin!.role==='full'?readTags():Promise.resolve(null)]);
  if(guests.error || events.error || responses.error || assignments.error || tags?.error) {res.status(503).json({error:'Failed to load RSVP dashboard'});return;}
  res.json({...tags?{tags:tags.tags}:{},guests:(guests.data ?? []).map(guest=>({...guest,...tags?{tags:tags.byGuest.get(guest.id)||[]}:{},event_ids:(assignments.data ?? []).filter(a=>a.guest_id===guest.id).map(a=>a.event_id)})),events:events.data ?? [],responses:responses.data ?? [],...summarize(guests.data ?? [],events.data ?? [],assignments.data ?? [],responses.data ?? [])});
});
router.get('/tags',fullAdmin,async (_req,res)=>{
  const tags=await readTags();if(tags.error){res.status(503).json({error:'Unable to load tags'});return;}res.json({tags:tags.tags});
});
router.post('/tags',fullAdmin,async (req,res)=>{
  let name;try{name=tagName(req.body?.name);}catch(error){res.status(400).json({error:(error as Error).message});return;}
  const existing=await supabase.from('guest_tags').select('id,name').eq('name_normalized',name.toLowerCase()).maybeSingle();
  if(existing.error){res.status(503).json({error:'Unable to verify tag'});return;}
  if(existing.data){res.json({tag:existing.data});return;}
  const result=await supabase.from('guest_tags').insert({name}).select('id,name').single();
  if(result.error?.code==='23505'){const retry=await supabase.from('guest_tags').select('id,name').eq('name_normalized',name.toLowerCase()).single();if(!retry.error){res.json({tag:retry.data});return;}}
  if(result.error){res.status(503).json({error:'Unable to create tag'});return;}res.status(201).json({tag:result.data});
});
router.patch('/tags/:id',fullAdmin,async (req,res)=>{
  if(typeof req.params.id!=='string'||!uuid.test(req.params.id)){res.status(400).json({error:'Invalid tag ID'});return;}
  let name;try{name=tagName(req.body?.name);}catch(error){res.status(400).json({error:(error as Error).message});return;}
  const {data,error}=await supabase.from('guest_tags').update({name}).eq('id',req.params.id).select('id,name').maybeSingle();
  if(error){res.status(error.code==='23505'?409:503).json({error:error.code==='23505'?'A tag with that name already exists.':'Unable to rename tag'});return;}
  if(!data){res.status(404).json({error:'Tag not found'});return;}res.json({tag:data});
});
router.get('/events',fullAdmin,async (_req,res)=>{
  const {data,error} = await supabase.from('events').select('*').order('date');
  if(error) {res.status(503).json({error:'Failed to load events'});return;}res.json({events:data ?? []});
});
router.post('/events',fullAdmin,async (req,res)=>{
  let event;try {
    event=validateEventPatch(req.body);
    if(!event.slug || !event.name || !event.date) throw new Error('Event slug, name, and date are required');
  }catch(error){res.status(400).json({error:(error as Error).message});return;}
  const {data,error}=await supabase.from('events').insert(event).select('*').single();
  if(error || !data){res.status(error?.code==='23505'?409:503).json({error:error?.code==='23505'?'Event slug already exists':'Unable to create event'});return;}
  res.status(201).json({event:data});
});
router.patch('/events/:id',fullAdmin,async (req,res)=>{
  if(typeof req.params.id !== 'string' || !uuid.test(req.params.id)) {res.status(400).json({error:'Invalid event ID'});return;}
  let patch;try{patch=validateEventPatch(req.body);}catch(error){res.status(400).json({error:(error as Error).message});return;}
  const {data,error} = await supabase.from('events').update(patch).eq('id',req.params.id).select('*').maybeSingle();
  if(error) {res.status(error.code==='23505'?409:503).json({error:error.code==='23505'?'Event slug already exists':'Failed to update event'});return;}
  if(!data) {res.status(404).json({error:'Event not found'});return;}res.json({event:data});
});
export default router;
