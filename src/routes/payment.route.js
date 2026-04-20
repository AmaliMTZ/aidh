import { Router } from "express";
import {
  start3DSecure,
  handle3DSecureResponse,
  confirmPayment
} from "../controllers/payment.controller.js";

const router = Router();

router.post("/3d-secure", start3DSecure);
router.post("/3d-response", handle3DSecureResponse);
router.get("/confirm", confirmPayment);

export default router;