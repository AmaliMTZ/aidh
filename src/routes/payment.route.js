import { Router } from "express";
import {
  start3DSecure,
  handle3DResponse,
  createOrder,
  success
} from "../controllers/payment.controller.js";

const router = Router();

router.post("/3d-secure", start3DSecure);
router.post("/3d-response", handle3DResponse);
router.get("/create-order", createOrder);
router.post("/success", success);

export default router;