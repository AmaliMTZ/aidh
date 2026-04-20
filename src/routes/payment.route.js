import { Router } from "express";
import {
  start3DSecure,
  handle3DSecureResponse
} from "../controllers/payment.controller.js";

const router = Router();

router.post("/3d-secure", start3DSecure);

// aceptar GET y POST (IMPORTANTE)
router.post("/3d-response", handle3DSecureResponse);
router.get("/3d-response", handle3DSecureResponse);

export default router;