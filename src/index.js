import express from 'express';
import morgan from 'morgan';
import paymentRoute from './src/route/payment.route.js';
import { PORT } from './config.js';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();

const app = express();

// Middlewares
app.use(cors());
app.use(express.urlencoded({ extended: true })); // necesario para recibir datos de Banorte
app.use(express.json()); // necesario para JSON
app.use(morgan('dev')); // logs de desarrollo

// Rutas de pago con prefijo
app.use('/api/payment', paymentRoutes);

// Ruta de prueba
app.get('/', (req, res) => {
  res.send('Backend Banorte funcionando correctamente');
});

// Puerto dinámico (Render asigna uno automáticamente)
const port = process.env.PORT || PORT;

app.listen(port, () => {
  console.log(`Servidor corriendo en puerto ${port}`);
});