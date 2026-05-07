import { Router } from "express";

import {
  start3DSecure,
  handle3DSecureResponse,
  generateReceipt,
  handlePayResponse
} from "../controllers/payment.controller.js";

const router = Router();


// ===============================
// INICIO 3D
// ===============================
router.post(
  "/3d-secure",
  start3DSecure
);

// ✅ OPCIONAL PERO RECOMENDADO
router.get(
  "/3d-secure",
  (req, res) => {
    res.status(200).send("3D Secure endpoint activo");
  }
);


// ===============================
// RESPUESTA 3D
// ===============================
router.post(
  "/3d-response",
  handle3DSecureResponse
);

// ✅ IMPORTANTE
// Algunos callbacks de Banorte llegan por GET
router.get(
  "/3d-response",
  handle3DSecureResponse
);


// ===============================
// RESPUESTA FINAL BANORTE
// ===============================
router.post(
  "/pay-response",
  handlePayResponse
);

// ✅ IMPORTANTE
// Banorte puede llamar GET o POST
router.get(
  "/pay-response",
  handlePayResponse
);


// ===============================
// PDF
// ===============================
router.post(
  "/receipt",
  generateReceipt
);

export default router;
