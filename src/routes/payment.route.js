import { Router } from "express";
import {
  start3DSecure,
  handle3DSecureResponse,
  generateReceipt
} from "../controllers/payment.controller.js";

const router = Router();

// Inicio 3D Secure
router.post("/3d-secure", start3DSecure);

// Banorte puede regresar por POST o GET
router.route("/3d-response")
  .post(handle3DSecureResponse)
  .get(handle3DSecureResponse);

  router.post("/receipt", generateReceipt);

export default router;