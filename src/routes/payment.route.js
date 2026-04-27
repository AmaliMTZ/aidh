import { Router } from "express";
import {
  start3DSecure,
  handle3DSecureResponse,
  generateReceipt
} from "../controllers/payment.controller.js";

const router = Router();

// Inicio 3D Secure
router.post("/3d-secure", start3DSecure);

// 🔥 SOLO POST (correcto)
router.post("/3d-response", handle3DSecureResponse);

// PDF
router.post("/receipt", generateReceipt);

export default router;