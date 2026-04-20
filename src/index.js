import express from 'express';
import morgan from 'morgan';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import paymentRoute from './routes/payment.route.js';
import { PORT } from './config.js';

dotenv.config();

const app = express();

// 🔐 Seguridad
app.use(helmet());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});

app.use(limiter);

// middlewares
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(morgan('dev'));

// servir frontend
app.use(express.static("public"));

// rutas
app.use('/api/payment', paymentRoute);

app.get('/', (req, res) => {
  res.send('Backend Banorte funcionando 🚀');
});

app.listen(PORT, () => {
  console.log(`Servidor en puerto ${PORT}`);
});