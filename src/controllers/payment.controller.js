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
// DETECTAR MARCA DE TARJETA
// ===============================
const getCardType = (cardNumber) => {
  if (/^4/.test(cardNumber)) return "VISA";
  if (/^5[1-5]/.test(cardNumber)) return "MC";
  if (/^3[47]/.test(cardNumber)) return "AMEX";
  return "VISA";
};


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

    const reference3D = "ORD" + Date.now();
    const cardType = getCardType(cardNumber);

    const [firstName, ...rest] = nombre.split(" ");
    const lastName = rest.join(" ") || "NA";

    createOrder(reference3D, {
      cardNumber,
      cardExp,
      cvv,
      amount,
      cardType
    });

    const data = new URLSearchParams({
      CARD_NUMBER: cardNumber,
      CARD_EXP: cardExp,
      AMOUNT: Number(amount).toFixed(2),
      CARD_TYPE: cardType,

      MERCHANT_ID,
      MERCHANT_NAME: "ACADEMIAINTERAMERICANA",
      MERCHANT_CITY: "Saltillo",

      FORWARD_PATH: `${BASE_URL}/api/payment/3d-response`,
      REFERENCE3D: reference3D,
      "3D_CERTIFICATION": "03",
      THREED_VERSION: "2",

      NAME: firstName,
      LAST_NAME: lastName,
      EMAIL: correo,
      CITY: ciudad,
      COUNTRY: "MX",
      POSTAL_CODE: cp,
      STREET: direccion,
      MOBILE_PHONE: telefono
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

    res.send(response.data);

  } catch (error) {
    console.error("Error 3D:", error.response?.data || error.message);
    res.status(500).send("Error en 3D Secure");
  }
};


// ===============================
// RESPUESTA 3D
// ===============================
export const handle3DSecureResponse = async (req, res) => {
  try {
    const data = req.body;

    console.log("==== 3D COMPLETO ====");
    console.log(JSON.stringify(data, null, 2));

    const { Status, REFERENCE3D, ECI, CAVV, XID } = data;

    if (Status !== "200") {
      deleteOrder(REFERENCE3D);
      return res.send(`<h1>3D fallido (${Status})</h1>`);
    }

    const order = getOrder(REFERENCE3D);
    if (!order) return res.send("<h1>Orden no encontrada</h1>");

    const payloadObj = {
      ID_AFILIACION: MERCHANT_ID,
      USUARIO: USER,
      CLAVE_USR: PASSWORD,
      ID_TERMINAL: TERMINAL,
      CMD_TRANS: "VENTA",

      URL_RESPUESTA: `${BASE_URL}/api/payment/pay-response`,

      MODO: "AUT",
      MONTO: Number(order.amount).toFixed(2),

      NUMERO_TARJETA: String(order.cardNumber),
      FECHA_EXP: order.cardExp.replace("/", ""),
      CODIGO_SEGURIDAD: String(order.cvv),

      MODO_ENTRADA: "MANUAL",
      NUMERO_CONTROL: REFERENCE3D,

      ESTATUS_3D: Status,
      ECI: ECI,
      VERSION_3D: "2"
    };

    if (CAVV) payloadObj.CAVV = CAVV;
    if (XID) payloadObj.XID = XID;

    const payload = new URLSearchParams(payloadObj);

    await axios.post(
      "https://via.pagosbanorte.com/payw2",
      payload.toString(),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        }
      }
    );

    deleteOrder(REFERENCE3D);

    // 👇 AQUÍ YA NO ESPERAS RESPUESTA
    res.send("<h2>Procesando pago...</h2>");

  } catch (error) {
    console.error("Error pago:", error.response?.data || error.message);
    res.send("<h1>Error en pago</h1>");
  }
};


// ===============================
// RESPUESTA FINAL BANORTE (AQUÍ LLEGA TODO)
// ===============================
export const handlePayResponse = (req, res) => {
  console.log("==== RESPUESTA FINAL BANORTE ====");

  const raw = req.body || "";

  console.log("RAW:", raw);

  const params = new URLSearchParams(raw);
  const data = Object.fromEntries(params);

  console.log("PARSEADO:", data);

  if (data.RESULTADO_PAYW === "A") {
    console.log("✅ PAGO APROBADO");
  } else {
    console.log("❌ PAGO RECHAZADO");
  }

  res.send("OK");
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