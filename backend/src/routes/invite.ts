import { Router } from 'express';
import { atomicError } from '../lib/atomic';
import { supabase } from '../lib/supabase';
import { validateToken, GuestRequest } from '../middleware/validateToken';
import { EventRecord, validateResponses } from '../lib/validation';
const router = Router();
const fields = 'id,slug,name,date,time_label,venue_name,venue_address,maps_url,directions_text,is_visible';
export async function permittedEvents(guestId:string):Promise<EventRecord[]> {
  const {data,error} = await supabase.from('guest_events').select(`event:events!inner(${fields})`).eq('guest_id',guestId).eq('event.is_visible',true);
  if (error) throw new Error('Failed to fetch events');
  return (data ?? []).flatMap(row => (Array.isArray(row.event) ? row.event : [row.event])).filter(Boolean);
}
router.get('/defaultevents',async (_req,res) => {
  const {data,error} = await supabase.from('events').select(fields).eq('is_visible',true).in('slug',['wedding','reception']).order('date');
  if (error) { res.status(503).json({error:'Failed to fetch events'}); return; }
  res.json({venues:data ?? []});
});
router.get('/:token',validateToken,async (req:GuestRequest,res) => {
  const guest = req.guest!;
  res.json({guest:{id:guest.id,name:guest.name,party_size:guest.party_size},events:await permittedEvents(guest.id)});
});
router.get('/:token/rsvp-status',validateToken,async (req:GuestRequest,res) => {
  const {data,error} = await supabase.from('rsvps').select('event_id,attending').eq('guest_id',req.guest!.id);
  if (error) { res.status(503).json({error:'Failed to fetch RSVP status'}); return; }
  res.json({submitted:!!data?.length,responses:data ?? []});
});
router.post('/:token/rsvp',validateToken,async (req:GuestRequest,res) => {
  const guest = req.guest!;
  const {data:existing,error:readError} = await supabase.from('rsvps').select('id').eq('guest_id',guest.id).limit(1);
  if (readError) { res.status(503).json({error:'Unable to verify RSVP status'}); return; }
  if (existing?.length) { res.status(409).json({error:'RSVP already submitted'}); return; }
  const events = await permittedEvents(guest.id);
  let responses;
  try { responses = validateResponses(req.body,events.map(event=>event.id)); }
  catch (error) { res.status(400).json({error:(error as Error).message}); return; }
  // Revalidate under the same guest-row lock used by admin assignment saves.
  const {error} = await supabase.rpc('submit_rsvp_atomic',{p_guest_id:guest.id,p_invite_token:guest.invite_token,p_responses:responses});
  if(error){const failure=atomicError(error,'Your RSVP could not be saved. Please try again.','RSVP already submitted');res.status(failure.status).json({error:failure.error});return;}
  res.json({success:true});
});
router.get('/:token/venues',validateToken,async (req:GuestRequest,res)=>{res.json({venues:await permittedEvents(req.guest!.id)});});
export default router;
