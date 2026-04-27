import { Router } from "express";
import { testPayworks } from "../controllers/payment.controller.js";

const router = Router();

// 🔥 prueba directa sin 3D
router.get("/test-payworks", testPayworks);

export default router;