import axios from "axios";
import { MERCHANT_ID, USER, PASSWORD, TERMINAL, BASE_URL } from "../config.js";
import { createOrder, getOrder, deleteOrder } from "../services/order.service.js";

// 🔐 INICIO 3D SECURE
export const start3DSecure = async (req, res) => {
  try {
    const { cardNumber, cardExp, cvv, amount } = req.body;

    if (!cardNumber || cardNumber.length !== 16) {
      return res.status(400).send("Tarjeta inválida");
    }

    const controlNumber = "ORD" + Date.now();

    const cardType =
      cardNumber.startsWith("4") ? "VISA" :
      cardNumber.startsWith("5") ? "MC" :
      "AMEX";

    createOrder(controlNumber, { cardNumber, cardExp, cvv, amount });

    // DEBUG (puedes quitarlo después)
    console.log("BASE_URL:", BASE_URL);

    const data = new URLSearchParams({
      CARD_NUMBER: cardNumber,
      CARD_EXP: cardExp, // MM/AA
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
      data.toString(),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        }
      }
    );

    // 🔥 CLAVE: enviar HTML puro
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(response.data);

  } catch (error) {
    console.error("Error 3D:", error.response?.data || error.message);
    res.status(500).send("Error en 3D Secure");
  }
};


// 💳 RESPUESTA DEL 3D SECURE
export const handle3DSecureResponse = async (req, res) => {
  try {
    const data = req.method === "POST" ? req.body : req.query;

    const { Status, CONTROL_NUMBER, ECI, CAVV, XID } = data;

    if (Status !== "200") {
      deleteOrder(CONTROL_NUMBER);
      return res.send("<h1>Autenticación rechazada</h1>");
    }

    const order = getOrder(CONTROL_NUMBER);
    if (!order) return res.send("<h1>Orden no encontrada</h1>");

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
      payload.toString(),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        }
      }
    );

    deleteOrder(CONTROL_NUMBER);

    res.send(`
      <h1>Pago procesado</h1>
      <pre>${JSON.stringify(response.data, null, 2)}</pre>
    `);

  } catch (error) {
    console.error("Error pago:", error.response?.data || error.message);
    res.send("<h1>Error en pago</h1>");
  }
};