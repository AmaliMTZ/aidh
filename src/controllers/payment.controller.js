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

    if (!cardNumber || !cardExp || !cvv || !amount) {
      return res.status(400).send("Datos de pago incompletos");
    }

    const reference3D = "ORD" + Date.now();

    createOrder(reference3D, {
      cardNumber,
      cardExp,
      cvv,
      amount
    });

    const [firstName, ...rest] = nombre.split(" ");
    const lastName = rest.join(" ") || "NA";

    const data = new URLSearchParams({
      CARD_NUMBER: cardNumber,
      CARD_EXP: cardExp,
      AMOUNT: Number(amount).toFixed(2),

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
      MOBILE_PHONE: telefono,
      CARD_TYPE: tipoTarjeta
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

    res.send(response.data);

  } catch (error) {
    console.error(error.response?.data || error.message);
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

    // VALIDACIÓN OBLIGATORIA DEL MANUAL
    if (!Status || Status !== "200") {
      deleteOrder(REFERENCE3D);
      return res.send(`<h1>3D fallido (${Status})</h1>`);
    }

    if (!ECI) return res.send("<h1>Error: ECI faltante</h1>");
    if (!CAVV) return res.send("<h1>Error: CAVV faltante</h1>");

    const order = getOrder(REFERENCE3D);
    if (!order) return res.send("<h1>Orden no encontrada</h1>");

    // ===============================
    // PAYLOAD PAYWORKS (MANUAL EXACTO)
    // ===============================
    const payloadObj = {
      ID_AFILIACION: MERCHANT_ID,
      USUARIO: USER,
      CLAVE_USR: PASSWORD,
      ID_TERMINAL: TERMINAL,

      CMD_TRANS: "VENTA",
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

    // SOLO SI VIENEN (regla del manual)
    if (CAVV && CAVV.trim() !== "") {
      payloadObj.CAVV = CAVV;
    }

    if (XID && XID.trim() !== "") {
      payloadObj.XID = XID;
    }

    const payload = new URLSearchParams(payloadObj);

    console.log("==== REQUEST PAYWORKS ====");
    console.log(payload.toString());

    const response = await axios.post(
      "https://via.pagosbanorte.com/payw2",
      payload.toString(),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        responseType: "text"
      }
    );

    deleteOrder(REFERENCE3D);

    const raw = response.data;

    console.log("==== RAW BANORTE ====");
    console.log(raw);

    if (!raw) {
      return res.send("<h1>Error: respuesta vacía del banco</h1>");
    }

    const result = Object.fromEntries(new URLSearchParams(raw));

    console.log("==== RESULTADO ====");
    console.log(result);

    if (result.RESULTADO_PAYW === "A") {
      return res.send(`
        <h2>Pago aprobado</h2>
        <pre>${JSON.stringify(result, null, 2)}</pre>
      `);
    }

    return res.send(`
      <h2>Pago rechazado</h2>
      <pre>${JSON.stringify(result, null, 2)}</pre>
    `);

  } catch (error) {
    console.error(error.response?.data || error.message);
    res.send("<h1>Error en pago</h1>");
  }
};


// ===============================
// RECIBO
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