import express from 'express';
import morgan from 'morgan';
import paymentRoutes from './routes/payment.routes.js';
import { PORT } from './config.js';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();

const app = express();

app.use(cors());

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(morgan('dev'));

app.use(paymentRoutes);

const port = process.env.PORT || PORT;

app.listen(port, () => {
  console.log('Server on port', port);
});