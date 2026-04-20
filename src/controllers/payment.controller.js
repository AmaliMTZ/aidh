import axios from "axios";
import { MERCHANT_ID, USER, PASSWORD, TERMINAL, BASE_URL } from "../config.js";
import { createOrder, getOrder, updateOrder } from "../services/order.service.js";

// 🔐 1. INICIAR 3D SECURE
export const start3DSecure = async (req, res) => {
  try {
    const { cardNumber, cardExp, amount } = req.body;

    // Crear orden
    const controlNumber = createOrder({ amount });

    const data = new URLSearchParams({
      CARD_NUMBER: cardNumber,
      CARD_EXP: cardExp,
      AMOUNT: amount,
      MERCHANT_ID,
      MERCHANT_NAME: "MiTienda",
      MERCHANT_CITY: "CDMX",
      FORWARD_PATH: `${BASE_URL}/api/payment/3d-response`,
      "3D_CERTIFICATION": "03",
      CONTROL_NUMBER: controlNumber
    });

    const response = await axios.post(
      "https://via.banorte.com/secure3d/Solucion3DSecure.htm",
      data,
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    res.send(response.data);

  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).send("Error iniciando 3D Secure");
  }
};

// 🔁 2. RESPUESTA DE BANORTE (3D)
export const handle3DSecureResponse = async (req, res) => {
  try {
    const {
      Status,
      ECI,
      XID,
      CAVV,
      CONTROL_NUMBER
    } = req.body;

    if (Status !== "200") {
      updateOrder(CONTROL_NUMBER, { status: "failed" });
      return res.send("❌ Autenticación rechazada");
    }

    updateOrder(CONTROL_NUMBER, {
      status: "3d_ok",
      ECI,
      XID,
      CAVV
    });

    // Redirigir a confirmar pago
    res.redirect(`${BASE_URL}/api/payment/confirm?cn=${CONTROL_NUMBER}`);

  } catch (error) {
    console.error(error);
    res.send("Error en 3D");
  }
};

// 💳 3. CONFIRMAR PAGO (PAYWORKS)
export const confirmPayment = async (req, res) => {
  try {
    const { cn } = req.query;

    const order = getOrder(cn);

    if (!order) {
      return res.send("Orden no encontrada");
    }

    const data = new URLSearchParams({
      ID_AFILIACION: MERCHANT_ID,
      USUARIO: USER,
      CLAVE_USR: PASSWORD,
      ID_TERMINAL: TERMINAL,
      CMD_TRANS: "VENTA",
      AMOUNT: order.amount,
      CONTROL_NUMBER: cn,
      MODE: "AUT",
      ENTRY_MODE: "MANUAL",

      // 🔥 VARIABLES 3D (CLAVE)
      ECI: order.ECI,
      XID: order.XID,
      CAVV: order.CAVV
    });

    const response = await axios.post(
      "https://via.pagosbanorte.com/payw2",
      data,
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    updateOrder(cn, {
      status: "success",
      response: response.data
    });

    res.send(`
      <h1>Pago procesado</h1>
      <pre>${JSON.stringify(response.data, null, 2)}</pre>
    `);

  } catch (error) {
    console.error(error.response?.data || error.message);
    res.send("Error al confirmar pago");
  }
};