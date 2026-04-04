import { Router } from 'express';
import { createOrder, success } from '../controllers/payment.controller.js';

const router = Router();

// GET para probar fácil
router.get('/create-order', createOrder);

// Banorte response
router.get('/success', success);
router.post('/success', success);

export default router;