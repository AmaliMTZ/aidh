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

    // VALIDACIONES
    if (!/^\d{15,16}$/.test(cardNumber)) {
      return res.status(400).send("Tarjeta inválida");
    }

    if (!nombre || !correo || !telefono || !direccion || !ciudad || !cp || !tipoTarjeta) {
      return res.status(400).send("Faltan datos del cliente");
    }

    if (Number(amount) < 1 || Number(amount) > 9999999.99) {
      return res.status(400).send("Monto inválido");
    }

    const reference3D = "ORD" + Date.now();

    // ✅ Según el manual: VISA, MC o AMEX
    const cardType =
      cardNumber.startsWith("4") ? "VISA" :
      cardNumber.startsWith("5") ? "MC" :
      cardNumber.startsWith("3") ? "AMEX" :
      "VISA";

    const [firstName, ...rest] = nombre.trim().split(" ");
    const lastName = rest.join(" ") || "NA";

    // Guardar orden en memoria
    createOrder(reference3D, {
      cardNumber,
      cardExp,
      cvv,
      amount,
      cardType  // ✅ Guardar cardType para usarlo en el cobro
    });

    // ✅ Variables requeridas según Manual 3D Secure v1.4
    const data = new URLSearchParams({
      CARD_NUMBER:      cardNumber,
      CARD_EXP:         cardExp,           // Formato MM/AA — el 3D Secure lo pide así
      AMOUNT:           Number(amount).toFixed(2),
      CARD_TYPE:        cardType,          // VISA, MC o AMEX

      MERCHANT_ID:      MERCHANT_ID,
      MERCHANT_NAME:    "ACADEMIAINTERAMERICANA",
      MERCHANT_CITY:    "Saltillo",

      FORWARD_PATH:     `${BASE_URL}/api/payment/3d-response`,
      REFERENCE3D:      reference3D,
      "3D_CERTIFICATION": "03",
      THREED_VERSION:   "2",

      // Datos del tarjetahabiente (TODOS requeridos según manual)
      NAME:             firstName,
      LAST_NAME:        lastName,
      EMAIL:            correo,
      CITY:             ciudad,
      COUNTRY:          "MX",
      POSTAL_CODE:      cp,
      STREET:           direccion,
      MOBILE_PHONE:     telefono,
      CREDIT_TYPE:      tipoTarjeta       // CR o DB
    });

    console.log("==== REQUEST 3D ====");
    console.log(data.toString());

    const response = await axios.post(
      "https://via.banorte.com/secure3d/Solucion3DSecure.htm",
      data.toString(),
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" }
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

    console.log("==== 3D RESPONSE RAW ====");
    console.log(data);

    const { Status, REFERENCE3D, ECI, CAVV, XID } = data;

    console.log("Status:", Status);
    console.log("ECI:", ECI, "| CAVV:", CAVV, "| XID:", XID);

    // ✅ Solo Status === "200" es autenticación exitosa
    if (Status !== "200") {
      deleteOrder(REFERENCE3D);
      return res.send(`
        <html><body style="font-family:Arial;text-align:center;">
          <h1>Autenticación fallida</h1>
          <p>Código: ${Status}</p>
          <p>Por favor intente con otra tarjeta o verifique sus datos.</p>
        </body></html>
      `);
    }

    const order = getOrder(REFERENCE3D);

    if (!order) {
      return res.send("<h1>Orden no encontrada o expirada</h1>");
    }

    // ✅ CARD_EXP: formato MMAA (sin slash) — requerido por Payworks
    const cardExpFormatted = order.cardExp.replace(/\//g, "");

    // ✅ Construir payload según Manual Payworks v2.5
    // IMPORTANTE: No enviar variables vacías ni nulas
    const payloadObj = {
      ID_AFILIACION:   MERCHANT_ID,
      USUARIO:         USER,
      CLAVE_USR:       PASSWORD,
      ID_TERMINAL:     TERMINAL,
      CMD_TRANS:       "VENTA",
      MODO:            "PRD",             // ✅ PRD = producción

      MONTO:           Number(order.amount).toFixed(2),

      NUMERO_TARJETA:  order.cardNumber,
      FECHA_EXP:       cardExpFormatted,  // MMAA sin slash
      CODIGO_SEGURIDAD: order.cvv,

      MODO_ENTRADA:    "MANUAL",
      NUMERO_CONTROL:  REFERENCE3D,       // ✅ Debe ser igual a REFERENCE3D del 3D

      // ✅ Variables 3D Secure requeridas (Manual Payworks pág. 8 y Manual 3D pág. 12)
      ESTATUS_3D:      Status,            // "200"
      ECI:             ECI,
      VERSION_3D:      "2",               // Valor fijo requerido
    };

    // ✅ CAVV: requerido para VISA, MC y AMEX — solo si no viene nulo/blanco
    if (CAVV && CAVV.trim() !== "") {
      payloadObj.CAVV = CAVV;
    }

    // ✅ XID: solo para VISA y AMEX — NO enviar para MasterCard ni si viene nulo
    if (XID && XID.trim() !== "" && order.cardType !== "MC") {
      payloadObj.XID = XID;
    }

    const payload = new URLSearchParams(payloadObj);

    console.log("==== REQUEST PAGO PAYWORKS ====");
    console.log(payload.toString());

    // ✅ Forzar responseType text para evitar que axios parsee la respuesta
    const response = await axios.post(
      "https://via.pagosbanorte.com/payw2",
      payload.toString(),
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        responseType: "text"   // ✅ CRÍTICO: evita que axios parsee la respuesta
      }
    );

    deleteOrder(REFERENCE3D);

    // ✅ Parsear respuesta de texto plano a objeto
    const raw = response.data;
    console.log("==== RAW BANCO ====");
    console.log(typeof raw, raw);

    const result = Object.fromEntries(new URLSearchParams(raw));

    console.log("==== RESULTADO PARSEADO ====");
    console.log(result);

    // ✅ Variable de resultado: RESULTADO_PAYW (español) o PAYW_RESULT (inglés)
    const paywResult = result.RESULTADO_PAYW || result.PAYW_RESULT;
    const authCode   = result.CODIGO_AUT     || result.AUTH_CODE   || "N/A";
    const reference  = result.REFERENCIA     || result.REFERENCE   || "N/A";
    const paywCode   = result.CODIGO_PAYW    || result.PAYW_CODE   || "";
    const texto      = result.TEXTO          || result.TEXT         || "";

    if (paywResult === "A") {
      return res.send(`
        <html>
        <body style="font-family:Arial;text-align:center;padding:40px;">
          <h2 style="color:green;">✅ Pago aprobado</h2>
          <p><b>Orden:</b> ${REFERENCE3D}</p>
          <p><b>Monto:</b> $${order.amount}</p>
          <p><b>Autorización:</b> ${authCode}</p>
          <p><b>Referencia Banorte:</b> ${reference}</p>

          <form method="POST" action="/api/payment/receipt">
            <input type="hidden" name="controlNumber" value="${REFERENCE3D}">
            <input type="hidden" name="amount"        value="${order.amount}">
            <input type="hidden" name="authCode"      value="${authCode}">
            <input type="hidden" name="reference"     value="${reference}">
            <button type="submit" style="padding:12px 24px;background:#6a1b9a;color:white;border:none;border-radius:8px;cursor:pointer;">
              Descargar recibo PDF
            </button>
          </form>
        </body>
        </html>
      `);
    }

    // Pago rechazado — mostrar razón detallada
    return res.send(`
      <html>
      <body style="font-family:Arial;text-align:center;padding:40px;">
        <h2 style="color:red;">❌ Pago rechazado</h2>
        <p><b>Resultado:</b> ${paywResult}</p>
        ${paywCode ? `<p><b>Código Payworks:</b> ${paywCode}</p>` : ""}
        ${texto    ? `<p><b>Detalle:</b> ${texto}</p>`            : ""}
        <p><b>Respuesta completa:</b></p>
        <pre style="text-align:left;background:#f5f5f5;padding:16px;border-radius:8px;">
${JSON.stringify(result, null, 2)}
        </pre>
      </body>
      </html>
    `);

  } catch (error) {
    console.error("Error pago:", error.response?.data || error.message);
    res.send("<h1>Error procesando el pago. Intente más tarde.</h1>");
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