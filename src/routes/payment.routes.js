import { Router } from 'express';
import { createOrder, success } from '../controllers/payment.controller.js';

const router = Router();

router.post('/create-order', createOrder);

router.post('/success', success);

router.get('/success', success);

export default router;