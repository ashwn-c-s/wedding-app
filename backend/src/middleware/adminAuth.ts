import {Request,Response,NextFunction} from 'express';
import {supabase} from '../lib/supabase';
export interface AdminRequest extends Request {admin?:{id:string;role:'full'|'restricted'}}
export async function adminAuth(req:AdminRequest,res:Response,next:NextFunction) {
  const match = req.headers.authorization?.match(/^Bearer (\S+)$/i);
  if (!match) {res.status(401).json({error:'Login required'});return;}
  const {data,error} = await supabase.auth.getUser(match[1]);
  if(error || !data.user) {res.status(401).json({error:'Session expired or invalid'});return;}
  const {data:admin,error:roleError} = await supabase.from('admin_users').select('role').eq('user_id',data.user.id).maybeSingle();
  if(roleError) {res.status(503).json({error:'Unable to verify administrator'});return;}
  if(!admin || !['full','restricted'].includes(admin.role)) {res.status(403).json({error:'Administrator access required'});return;}
  req.admin = {id:data.user.id,role:admin.role};next();
}
export function fullAdmin(req:AdminRequest,res:Response,next:NextFunction) {if(req.admin?.role !== 'full') {res.status(403).json({error:'Full administrator access required'});return;} next();}
