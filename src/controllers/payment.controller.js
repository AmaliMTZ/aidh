import axios from "axios";
import { MERCHANT_ID, USER, PASSWORD, TERMINAL, BASE_URL } from "../config.js";
import { createOrder, getOrder, deleteOrder } from "../services/order.service.js";

//  1. INICIAR 3D SECURE
export const start3DSecure = async (req, res) => {
  try {
    const { cardNumber, cardExp, cvv, amount } = req.body;

    //  VALIDACIONES
    if (!cardNumber || cardNumber.length !== 16) {
      return res.status(400).send("Tarjeta inválida");
    }

    if (!cvv || cvv.length !== 3) {
      return res.status(400).send("CVV inválido");
    }

    if (!amount) {
      return res.status(400).send("Monto requerido");
    }

    const controlNumber = "ORD" + Date.now();

    // guardar temporalmente
    createOrder(controlNumber, {
      cardNumber,
      cardExp,
      cvv,
      amount
    });

    const data = new URLSearchParams({
      CARD_NUMBER: cardNumber,
      CARD_EXP: cardExp,
      AMOUNT: amount,
      MERCHANT_ID,
      MERCHANT_NAME: "MiTienda",
      MERCHANT_CITY: "CDMX",
      FORWARD_PATH: `${BASE_URL}/api/payment/3d-response`,
      CONTROL_NUMBER: controlNumber,
      "3D_CERTIFICATION": "03"
    });

    console.log("Datos recibidos:", req.body);
console.log("Entrando a Banorte...");

    const response = await axios.post(
      "https://via.banorte.com/secure3d/Solucion3DSecure.htm",
      data,
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    console.log("Respuesta Banorte:", response.data);

    res.send(response.data);

  } catch (error) {
    console.error("Error 3D:", error.message);
    res.status(500).send("Error iniciando 3D Secure");
  }
};

//  2. RESPUESTA BANORTE
export const handle3DSecureResponse = async (req, res) => {
  try {
    const data = req.method === "POST" ? req.body : req.query;

    const {
      Status,
      CONTROL_NUMBER
    } = data;

    if (Status !== "200") {
      deleteOrder(CONTROL_NUMBER);
      return res.send(" Autenticación rechazada");
    }

    const order = getOrder(CONTROL_NUMBER);

    if (!order) {
      return res.send("Orden no encontrada");
    }

    // CONFIRMAR PAGO
    const payload = new URLSearchParams({
      ID_AFILIACION: MERCHANT_ID,
      USUARIO: USER,
      CLAVE_USR: PASSWORD,
      ID_TERMINAL: TERMINAL,
      CMD_TRANS: "VENTA",
      AMOUNT: order.amount,
      CARD_NUMBER: order.cardNumber,
      CARD_EXP: order.cardExp,
      SECURITY_CODE: order.cvv,
      ENTRY_MODE: "MANUAL",
      MODE: "AUT"
    });

    const response = await axios.post(
      "https://via.pagosbanorte.com/payw2",
      payload,
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    // eliminar datos sensibles
    deleteOrder(CONTROL_NUMBER);

    res.send(`
      <h1>Pago procesado</h1>
      <p>Estatus: ${response.data?.response || "OK"}</p>
    `);

  } catch (error) {
    console.error("Error pago:", error.message);
    res.send("Error al confirmar pago");
  }
};