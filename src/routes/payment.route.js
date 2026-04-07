import { Router } from 'express';
import { createOrder, success } from '../controllers/payment.controller.js';

const router = Router();

// Crear orden
router.post('/create-order', createOrder);

// Respuesta Banorte
router.post('/success', success);

export default router;