import { Router } from "express";
import {
  start3DSecure,
  handle3DSecureResponse,
  generateReceipt,
  handlePayResponse
} from "../controllers/payment.controller.js";

const router = Router();

// INICIO 3D
router.post("/3d-secure", start3DSecure);

// RESPUESTA 3D
router.route("/3d-response")
  .post(handle3DSecureResponse)
  .get(handle3DSecureResponse);

// RESPUESTA FINAL BANORTE
router.route("/pay-response")
  .post(handlePayResponse)
  .get(handlePayResponse);

// PDF
router.post("/receipt", generateReceipt);

export default router;