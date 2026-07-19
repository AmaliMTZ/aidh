import axios from "axios";
import PDFDocument from "pdfkit";

import {
  MERCHANT_ID,
  USER,
  PASSWORD,
  TERMINAL_ID,
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
  const number = String(cardNumber || "")
    .replace(/\D/g, "");

  if (/^4/.test(number)) {
    return "VISA";
  }

  if (
    /^5[1-5]/.test(number) ||
    (
      number.length >= 4 &&
      Number(number.slice(0, 4)) >= 2221 &&
      Number(number.slice(0, 4)) <= 2720
    )
  ) {
    return "MC";
  }

  if (/^3[47]/.test(number)) {
    return "AMEX";
  }

  return null;
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
      cp,
      tipoTarjeta,
      planPago
    } = req.body || {};

    // ===============================
    // VALIDAR DATOS OBLIGATORIOS
    // ===============================
    if (
      !cardNumber ||
      !cardExp ||
      !cvv ||
      !amount ||
      !tipoTarjeta ||
      !planPago
    ) {
      return res
        .status(400)
        .send("Datos incompletos");
    }

    // ===============================
    // NORMALIZAR TIPO DE TARJETA
    // ===============================
    const cleanTipoTarjeta =
      String(tipoTarjeta)
        .trim()
        .toUpperCase();

    // ===============================
    // NORMALIZAR PLAN DE PAGO
    // ===============================
    const cleanPlanPago =
      String(planPago)
        .trim()
        .toLowerCase();

    const tiposPermitidos = [
      "CR",
      "DB"
    ];

    const planesPermitidos = [
      "contado",
      "03",
      "06",
      "09",
      "12"
    ];

    // ===============================
    // VALIDAR CRÉDITO O DÉBITO
    // ===============================
    if (
      !tiposPermitidos.includes(
        cleanTipoTarjeta
      )
    ) {
      return res
        .status(400)
        .send("Tipo de tarjeta inválido");
    }

    // ===============================
    // VALIDAR PLAN DE PAGO
    // ===============================
    if (
      !planesPermitidos.includes(
        cleanPlanPago
      )
    ) {
      return res
        .status(400)
        .send("Modalidad de pago inválida");
    }

    // ===============================
    // DÉBITO SOLO DE CONTADO
    // ===============================
    if (
      cleanTipoTarjeta === "DB" &&
      cleanPlanPago !== "contado"
    ) {
      return res
        .status(400)
        .send(
          "La tarjeta de débito solo permite pago de contado"
        );
    }

    // ===============================
    // LIMPIAR NÚMERO DE TARJETA
    // ===============================
    const cleanCardNumber =
      String(cardNumber)
        .replace(/\D/g, "");

    const cardType =
      getCardType(cleanCardNumber);

    // ===============================
    // VALIDAR MARCA
    // ===============================
    if (!cardType) {
      return res
        .status(400)
        .send(
          "Solo se aceptan tarjetas Visa, Mastercard y American Express"
        );
    }

    // ===============================
    // VALIDAR AMERICAN EXPRESS
    // ===============================
    if (
      cardType === "AMEX" &&
      cleanCardNumber.length !== 15
    ) {
      return res
        .status(400)
        .send(
          "American Express debe tener 15 dígitos"
        );
    }

    // ===============================
    // VALIDAR VISA Y MASTERCARD
    // ===============================
    if (
      ["VISA", "MC"].includes(cardType) &&
      cleanCardNumber.length !== 16
    ) {
      return res
        .status(400)
        .send(
          "Visa y Mastercard deben tener 16 dígitos"
        );
    }

    // ===============================
    // LIMPIAR CVV
    // ===============================
    const cleanCvv =
      String(cvv)
        .replace(/\D/g, "");

    // ===============================
    // CVV AMERICAN EXPRESS
    // ===============================
    if (
      cardType === "AMEX" &&
      !/^\d{4}$/.test(cleanCvv)
    ) {
      return res
        .status(400)
        .send(
          "El código de seguridad de American Express debe tener 4 dígitos"
        );
    }

    // ===============================
    // CVV VISA Y MASTERCARD
    // ===============================
    if (
      ["VISA", "MC"].includes(cardType) &&
      !/^\d{3}$/.test(cleanCvv)
    ) {
      return res
        .status(400)
        .send(
          "El código de seguridad debe tener 3 dígitos"
        );
    }

    // ===============================
    // CREAR REFERENCIA
    // ===============================
    const reference3D =
      `ORD${Date.now()}`;

    // ===============================
    // SEPARAR NOMBRE Y APELLIDO
    // ===============================
    const [firstName, ...rest] =
      (nombre || "")
        .trim()
        .split(" ");

    const lastName =
      rest.join(" ") || "NA";

    // ===============================
    // GUARDAR ORDEN TEMPORAL
    // ===============================
    createOrder(reference3D, {
      cardNumber: cleanCardNumber,
      cardExp,
      cvv: cleanCvv,
      amount,
      cardType,
      tipoTarjeta: cleanTipoTarjeta,
      planPago: cleanPlanPago
    });

    // ===============================
    // PAYLOAD 3D SECURE
    // ===============================
    const payload =
      new URLSearchParams({
        CARD_NUMBER: cleanCardNumber,

        CARD_EXP:
          String(cardExp),

        AMOUNT:
          Number(amount).toFixed(2),

        CARD_TYPE:
          cardType,

        CREDIT_TYPE:
          cleanTipoTarjeta,

        MERCHANT_ID:
          MERCHANT_ID,

        MERCHANT_NAME:
          "ACADEMIAINTERAMERICANA",

        MERCHANT_CITY:
          "Saltillo",

        FORWARD_PATH:
          `${BASE_URL}/api/payment/3ds`,

        REFERENCE3D:
          reference3D,

        "3D_CERTIFICATION":
          "03",

        THREED_VERSION:
          "2",

        NAME:
          firstName,

        LAST_NAME:
          lastName,

        EMAIL:
          correo || "",

        CITY:
          ciudad || "",

        COUNTRY:
          "MX",

        POSTAL_CODE:
          cp || "",

        STREET:
          direccion || "",

        MOBILE_PHONE:
          telefono || ""
      });

    // No imprimir número de tarjeta ni CVV
    console.log(
      "\n===== REQUEST 3D ====="
    );

    console.log({
      reference3D,
      cardType,
      tipoTarjeta:
        cleanTipoTarjeta,
      planPago:
        cleanPlanPago,
      amount:
        Number(amount).toFixed(2)
    });

    // ===============================
    // ENVIAR A BANORTE 3D SECURE
    // ===============================
    const response =
      await axios.post(
        "https://via.banorte.com/secure3d/Solucion3DSecure.htm",
        payload.toString(),
        {
          headers: {
            "Content-Type":
              "application/x-www-form-urlencoded"
          }
        }
      );

    console.log(
      "\n===== RESPONSE 3D ====="
    );

    console.log(response.data);

    return res.send(response.data);

  } catch (error) {
    console.error(
      "\n===== ERROR 3D ====="
    );

    console.error(
      error.response?.data ||
      error.message
    );

    return res
      .status(500)
      .send("Error en 3D Secure");
  }
};
// ===============================
// 2. RESPUESTA 3D
// ===============================
export const handle3DSecureResponse =
async (req, res) => {
  try {
    console.log(
      "\n===== RESPUESTA 3D ====="
    );

    console.log(req.body);

    const data = req.body || {};

    const Status =
      data.Status ||
      data.STATUS ||
      data.Estatus ||
      data.ESTATUS;

    const REFERENCE3D =
      data.REFERENCE3D ||
      data.REFERENCIA3D;

    const ECI = data.ECI;
    const CAVV = data.CAVV;
    const XID = data.XID;

    console.log(
      "\n===== DATOS 3D ====="
    );

    console.log({
      Status,
      REFERENCE3D,
      ECI,
      CAVV,
      XID
    });

    // ===============================
    // VALIDAR RESPUESTA 3D
    // ===============================
    if (String(Status) !== "200") {
      console.log("3D FALLIDO");

      if (REFERENCE3D) {
        deleteOrder(REFERENCE3D);
      }

      return res.send(`
        <h1>3D Secure Fallido</h1>
        <p>Status: ${Status}</p>
      `);
    }

    // ===============================
    // VALIDAR ECI
    // ===============================
    const eciPermitidos = [
      "01",
      "02",
      "05",
      "06",
      "07"
    ];

    if (
      !eciPermitidos.includes(
        String(ECI || "")
      )
    ) {
      if (REFERENCE3D) {
        deleteOrder(REFERENCE3D);
      }

      return res.status(400).send(`
        <html>
          <body style="
            font-family: Arial;
            text-align: center;
            padding-top: 100px;
          ">
            <h1>Respuesta 3D inválida</h1>
            <p>
              No se recibió un ECI válido.
            </p>
            <a href="/">Volver</a>
          </body>
        </html>
      `);
    }

    // ===============================
    // OBTENER ORDEN
    // ===============================
    const order =
      getOrder(REFERENCE3D);

    console.log(
      "\n===== ORDEN ====="
    );

    console.log(order);

    if (!order) {
      return res.send(`
        <h1>Orden no encontrada</h1>
      `);
    }

    // ===============================
    // DATOS BASE PARA PAYWORKS
    // ===============================
    const payworksData = {
      MERCHANT_ID:
        MERCHANT_ID,

      USER:
        USER,

      PASSWORD:
        PASSWORD,

      TERMINAL_ID:
        TERMINAL_ID,

      CMD_TRANS:
        "VENTA",

      MODE:
        "PRD",

      AMOUNT:
        Number(order.amount).toFixed(2),

      CARD_NUMBER:
        String(order.cardNumber),

      CARD_EXP:
        String(order.cardExp)
          .replace(/\D/g, ""),

      SECURITY_CODE:
        String(order.cvv),

      ENTRY_MODE:
        "MANUAL",

      CONTROL_NUMBER:
        String(REFERENCE3D).trim(),

      STATUS_3D:
        String(Status),

      ECI:
        String(ECI),

      VERSION_3D:
        "2",

      RESPONSE_LANGUAGE:
        "ES"
    };

    // ===============================
    // AGREGAR CAVV Y XID
    // SOLO SI FUERON RECIBIDOS
    // ===============================
    if (CAVV) {
      payworksData.CAVV = CAVV;
    }

    if (XID) {
      payworksData.XID = XID;
    }

    // ===============================
    // PLANES A MESES SIN INTERESES
    // ===============================
    const planesSinIntereses = [
      "03",
      "06",
      "09",
      "12"
    ];

    const esPagoDiferido =
      order.tipoTarjeta === "CR" &&
      planesSinIntereses.includes(
        order.planPago
      );

    // ===============================
    // AGREGAR VARIABLES MSI
    // SOLO PARA CRÉDITO
    // ===============================
    if (esPagoDiferido) {
      payworksData.INITIAL_DEFERMENT =
        "00";

      payworksData.PAYMENTS_NUMBER =
        order.planPago;

      payworksData.PLAN_TYPE =
        "03";
    }

    const payload =
      new URLSearchParams(
        payworksData
      );

    // No mostrar PAN ni CVV en consola
    console.log(
      "\n===== PAYLOAD PAYWORKS ====="
    );

    console.log({
      CONTROL_NUMBER:
        payworksData.CONTROL_NUMBER,

      AMOUNT:
        payworksData.AMOUNT,

      tipoTarjeta:
        order.tipoTarjeta,

      planPago:
        order.planPago,

      esPagoDiferido,

      STATUS_3D:
        payworksData.STATUS_3D,

      ECI:
        payworksData.ECI
    });

    // ===============================
    // ENVIAR TRANSACCIÓN A PAYWORKS
    // ===============================
    const payResponse =
      await axios.post(
        "https://via.pagosbanorte.com/payw2",
        payload.toString(),
        {
          headers: {
            "Content-Type":
              "application/x-www-form-urlencoded"
          },

          maxRedirects: 0,

          validateStatus: () => true,

          timeout: 30000
        }
      );

    console.log(
      "STATUS:",
      payResponse.status
    );

    console.log(
      "HEADERS:",
      payResponse.headers
    );

    console.log(
      "\n===== RESPUESTA PAYWORKS ====="
    );

    console.log(
      "Tipo:",
      typeof payResponse.data
    );

    console.log("Contenido:");

    console.log(
      payResponse.data
    );

    // ===============================
    // PROCESAR RESPUESTA PAYWORKS
    // ===============================
    let payData = {};

    if (
      typeof payResponse.data ===
      "string"
    ) {
      const raw =
        payResponse.data.trim();

      console.log(
        "\n===== RAW PAYWORKS ====="
      );

      console.log(raw);

      if (raw.includes("=")) {
        const params =
          new URLSearchParams(raw);

        payData =
          Object.fromEntries(
            params.entries()
          );
      } else {
        payData = {
          RAW_RESPONSE: raw
        };
      }
    } else {
      payData =
        payResponse.data || {};
    }

    console.log(
      "\n===== DATA PAYWORKS ====="
    );

    console.log(payData);

    const headers =
      payResponse.headers;

    console.log(
      "\n===== HEADERS PAYWORKS ====="
    );

    console.log(headers);

    // ===============================
    // OBTENER RESULTADO Y AUTORIZACIÓN
    // ===============================
    const resultCode =
      headers["resultado_payw"] ||
      headers["payw_result"] ||
      payData.RESULTADO_PAYW ||
      payData.PAYW_RESULT;

    const authorizationCode =
      headers["codigo_aut"] ||
      headers["auth_code"] ||
      payData.CODIGO_AUT ||
      payData.AUTH_CODE ||
      payData.CODIGO_AUTORIZACION;

    const approved =
      String(resultCode || "")
        .trim()
        .toUpperCase() === "A";

    // ===============================
    // PAGO APROBADO
    // ===============================
    if (approved) {
      console.log(
        "\n===== PAGO APROBADO ====="
      );

      console.log({
        resultado_payw:
          resultCode,

        codigo_aut:
          authorizationCode,

        texto:
          headers["texto"] ||
          payData.TEXTO ||
          payData.TEXT,

        referencia:
          headers["referencia"] ||
          payData.REFERENCIA ||
          payData.REFERENCE ||
          REFERENCE3D
      });

      const doc =
        new PDFDocument();

      res.setHeader(
        "Content-Type",
        "application/pdf"
      );

      res.setHeader(
        "Content-Disposition",
        "inline; filename=comprobante.pdf"
      );

      doc.pipe(res);

      doc
        .fontSize(20)
        .text(
          "COMPROBANTE DE PAGO",
          {
            align: "center"
          }
        );

      doc.moveDown();

      doc
        .fontSize(12)
        .text(
          `Monto: $${Number(
            order.amount
          ).toFixed(2)}`
        );

      doc.text(
        `Autorización: ${
          authorizationCode ||
          "N/A"
        }`
      );

      doc.text(
        `Referencia: ${
          headers["referencia"] ||
          payData.REFERENCIA ||
          payData.REFERENCE ||
          REFERENCE3D
        }`
      );

      doc.text(
        "Estado: APROBADO"
      );

      doc.text(
        `Tipo de tarjeta: ${
          order.tipoTarjeta === "DB"
            ? "Débito"
            : "Crédito"
        }`
      );

      doc.text(
        `Modalidad: ${
          esPagoDiferido
            ? `${Number(
                order.planPago
              )} meses sin intereses`
            : "Pago de contado"
        }`
      );

      doc.text(
        `Mensaje: ${
          headers["texto"] ||
          payData.TEXTO ||
          payData.TEXT ||
          "Transacción aprobada"
        }`
      );

      doc.text(
        `Fecha: ${
          new Date()
            .toLocaleString()
        }`
      );

      doc.end();

      deleteOrder(
        REFERENCE3D
      );

      return;
    }

    // ===============================
    // PAGO RECHAZADO
    // ===============================
    console.log(
      "\n===== PAGO RECHAZADO ====="
    );

    console.log(payData);

    deleteOrder(
      REFERENCE3D
    );

    return res.send(`
      <html>
        <body style="
          font-family: Arial;
          text-align: center;
          padding-top: 100px;
        ">
          <h1>Pago rechazado</h1>

          <pre>
${JSON.stringify(
  payData,
  null,
  2
)}
          </pre>
        </body>
      </html>
    `);

  } catch (error) {
    console.error(
      "\n===== ERROR PAYWORKS ====="
    );

    console.error(
      error.response?.data ||
      error.message
    );

    return res.send(`
      <h1>Error procesando pago</h1>
    `);
  }
};
// 3. CALLBACK FINAL
// ===============================
export const handlePayResponse = (
  req,
  res
) => {

  console.log(
    "\n===== CALLBACK BANORTE ====="
  );

  console.log(
    "URL:",
    req.originalUrl
  );

  console.log(
    "BODY:",
    req.body
  );

  let data = {};

  if (typeof req.body === "string") {

    const params =
      new URLSearchParams(req.body);

    data =
      Object.fromEntries(params);

  } else {

    data = req.body || {};
  }

  console.log("\n===== DATA =====");
  console.log(data);

  const resultCode =
  data.PAYW_RESULT ||
  data.RESULTADO_PAYW;

const approved =
  String(resultCode || "")
    .trim()
    .toUpperCase() === "A";

  const controlNumber =
    data.CONTROL_NUMBER ||
    data.NUMERO_CONTROL ||
    "N/A";

  if (approved) {

    console.log(
      "\n===== PAGO APROBADO ====="
    );

    console.log(
  "AUTH:",
  data.AUTH_CODE ||
  data.CODIGO_AUTORIZACION
);

    deleteOrder(controlNumber);

    return res.redirect("/");
  }

  console.log(
    "\n===== PAGO RECHAZADO ====="
  );

  console.log(data);

  deleteOrder(controlNumber);

  return res.send(`
    <html>
      <body style="
        font-family: Arial;
        text-align: center;
        padding-top: 100px;
      ">
        <h1>Pago rechazado</h1>

        <p>
          ${data.TEXT || ""}
        </p>

        <a href="/">
          Volver
        </a>

      </body>
    </html>
  `);
};

// ===============================
// 4. PDF
// ===============================
export const generateReceipt = (
  req,
  res
) => {

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
      .text(
        `Referencia: ${
          reference || "N/A"
        }`
      );

    doc.text(`Monto: $${amount || "N/A"}`
    );

    doc.text(`Estado: ${
        status || "DESCONOCIDO"
      }`
    );

    doc.text(
      `Fecha: ${new Date().toLocaleString()}`
    );

    doc.end();

  } catch (error) {

    console.error(error);

    return res
      .status(500)
      .send(
        "Error generando recibo"
      );
  }
};
