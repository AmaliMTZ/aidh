import express from 'express';
import morgan from 'morgan';
import paymentRoutes from './routes/payment.routes.js';
import {PORT} from './config.js';
const app = express();
//post
app.use(express.urlencoded({ extemded:true }));
app.use(express.json());
app.use(morgan('dev'));

app.use(paymentRoutes);

const port = process.env.PORT || PORT;

app.listen(port, () => {
  console.log('Server on port', port);
});