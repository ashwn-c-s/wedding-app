import {Router} from 'express';
import {allRows} from '../lib/pagination';
import {supabase} from '../lib/supabase';
import {adminAuth,fullAdmin,AdminRequest} from '../middleware/adminAuth';
import {parseCsv,summarize,uuid,validateEventPatch,validateGuest} from '../lib/validation';
const router = Router();
router.use(adminAuth);
router.get('/session',(req:AdminRequest,res)=>{res.json({role:req.admin!.role});});
router.get('/guests',fullAdmin,async (_req,res)=>{
  const [guests,assignments,responses] = await Promise.all([
    allRows((from,to)=>supabase.from('guests').select('id,name,phone,party_size,invite_token,created_at').order('name').order('id').range(from,to)),
    allRows((from,to)=>supabase.from('guest_events').select('guest_id,event_id').order('id').range(from,to)),allRows((from,to)=>supabase.from('rsvps').select('guest_id,event_id,attending').order('id').range(from,to))]);
  if(guests.error || assignments.error || responses.error) {res.status(503).json({error:'Failed to load guests'});return;}
  res.json({guests:(guests.data ?? []).map(guest=>({...guest,event_ids:(assignments.data ?? []).filter(a=>a.guest_id===guest.id).map(a=>a.event_id),responses:(responses.data ?? []).filter(r=>r.guest_id===guest.id).map(r=>({event_id:r.event_id,attending:r.attending}))}))});
});
router.post('/guests',fullAdmin,async (req,res)=>{
  let input;try {input=validateGuest(req.body);}catch(error){res.status(400).json({error:(error as Error).message});return;}
  const {event_ids,...details}=input;
  const {data:events,error:eventError}=await supabase.from('events').select('id').in('id',event_ids);
  if(eventError){res.status(503).json({error:'Unable to validate events'});return;}
  if(events?.length!==event_ids.length){res.status(400).json({error:'An event no longer exists. Refresh and choose again.'});return;}
  const {data:guest,error}=await supabase.from('guests').insert(details).select('id,name,phone,party_size,invite_token').single();
  if(error || !guest){res.status(error?.code==='23505'?409:503).json({error:error?.code==='23505'?'A guest with this phone already exists. Edit that guest instead.':'Unable to create guest'});return;}
  const {error:assignmentError}=await supabase.from('guest_events').insert(event_ids.map(event_id=>({guest_id:guest.id,event_id})));
  if(assignmentError){res.status(503).json({error:'Guest created, but events could not be assigned. Refresh and edit this guest before sharing the invitation.',guest_id:guest.id});return;}
  res.status(201).json({guest:{...guest,event_ids,responses:[]}});
});
router.patch('/guests/:id',fullAdmin,async (req,res)=>{
  const id=req.params.id;
  if(typeof id!=='string' || !uuid.test(id)){res.status(400).json({error:'Invalid guest ID'});return;}
  let input;try {input=validateGuest(req.body);}catch(error){res.status(400).json({error:(error as Error).message});return;}
  const {event_ids,...details}=input;
  const {data:guest,error:guestError}=await supabase.from('guests').select('id,invite_token').eq('id',id).maybeSingle();
  if(guestError){res.status(503).json({error:'Unable to load guest'});return;}
  if(!guest){res.status(404).json({error:'Guest not found'});return;}
  const [assigned,saved,events]=await Promise.all([
    supabase.from('guest_events').select('event_id').eq('guest_id',id),
    supabase.from('rsvps').select('event_id,attending').eq('guest_id',id),
    supabase.from('events').select('id').in('id',event_ids)]);
  if(assigned.error || saved.error || events.error){res.status(503).json({error:'Unable to verify guest events'});return;}
  if(events.data?.length!==event_ids.length){res.status(400).json({error:'An event no longer exists. Refresh and choose again.'});return;}
  const previous=(assigned.data ?? []).map(row=>row.event_id);
  const additions=event_ids.filter(eventId=>!previous.includes(eventId));
  const removals=previous.filter(eventId=>!event_ids.includes(eventId));
  if(saved.data?.length && (additions.length || removals.length)){res.status(409).json({error:'This guest has already submitted an RSVP. Keep their invited events unchanged; their details can still be edited.'});return;}
  // Preserve the invitation token and all saved RSVP rows. The existing schema
  // exposes separate REST writes; partial saves are reported for reconciliation.
  const {data:updated,error}=await supabase.from('guests').update(details).eq('id',id).select('id,name,phone,party_size,invite_token').maybeSingle();
  if(error){res.status(error.code==='23505'?409:503).json({error:error.code==='23505'?'Another guest already uses this phone number.':'Unable to save guest details'});return;}
  if(!updated){res.status(404).json({error:'Guest not found'});return;}
  if(additions.length){
    const {error:assignmentError}=await supabase.from('guest_events').upsert(additions.map(event_id=>({guest_id:id,event_id})),{onConflict:'guest_id,event_id',ignoreDuplicates:true});
    if(assignmentError){res.status(503).json({error:'Guest details saved, but event assignment failed. Refresh and review this guest before retrying.'});return;}
  }
  if(removals.length){
    const {error:removalError}=await supabase.from('guest_events').delete().eq('guest_id',id).in('event_id',removals);
    if(removalError){res.status(503).json({error:'Guest details and new events saved, but some old events could not be removed. Refresh and review this guest.'});return;}
  }
  res.json({guest:{...updated,event_ids,responses:saved.data ?? []}});
});
router.post('/guests/import',fullAdmin,async (req,res)=>{
  if(typeof req.body?.csv !== 'string' || req.body.csv.length > 500000) {res.status(400).json({error:'Supply CSV text (maximum 500 KB)'});return;}
  let rows:string[][];
  try { rows = parseCsv(req.body.csv.replace(/^\uFEFF/,'')); } catch(error) {res.status(400).json({error:(error as Error).message});return;}
  if(rows.length < 2 || rows.length > 1001 || rows[0].join(',') !== 'name,phone,party_size,events') {res.status(400).json({error:'CSV requires name,phone,party_size,events headers and 1–1000 records'});return;}
  const {data:events,error} = await supabase.from('events').select('id,slug');
  if(error) {res.status(503).json({error:'Unable to validate events'});return;}
  const results:{row:number;phone?:string;status:'created'|'updated'|'error';message?:string}[] = [];
  const seen = new Set<string>();
  for(let i=1;i<rows.length;i++) {
    const [name,phone,size,eventText] = rows[i];
    try {
      if(rows[i].length !== 4 || !name || name.length > 200 || !phone || phone.length > 50 || !/^\d+$/.test(size) || !Number.isSafeInteger(Number(size)) || Number(size)<1 || Number(size)>1000) throw new Error('Invalid name, phone, or party size');
      if(seen.has(phone)) throw new Error('Duplicate phone within this CSV'); seen.add(phone);
      const slugs = eventText.split('+').map(s=>s.trim());
      if(!slugs.length || slugs.some(s=>!s) || new Set(slugs).size !== slugs.length) throw new Error('Supply unique event slugs separated by +');
      const eventIds = slugs.map(slug=>events?.find(event=>event.slug===slug)?.id);
      if(eventIds.some(id=>!id)) throw new Error('Unknown event slug');
      const {data:existing,error:guestError} = await supabase.from('guests').select('id,name,party_size').eq('phone',phone).maybeSingle();
      if(guestError) throw new Error('Unable to check existing guest');
      // Never remove assignments or overwrite guest details after an RSVP. Existing
      // assignments must exactly match the import so re-import cannot broaden access.
      if(existing) {
        const [saved,assigned] = await Promise.all([supabase.from('rsvps').select('id').eq('guest_id',existing.id).limit(1),supabase.from('guest_events').select('event_id').eq('guest_id',existing.id)]);
        if(saved.error || assigned.error) throw new Error('Unable to verify existing RSVP and event assignments');
        const assignedIds = (assigned.data ?? []).map(a=>a.event_id);
        if(assignedIds.length !== eventIds.length || assignedIds.some(id=>!eventIds.includes(id))) throw new Error('Existing event assignments differ; import cannot change them safely');
        if(saved.data?.length && (existing.name !== name || existing.party_size !== Number(size))) throw new Error('Confirmed guest details are locked');
        if(!saved.data?.length) {const {error:updateError} = await supabase.from('guests').update({name,party_size:Number(size)}).eq('id',existing.id);if(updateError) throw new Error('Unable to update guest');}
        results.push({row:i+1,phone,status:'updated'});
      } else {
        const {data:created,error:createError} = await supabase.from('guests').insert({name,phone,party_size:Number(size)}).select('id').single();
        if(createError || !created) throw new Error('Unable to create guest (phone may already exist); retry import');
        const {error:assignError} = await supabase.from('guest_events').insert(eventIds.map(event_id=>({guest_id:created.id,event_id})));
        if(assignError) throw new Error('Guest created but event assignment failed; administrator must reconcile assignments before sharing invitation');
        results.push({row:i+1,phone,status:'created'});
      }
    } catch(error) {results.push({row:i+1,phone,status:'error',message:(error as Error).message});}
  }
  res.json({results,created:results.filter(r=>r.status==='created').length,updated:results.filter(r=>r.status==='updated').length,failed:results.filter(r=>r.status==='error').length});
});
router.get('/rsvps',async (_req,res)=>{
  const [guests,events,responses,assignments] = await Promise.all([
    allRows((from,to)=>supabase.from('guests').select('id,name,party_size').order('name').order('id').range(from,to)),supabase.from('events').select('*').order('date'),
    allRows((from,to)=>supabase.from('rsvps').select('guest_id,event_id,attending,submitted_at').order('id').range(from,to)),allRows((from,to)=>supabase.from('guest_events').select('guest_id,event_id').order('id').range(from,to))]);
  if(guests.error || events.error || responses.error || assignments.error) {res.status(503).json({error:'Failed to load RSVP dashboard'});return;}
  res.json({guests:(guests.data ?? []).map(guest=>({...guest,event_ids:(assignments.data ?? []).filter(a=>a.guest_id===guest.id).map(a=>a.event_id)})),events:events.data ?? [],responses:responses.data ?? [],...summarize(guests.data ?? [],events.data ?? [],assignments.data ?? [],responses.data ?? [])});
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
