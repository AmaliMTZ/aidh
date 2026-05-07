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

  if (/^4/.test(cardNumber)) {
    return "VISA";
  }

  if (/^5[1-5]/.test(cardNumber)) {
    return "MC";
  }

  if (/^3[47]/.test(cardNumber)) {
    return "AMEX";
  }

  return "VISA";
};


// ===============================
// 1. INICIO 3D
// ===============================
export const start3DSecure = async (
  req,
  res
) => {

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

    // ===============================
    // VALIDAR
    // ===============================
    if (
      !cardNumber ||
      !cardExp ||
      !cvv ||
      !amount
    ) {

      return res
        .status(400)
        .send("Datos incompletos");
    }

    // ===============================
    // REFERENCIA
    // ===============================
    const reference3D =
      `ORD${Date.now()}`;

    const cardType =
      getCardType(cardNumber);

    // ===============================
    // NOMBRE
    // ===============================
    const [
      firstName,
      ...rest
    ] = (nombre || "")
      .trim()
      .split(" ");

    const lastName =
      rest.join(" ") || "NA";

    // ===============================
    // GUARDAR ORDEN
    // ===============================
    createOrder(reference3D, {

      cardNumber,

      cardExp,

      cvv,

      amount,

      cardType
    });

    // ===============================
    // PAYLOAD 3D
    // ===============================
    const payload =
      new URLSearchParams({

        CARD_NUMBER:
          String(cardNumber),

        CARD_EXP:
          String(cardExp),

        AMOUNT:
          Number(amount)
            .toFixed(2),

        CARD_TYPE:
          cardType,

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

    console.log(
      "\n===== REQUEST 3D ====="
    );

    console.log(
      payload.toString()
    );

    // ===============================
    // ENVIAR 3D
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

      // ===============================
      // DATA
      // ===============================
      const data =
        req.body || {};

      // ✅ SOPORTAR ESPAÑOL E INGLÉS
      const Status =
        data.Status ||
        data.STATUS ||
        data.Estatus ||
        data.ESTATUS;

      const REFERENCE3D =
        data.REFERENCE3D ||
        data.REFERENCIA3D;

      const ECI =
        data.ECI;

      const CAVV =
        data.CAVV;

      const XID =
        data.XID;

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
      // VALIDAR STATUS
      // ===============================
      if (String(Status) !== "200") {

        console.log(
          "3D FALLIDO"
        );

        if (REFERENCE3D) {
          deleteOrder(
            REFERENCE3D
          );
        }

        return res.send(`
          <h1>
            3D Secure Fallido
          </h1>

          <p>
            Status: ${Status}
          </p>
        `);
      }

      // ===============================
      // RECUPERAR ORDEN
      // ===============================
      const order =
        getOrder(
          REFERENCE3D
        );

      console.log(
        "\n===== ORDEN ====="
      );

      console.log(order);

      if (!order) {

        return res.send(`
          <h1>
            Orden no encontrada
          </h1>
        `);
      }

      // ===============================
      // PAYLOAD PAYWORKS
      // ===============================
      const payload =
        new URLSearchParams({

          MERCHANT_ID:
            MERCHANT_ID,

          USER:
            USER,

          PASSWORD:
            PASSWORD,

          TERMINAL_ID:
            TERMINAL,

          CMD_TRANS:
            "VENTA",

          MODE:
            "AUT",

          AMOUNT:
            Number(order.amount)
              .toFixed(2),

          CARD_NUMBER:
            String(order.cardNumber),

          CARD_EXP:
            String(order.cardExp)
              .replace("/", ""),

          SECURITY_CODE:
            String(order.cvv),

          ENTRY_MODE:
            "MANUAL",

          CONTROL_NUMBER:
            String(REFERENCE3D)
              .trim(),

          STATUS_3D:
            String(Status),

          ECI:
            String(ECI || ""),

          VERSION_3D:
            "2",

          ...(CAVV && {
            CAVV
          }),

          ...(XID && {
            XID
          }),

          RESPONSE_LANGUAGE:
            "EN",

          URL_RESPUESTA:
            `${BASE_URL}/api/payment/pay`
        });

      console.log(
        "\n===== PAYLOAD PAYWORKS ====="
      );

      console.log(
        payload.toString()
      );

      // ===============================
      // ENVIAR PAYWORKS
      // ===============================
      const payResponse =
        await axios.post(

          "https://via.pagosbanorte.com/payw2",

          payload.toString(),

          {
            headers: {
              "Content-Type":
                "application/x-www-form-urlencoded"
            }
          }
        );

      console.log(
        "\n===== RESPUESTA PAYWORKS ====="
      );

      console.log(
        "Tipo:",
        typeof payResponse.data
      );

      console.log(
        "Contenido:"
      );

      console.log(
        payResponse.data
      );

      // ===============================
      // RESPUESTA TEMPORAL
      // ===============================
      return res.send(`
        <html>

          <head>

            <title>
              Procesando pago
            </title>

          </head>

          <body style="
            font-family: Arial;
            text-align: center;
            padding-top: 100px;
          ">

            <h2>
              Procesando pago...
            </h2>

            <p>
              Esperando confirmación final de Banorte
            </p>

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
        <h1>
          Error procesando pago
        </h1>
      `);
    }
  };


// ===============================
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

  // ===============================
  // PARSEAR DATA
  // ===============================
  let data = {};

  if (
    typeof req.body === "string"
  ) {

    const params =
      new URLSearchParams(
        req.body
      );

    data =
      Object.fromEntries(
        params
      );

  } else {

    data =
      req.body || {};
  }

  console.log(
    "\n===== DATA ====="
  );

  console.log(data);

  // ===============================
  // VALIDAR RESPUESTA
  // ===============================
  const approved =

    data.PAYW_RESULT === "A" ||

    data.RESULTADO_PAYW === "A" ||

    data.AUTH_CODE ||

    data.CODIGO_AUTORIZACION;

  // ===============================
  // CONTROL NUMBER
  // ===============================
  const controlNumber =

    data.CONTROL_NUMBER ||

    data.NUMERO_CONTROL ||

    "N/A";

  // ===============================
  // APROBADO
  // ===============================
  if (approved) {

    console.log(
      "\n===== PAGO APROBADO ====="
    );

    console.log(
      "AUTH:",
      data.AUTH_CODE
    );

    deleteOrder(
      controlNumber
    );

    return res.redirect(
      "https://TU_FRONTEND.com/pago-exitoso"
    );
  }

  // ===============================
  // RECHAZADO
  // ===============================
  console.log(
    "\n===== PAGO RECHAZADO ====="
  );

  console.log(data);

  deleteOrder(
    controlNumber
  );

  return res.redirect(
    "https://TU_FRONTEND.com/pago-rechazado"
  );
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

    const doc =
      new PDFDocument();

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
        {
          align: "center"
        }
      );

    doc.moveDown();

    doc
      .fontSize(12)
      .text(
        `Referencia: ${
          reference || "N/A"
        }`
      );

    doc.text(
      `Monto: $${amount || "N/A"}`
    );

    doc.text(
      `Estado: ${
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
