import { Router } from 'express';
import { createHmac, randomUUID, timingSafeEqual } from 'crypto';
import { supabase } from '../lib/supabase';
import { adminAuth, fullAdmin, AdminRequest } from '../middleware/adminAuth';
import { allRows } from '../lib/pagination';

const bucket = 'wedding-photos';
const columns = 'id,storage_path,caption,album_type,created_at';
const types: Record<string, string> = {'image/jpeg':'jpg','image/png':'png','image/webp':'webp'};
const maxSize = 15 * 1024 * 1024;
interface Intent {id:string;path:string;admin:string;album:'pre'|'post';caption:string|null;type:string;size:number;expires:number}
function signature(body:string) {
  return createHmac('sha256', process.env.SUPABASE_SERVICE_ROLE_KEY!).update('gallery-upload:v1:' + body).digest();
}
function decode(value:unknown):Intent|null {
  if(typeof value !== 'string' || value.length > 4000) return null;
  try {
    const [body, mac, extra] = value.split('.');
    const received = Buffer.from(mac, 'base64url');
    const expected = signature(body);
    if(extra || received.length !== expected.length || !timingSafeEqual(received, expected)) return null;
    const intent:Intent = JSON.parse(Buffer.from(body,'base64url').toString());
    return intent.expires > Date.now() ? intent : null;
  } catch {return null;}
}
function photo(row:any) {
  return {id:row.id,caption:row.caption,album_type:row.album_type,created_at:row.created_at,
    url:supabase.storage.from(bucket).getPublicUrl(row.storage_path).data.publicUrl};
}

export const galleryRouter = Router();
galleryRouter.get('/',async (_req,res)=>{
  const {data,error} = await allRows<any>((from,to)=>supabase.from('photos').select(columns)
    .in('album_type',['pre','post']).order('created_at',{ascending:false}).order('id').range(from,to));
  if(error) {res.status(503).json({error:'Unable to load photos'});return;}
  res.json({photos:(data || []).map(photo)});
});

export const adminGalleryRouter = Router();
adminGalleryRouter.use(adminAuth,fullAdmin);
adminGalleryRouter.post('/upload',async (req:AdminRequest,res)=>{
  const {album,caption,type,size} = req.body || {};
  if(!['pre','post'].includes(album) || !Object.prototype.hasOwnProperty.call(types,type) || !Number.isInteger(size) || size < 1 || size > maxSize ||
    (caption !== undefined && (typeof caption !== 'string' || caption.length > 300))) {
    res.status(400).json({error:'Choose an album and a JPEG, PNG or WebP photo up to 15 MB. Captions may contain up to 300 characters.'});return;
  }
  const id = randomUUID();
  const path = `${album}/${id}.${types[type]}`;
  const {data,error} = await supabase.storage.from(bucket).createSignedUploadUrl(path);
  if(error || !data) {res.status(503).json({error:'Unable to prepare upload'});return;}
  const intent:Intent = {id,path,admin:req.admin!.id,album,caption:caption?.trim() || null,type,size,expires:Date.now()+2*60*60*1000};
  const body = Buffer.from(JSON.stringify(intent)).toString('base64url');
  res.json({path,token:data.token,intent:`${body}.${signature(body).toString('base64url')}`});
});
adminGalleryRouter.post('/publish',async (req:AdminRequest,res)=>{
  const intent = decode(req.body?.intent);
  if(!intent || intent.admin !== req.admin!.id) {res.status(400).json({error:'Upload authorization expired or invalid. Please select the photo again.'});return;}
  const existing = await supabase.from('photos').select(columns).eq('id',intent.id).maybeSingle();
  if(existing.error) {res.status(503).json({error:'Unable to verify publication'});return;}
  if(existing.data) {res.json({photo:photo(existing.data)});return;}
  const {data:object,error:storageError} = await supabase.storage.from(bucket).info(intent.path);
  if(storageError || !object) {res.status(409).json({error:'Photo has not finished uploading. Please retry publishing.'});return;}
  if(object.size !== intent.size || object.contentType !== intent.type) {res.status(400).json({error:'Uploaded file does not match the selected photo.'});return;}
  const result = await supabase.from('photos').insert({id:intent.id,storage_path:intent.path,caption:intent.caption,album_type:intent.album}).select(columns).single();
  if(result.error) {
    // The signed intent always uses the same primary key, making retries safe.
    if(result.error.code === '23505') {
      const retry = await supabase.from('photos').select(columns).eq('id',intent.id).single();
      if(!retry.error && retry.data) {res.json({photo:photo(retry.data)});return;}
    }
    res.status(503).json({error:'Photo uploaded, but publication failed. Retry publishing to finish.'});return;
  }
  res.status(201).json({photo:photo(result.data)});
});
