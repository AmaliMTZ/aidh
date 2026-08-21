import { Router } from "express";

import {
  start3DSecure,
  handle3DSecureResponse,
  generateReceipt,
  handlePayResponse
} from "../controllers/payment.controller.js";

const router = Router();

router.post("/3d-secure", start3DSecure);

router.get("/3d-secure", (req, res) => {
  res.status(200).send("3D Secure endpoint activo");
});

router.post("/3ds", handle3DSecureResponse);

router.get("/3ds", (req, res) => {
  console.log("GET /3ds ignorado");
  return res.redirect("/");
});

router.post("/pay", handlePayResponse);
router.get("/pay", handlePayResponse);

router.post("/receipt", generateReceipt);

export default router;
