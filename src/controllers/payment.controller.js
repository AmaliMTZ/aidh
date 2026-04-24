import axios from "axios";
import {
  MERCHANT_ID,
  USER,
  PASSWORD,
  TERMINAL,
  BASE_URL
} from "../config.js";

import {
  createOrder,
  getOrder,
  deleteOrder
} from "../services/order.service.js";

import { generateReceiptPDF } from "../services/receipt.service.js";


// ===============================
// INICIO 3D SECURE
// ===============================
export const start3DSecure = async (req, res) => {
  try {
    const {
      cardNumber,
      cardExp,
      cvv,
      amount,
      nombre,
      correo,
      telefono,
      direccion,
      ciudad,
      cp,
      tipoTarjeta
    } = req.body;

    if (!cardNumber || cardNumber.length < 15) {
      return res.status(400).send("Tarjeta inválida");
    }

    if (!nombre || !correo) {
      return res.status(400).send("Faltan datos del cliente");
    }

    const reference3D = "ORD" + Date.now();

    const cardType =
      cardNumber.startsWith("4") ? "VISA" :
      cardNumber.startsWith("5") ? "MC" :
      "AMEX";

    // separar nombre
    const [firstName, ...rest] = nombre.split(" ");
    const lastName = rest.join(" ") || "NA";

    // guardar orden temporal
    createOrder(reference3D, {
      cardNumber,
      cardExp,
      cvv,
      amount
    });

    const data = new URLSearchParams({
      // TARJETA
      CARD_NUMBER: cardNumber,
      CARD_EXP: cardExp,
      AMOUNT: Number(amount).toFixed(2),
      CARD_TYPE: cardType,

      // COMERCIO
      MERCHANT_ID,
      MERCHANT_NAME: "AIDH",
      MERCHANT_CITY: "Saltillo",

      // 3D SECURE
      FORWARD_PATH: `${BASE_URL}/api/payment/3d-response`,
      REFERENCE3D: reference3D,
      "3D_CERTIFICATION": "03",
      THREED_VERSION: "2",

      // CLIENTE (OBLIGATORIOS)
      NAME: firstName,
      LAST_NAME: lastName,
      EMAIL: correo,
      CITY: ciudad || "Saltillo",
      COUNTRY: "MX",
      POSTAL_CODE: cp || "25000",
      STREET: direccion || "NA",
      MOBILE_PHONE: telefono || "8440000000",
      CREDIT_TYPE: tipoTarjeta || "CR"
    });

    console.log("==== REQUEST 3D ====");
    console.log(data.toString());

    const response = await axios.post(
      "https://via.banorte.com/secure3d/Solucion3DSecure.htm",
      data.toString(),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        }
      }
    );

    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(response.data);

  } catch (error) {
    console.error("Error 3D:", error.response?.data || error.message);
    res.status(500).send("Error en 3D Secure");
  }
};


// ===============================
// RESPUESTA DEL 3D SECURE
// ===============================
export const handle3DSecureResponse = async (req, res) => {
  try {
    const data = req.method === "POST" ? req.body : req.query;

    console.log("==== 3D RESPONSE ====");
    console.log(data);

    const { Status, REFERENCE3D, ECI, CAVV, XID } = data;

    if (Status !== "200") {
      deleteOrder(REFERENCE3D);
      return res.send(`<h1>Autenticación fallida (${Status})</h1>`);
    }

    const order = getOrder(REFERENCE3D);

    if (!order) {
      return res.send("<h1>Orden no encontrada</h1>");
    }

    // ===============================
    // COBRO A PAYWORKS
    // ===============================
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

      // 3D SECURE
      ECI,
      CAVV,
      XID,
      STATUS_3D: Status,
      VERSION_3D: "2",
      CONTROL_NUMBER: REFERENCE3D
    });

    console.log("==== REQUEST PAGO ====");
    console.log(payload.toString());

    const response = await axios.post(
      "https://via.pagosbanorte.com/payw2",
      payload.toString(),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        }
      }
    );

    deleteOrder(REFERENCE3D);

    const result = response.data;

    console.log("==== RESPUESTA BANCO ====");
    console.log(result);

    if (result.PAYW_RESULT === "A") {
      const authCode = result.AUTH_CODE || "N/A";
      const reference = result.REFERENCE || "N/A";

      return res.send(`
        <html>
        <body style="font-family: Arial; text-align:center;">
          <h2>Pago aprobado</h2>
          <p><b>Orden:</b> ${REFERENCE3D}</p>
          <p><b>Monto:</b> $${order.amount}</p>
          <p><b>Autorización:</b> ${authCode}</p>
          <p><b>Referencia:</b> ${reference}</p>

          <form method="POST" action="/api/payment/receipt">
            <input type="hidden" name="controlNumber" value="${REFERENCE3D}">
            <input type="hidden" name="amount" value="${order.amount}">
            <input type="hidden" name="authCode" value="${authCode}">
            <input type="hidden" name="reference" value="${reference}">
            <button type="submit">Descargar PDF</button>
          </form>
        </body>
        </html>
      `);
    }

    return res.send(`
      <h1>Pago rechazado</h1>
      <pre>${JSON.stringify(result, null, 2)}</pre>
    `);

  } catch (error) {
    console.error("Error pago:", error.response?.data || error.message);
    res.send("<h1>Error en pago</h1>");
  }
};


// ===============================
// PDF
// ===============================
export const generateReceipt = (req, res) => {
  const { controlNumber, amount, authCode, reference } = req.body;

  generateReceiptPDF(res, {
    controlNumber,
    amount,
    authCode,
    reference
  });
};