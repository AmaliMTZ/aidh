import axios from "axios";
import { MERCHANT_ID, USER, PASSWORD, TERMINAL, BASE_URL } from "../config.js";
import { createOrder, getOrder, deleteOrder } from "../services/order.service.js";

//  3D Secure
export const start3DSecure = async (req, res) => {
  try {
    const { cardNumber, cardExp, cvv, amount } = req.body;

    if (!cardNumber || cardNumber.length !== 16)
      return res.status(400).send("Tarjeta inválida");

    const controlNumber = "ORD" + Date.now();

    const cardType =
      cardNumber.startsWith("4") ? "VISA" :
      cardNumber.startsWith("5") ? "MC" :
      "AMEX";

    createOrder(controlNumber, { cardNumber, cardExp, cvv, amount });

    const data = new URLSearchParams({
      CARD_NUMBER: cardNumber,
      CARD_EXP: cardExp,
      AMOUNT: amount,
      CARD_TYPE: cardType,
      MERCHANT_ID,
      MERCHANT_NAME: "MiTienda",
      MERCHANT_CITY: "CDMX",
      FORWARD_PATH: `${BASE_URL}/api/payment/3d-response`,
      CONTROL_NUMBER: controlNumber,
      "3D_CERTIFICATION": "03"
    });

    const response = await axios.post(
      "https://via.banorte.com/secure3d/Solucion3DSecure.htm",
      data,
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    // 🔥 CLAVE: enviar HTML directo
    res.send(response.data);

  } catch (error) {
    console.error(error);
    res.status(500).send("Error en 3D Secure");
  }
};

// 💳 respuesta 3D
export const handle3DSecureResponse = async (req, res) => {
  try {
    const data = req.method === "POST" ? req.body : req.query;

    const { Status, CONTROL_NUMBER, ECI, CAVV, XID } = data;

    if (Status !== "200") {
      deleteOrder(CONTROL_NUMBER);
      return res.send("<h1>Autenticación rechazada</h1>");
    }

    const order = getOrder(CONTROL_NUMBER);
    if (!order) return res.send("Orden no encontrada");

    const payload = new URLSearchParams({
      ID_AFILIACION: MERCHANT_ID,
      USUARIO: USER,
      CLAVE_USR: PASSWORD,
      ID_TERMINAL: TERMINAL,
      CMD_TRANS: "VENTA",
      AMOUNT: order.amount,
      CARD_NUMBER: order.cardNumber,
      CARD_EXP: order.cardExp.replace("/", ""),
      SECURITY_CODE: order.cvv,
      ENTRY_MODE: "MANUAL",
      MODE: "AUT",
      ECI,
      CAVV,
      XID
    });

    const response = await axios.post(
      "https://via.pagosbanorte.com/payw2",
      payload,
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    deleteOrder(CONTROL_NUMBER);

    res.send(`
      <h1>Pago procesado</h1>
      <pre>${JSON.stringify(response.data, null, 2)}</pre>
    `);

  } catch (error) {
    console.error(error);
    res.send("Error en pago");
  }
};