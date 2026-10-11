import express, {Request,Response,NextFunction} from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import inviteRouter from './routes/invite';
import adminRouter from './routes/admin';
import { galleryRouter, adminGalleryRouter } from './routes/gallery';

dotenv.config();
const app = express();
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:4200,https://wedding-app-ebfy.vercel.app').split(',').map(value=>value.trim());
app.use(cors({origin:allowedOrigins}));
app.use('/api',(_req,res,next)=>{
  res.setHeader('Cache-Control','no-store');
  res.setHeader('Referrer-Policy','no-referrer');
  next();
});
app.use(express.json({limit:'600kb'}));
app.use('/api/invite',inviteRouter);
app.use('/api/gallery',galleryRouter);
app.use('/api/admin/gallery',adminGalleryRouter);
app.use('/api/admin',adminRouter);
app.get('/api/health',(_req,res)=>{res.json({status:'ok'});});
app.use((error:unknown,_req:Request,res:Response,_next:NextFunction)=>{
  if(error instanceof SyntaxError) {res.status(400).json({error:'Invalid JSON body'});return;}
  res.status(503).json({error:'Service temporarily unavailable'});
});
if(require.main===module && !process.env.VERCEL) app.listen(process.env.PORT || 3000,()=>{console.log('Wedding API ready');});
export default app;
