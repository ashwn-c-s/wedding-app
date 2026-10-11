import { Request, Response, NextFunction } from 'express';
import { supabase } from '../lib/supabase';
import { uuid } from '../lib/validation';
export interface GuestRequest extends Request {
  guest?: {id:string;name:string;phone:string;party_size:number;invite_token:string};
}
export const validateToken = async (req:GuestRequest,res:Response,next:NextFunction) => {
  const token = req.params.token;
  if (typeof token !== 'string' || !uuid.test(token)) { res.status(404).json({error:'Invalid invite link'}); return; }
  const {data:guest,error} = await supabase.from('guests').select('id,name,phone,party_size,invite_token').eq('invite_token',token).maybeSingle();
  if (error) { res.status(503).json({error:'Unable to verify invitation'}); return; }
  if (!guest) { res.status(404).json({error:'Invalid invite link'}); return; }
  req.guest = guest; next();
};
