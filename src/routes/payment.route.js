import { Router } from "express";
import {
  start3DSecure,
  handle3DSecureResponse,
  generateReceipt
} from "../controllers/payment.controller.js";

const router = Router();

// ===============================
// INICIO 3D
// ===============================
router.post("/3d-secure", start3DSecure);

// ===============================
// RESPUESTA 3D (POST y GET)
// ===============================
router.route("/3d-response")
  .post(handle3DSecureResponse)
  .get(handle3DSecureResponse);

// ===============================
// PDF
// ===============================
router.post("/receipt", generateReceipt);

export default router;