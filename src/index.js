import express from 'express';
import morgan from 'morgan';
import paymentRoute from './routes/payment.route.js';
import { PORT } from './config.js';
import dotenv from 'dotenv';
import cors from 'cors';
import path from "path";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(morgan('dev'));

// servir HTML
app.use(express.static("public"));

app.use('/api/payment', paymentRoute);

app.get('/', (req, res) => {
  res.send('Backend Banorte funcionando 🚀');
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});