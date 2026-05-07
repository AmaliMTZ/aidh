import axios from "axios";
import PDFDocument from "pdfkit";

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


// ===============================
// DETECTAR TARJETA
// ===============================
const getCardType = (cardNumber) => {
  if (/^4/.test(cardNumber)) return "VISA";
  if (/^5[1-5]/.test(cardNumber)) return "MC";
  if (/^3[47]/.test(cardNumber)) return "AMEX";
  return "VISA";
};


// ===============================
// 1. INICIO 3D
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
      cp
    } = req.body;

    if (!cardNumber || !cardExp || !cvv || !amount) {
      return res.status(400).send("Datos incompletos");
    }

    const reference3D = "ORD" + Date.now();
    const cardType = getCardType(cardNumber);

    const [firstName, ...rest] = (nombre || "").split(" ");
    const lastName = rest.join(" ") || "NA";

    createOrder(reference3D, {
      cardNumber,
      cardExp,
      cvv,
      amount,
      cardType
    });

    const payload = new URLSearchParams({
      CARD_NUMBER: cardNumber,
      CARD_EXP: cardExp,
      AMOUNT: Number(amount).toFixed(2),
      CARD_TYPE: cardType,

      MERCHANT_ID,
      MERCHANT_NAME: "ACADEMIAINTERAMERICANA",
      MERCHANT_CITY: "Saltillo",

      // ✅ CORREGIDO
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

    console.log("\n===== REQUEST 3D (BANORTE) =====");
    console.log(payload.toString());

    const response = await axios.post(
      "https://via.banorte.com/secure3d/Solucion3DSecure.htm",
      payload.toString(),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        }
      }
    );

    console.log("\n===== RESPONSE 3D (BANORTE) =====");
    console.log(response.data);

    res.send(response.data);

  } catch (error) {
    console.error(
      "Error 3D:",
      error.response?.data || error.message
    );

    res.status(500).send("Error en 3D Secure");
  }
};


// ===============================
// 2. RESPUESTA 3D
// ===============================
export const handle3DSecureResponse = async (req, res) => {
  try {

    console.log("\n===== RESPUESTA 3D RECIBIDA =====");
    console.log(req.body);

    const data = req.body;

    const {
      Status,
      REFERENCE3D,
      ECI,
      CAVV,
      XID
    } = data;

    console.log("\n===== DATOS 3D =====");
    console.log({
      Status,
      REFERENCE3D,
      ECI,
      CAVV,
      XID
    });

    // ✅ VALIDAR STATUS
    if (Status !== "200") {

      console.log("3D Secure fallido");

      deleteOrder(REFERENCE3D);

      return res.send(`
        <h1>3D fallido (${Status})</h1>
      `);
    }

    // ✅ RECUPERAR ORDEN
    const order = getOrder(REFERENCE3D);

    console.log("\n===== ORDEN RECUPERADA =====");
    console.log(order);

    if (!order) {
      return res.send("<h1>Orden no encontrada</h1>");
    }

    // ✅ PAYLOAD PAYWORKS
    const payload = new URLSearchParams({

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
      VERSION_3D: "2",

      ...(CAVV && { CAVV }),
      ...(XID && { XID }),

      // ✅ CALLBACK FINAL
      URL_RESPUESTA: `${BASE_URL}/api/payment/pay-response`
    });

    console.log("\n===== ENVIANDO A PAYWORKS =====");
    console.log(payload.toString());

    // ✅ ENVIAR A PAYWORKS
    const payResponse = await axios.post(
      "https://via.pagosbanorte.com/payw2",
      payload.toString(),
      {
        headers: {
          "Content-Type":
            "application/x-www-form-urlencoded"
        }
      }
    );

    console.log("\n===== RESPUESTA PAYWORKS =====");
    console.log("Tipo:", typeof payResponse.data);
    console.log("Contenido:", payResponse.data);

    // ⚠️ IMPORTANTE
    // NO BORRAR ORDEN AQUÍ
    // deleteOrder(REFERENCE3D);

    // ✅ RESPUESTA TEMPORAL
    res.send(`
      <html>
        <head>
          <title>Procesando pago</title>
        </head>

        <body style="
          font-family: Arial;
          text-align: center;
          padding-top: 80px;
        ">

          <h2>Procesando pago...</h2>

          <p>
            Esperando confirmación final de Banorte
          </p>

        </body>
      </html>
    `);

  } catch (error) {

    console.error(
      "Error pago:",
      error.response?.data || error.message
    );

    res.send("<h1>Error en pago</h1>");
  }
};


// ===============================
// 3. RESPUESTA FINAL BANORTE
// ===============================
export const handlePayResponse = (req, res) => {

  console.log("\n===== BANORTE CALLBACK =====");

  console.log("URL ACCEDIDA:", req.originalUrl);

  console.log("BODY RAW:", req.body);

  let data = {};

  // ✅ SOPORTA STRING U OBJETO
  if (typeof req.body === "string") {

    const params = new URLSearchParams(req.body);

    data = Object.fromEntries(params);

  } else {

    data = req.body || {};
  }

  console.log("\n===== DATA PARSEADA =====");
  console.log(data);

  const approved =
    data.RESPONSE === "A" ||
    data.RESPONSE === "APROBADA" ||
    data.RESPUESTA === "A" ||
    data.AUTH_CODE ||
    data.CODIGO_AUTORIZACION;

  // ✅ PAGO APROBADO
  if (approved) {

    console.log("\n===== PAGO APROBADO =====");

    console.log("Autorización:", data.AUTH_CODE);

    // ✅ ELIMINAR ORDEN
    if (data.NUMERO_CONTROL) {
      deleteOrder(data.NUMERO_CONTROL);
    }

    // ✅ REDIRECCIONAR
    return res.redirect(
      "https://TU_FRONTEND.com/pago-exitoso"
    );
  }

  // ❌ PAGO RECHAZADO
  console.log("\n===== PAGO RECHAZADO =====");

  console.log(data);

  if (data.NUMERO_CONTROL) {
    deleteOrder(data.NUMERO_CONTROL);
  }

  return res.redirect(
    "https://TU_FRONTEND.com/pago-rechazado"
  );
};


// ===============================
// 4. GENERAR RECIBO PDF
// ===============================
export const generateReceipt = (req, res) => {

  try {

    const {
      amount,
      reference,
      status
    } = req.body;

    const doc = new PDFDocument();

    res.setHeader(
      "Content-Type",
      "application/pdf"
    );

    res.setHeader(
      "Content-Disposition",
      "inline; filename=recibo.pdf"
    );

    doc.pipe(res);

    doc
      .fontSize(20)
      .text(
        "RECIBO DE PAGO",
        { align: "center" }
      );

    doc.moveDown();

    doc
      .fontSize(12)
      .text(`Referencia: ${reference || "N/A"}`);

    doc.text(`Monto: $${amount || "N/A"}`);

    doc.text(`Estado: ${status || "DESCONOCIDO"}`);

    doc.text(
      `Fecha: ${new Date().toLocaleString()}`
    );

    doc.end();

  } catch (error) {

    console.error(error);

    res
      .status(500)
      .send("Error generando recibo");
  }
};
