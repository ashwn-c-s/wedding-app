import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import inviteRouter from './routes/invite';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const allowedOrigin = process.env.FRONTEND_URL || 'http://localhost:4200';
app.use(cors({
  origin: allowedOrigin
}));

app.use(express.json());
app.use('/api/invite', inviteRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});