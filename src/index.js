import express from 'express';
import morgan from 'morgan';
import paymentRoutes from './routes/payment.routes.js';
import { PORT } from './config.js';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();

const app = express();

// Middlewares
app.use(cors());
app.use(express.urlencoded({ extended: true })); // para forms (Banorte)
app.use(express.json()); // para JSON
app.use(morgan('dev'));

// Rutas
app.use('/', paymentRoutes);

// Ruta de prueba (opcional pero útil)
app.get('/', (req, res) => {
  res.send('Backend Banorte funcionando ');
});

// Puerto
const port = process.env.PORT || PORT;

app.listen(port, () => {
  console.log('Server on port', port);
});