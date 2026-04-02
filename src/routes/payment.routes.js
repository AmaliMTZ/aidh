import {Router} from 'express';
import { createOrder, success } from '../controllers/payment.controller.js';

const router = Router();

router.get('/create-order', createOrder );

router.get('/success', success);
router.post('/success', success);

export default router;