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

    const reference3D = `ORD${Date.now()}`;
    const cardType = getCardType(cardNumber);

    const [firstName, ...rest] =
      (nombre || "").trim().split(" ");

    const lastName =
      rest.join(" ") || "NA";

    createOrder(reference3D, {
      cardNumber,
      cardExp,
      cvv,
      amount,
      cardType
    });

    const payload = new URLSearchParams({
      CARD_NUMBER: String(cardNumber),
      CARD_EXP: String(cardExp),
      AMOUNT: Number(amount).toFixed(2),
      CARD_TYPE: cardType,
      CREDIT_TYPE: "CR",
      MERCHANT_ID: MERCHANT_ID,
      MERCHANT_NAME: "ACADEMIAINTERAMERICANA",
      MERCHANT_CITY: "Saltillo",
      FORWARD_PATH: `${BASE_URL}/api/payment/3ds`,
      REFERENCE3D: reference3D,
      "3D_CERTIFICATION": "03",
      THREED_VERSION: "2",
      NAME: firstName,
      LAST_NAME: lastName,
      EMAIL: correo || "",
      CITY: ciudad || "",
      COUNTRY: "MX",
      POSTAL_CODE: cp || "",
      STREET: direccion || "",
      MOBILE_PHONE: telefono || ""
    });

    console.log("\n===== REQUEST 3D =====");
console.log({
  reference3D,
  amount: Number(amount).toFixed(2),
  cardType,
  last4: String(cardNumber).slice(-4)
});

    const response = await axios.post(
      "https://via.banorte.com/secure3d/Solucion3DSecure.htm",
      payload.toString(),
      {
        headers: {
          "Content-Type":
            "application/x-www-form-urlencoded"
        }
      }
    );

    console.log("\n===== RESPONSE 3D =====");
    console.log(response.data);

    return res.send(response.data);

  } catch (error) {

    console.error("\n===== ERROR 3D =====");

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

    console.log("\n===== RESPUESTA 3D =====");
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

    console.log("\n===== DATOS 3D =====");

    console.log({
      Status,
      REFERENCE3D,
      ECI,
      CAVV,
      XID
    });

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

    const order = getOrder(REFERENCE3D);

    console.log("\n===== ORDEN =====");
console.log({
  amount: order.amount,
  cardType: order.cardType,
  last4: String(order.cardNumber).slice(-4)
});

    if (!order) {
      return res.send(`
        <h1>Orden no encontrada</h1>
      `);
    }

    const payload = new URLSearchParams({
      MERCHANT_ID: MERCHANT_ID,
      USER: USER,
      PASSWORD: PASSWORD,
      TERMINAL_ID: TERMINAL_ID,
      CMD_TRANS: "VENTA",
      MODE: "PRD",
      AMOUNT: Number(order.amount).toFixed(2),
      CARD_NUMBER: String(order.cardNumber),
      CARD_EXP: String(order.cardExp).replace("/", ""),
      SECURITY_CODE: String(order.cvv),
      ENTRY_MODE: "MANUAL",
      CONTROL_NUMBER: String(REFERENCE3D).trim(),
STATUS_3D: String(Status),
...(ECI && { ECI: String(ECI) }),
VERSION_3D: "2",
...(CAVV && { CAVV: String(CAVV) }),
...(XID && { XID: String(XID) }),
RESPONSE_LANGUAGE: "ES"
    });

    console.log("\n===== PAYLOAD PAYWORKS =====");
console.log({
  merchantId: MERCHANT_ID,
  terminalId: TERMINAL_ID,
  cmdTrans: "VENTA",
  mode: "PRD",
  amount: Number(order.amount).toFixed(2),
  controlNumber: REFERENCE3D,
  cardLast4: String(order.cardNumber).slice(-4),
  status3D: Status,
  eci: ECI || "N/A"
});

   const payResponse = await axios.post(
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
    console.log("\n===== RESPUESTA PAYWORKS =====");

    console.log(
      "Tipo:",
      typeof payResponse.data
    );

    console.log("Contenido:");
    console.log(payResponse.data);

    let payData = {};

if (typeof payResponse.data === "string") {

  const raw = payResponse.data.trim();

  console.log("\n===== RAW PAYWORKS =====");
  console.log(raw);

  if (raw.includes("=")) {

    const params = new URLSearchParams(raw);

    payData = Object.fromEntries(
        params.entries()
      );

  } else {

    payData = { RAW_RESPONSE: raw
    };
  }

} else {

  payData = payResponse.data || {};
}

    console.log("\n===== DATA PAYWORKS =====");
    console.log(payData);

    const headers = payResponse.headers || {};

// ===============================
// RESULTADO REAL DE PAYWORKS
// ===============================
const resultadoPayworks =
  payData.PAYW_RESULT ||
  payData.RESULTADO_PAYW ||
  headers["payw_result"] ||
  headers["resultado_payw"] ||
  "";

const codigoAut =
  payData.AUTH_CODE ||
  payData.CODIGO_AUT ||
  headers["auth_code"] ||
  headers["codigo_aut"] ||
  "";

const codigoPayworks =
  payData.PAYW_CODE ||
  payData.CODIGO_PAYW ||
  headers["payw_code"] ||
  headers["codigo_payw"] ||
  "";

const textoPayworks =
  payData.TEXT ||
  payData.TEXTO ||
  headers["text"] ||
  headers["texto"] ||
  "";

const referenciaPayworks =
  payData.REFERENCE ||
  payData.REFERENCIA ||
  headers["reference"] ||
  headers["referencia"] ||
  "";

console.log("\n===== RESULTADO PAYWORKS =====");
console.log({
  resultadoPayworks,
  codigoPayworks,
  codigoAut,
  referenciaPayworks,
  textoPayworks
});

const approved = resultadoPayworks === "A";

if (approved) {

  console.log("\n===== PAGO APROBADO =====");

  console.log({
  resultado_payw: resultadoPayworks,
  codigo_aut: codigoAut,
  texto: textoPayworks,
  referencia: referenciaPayworks
});
  const doc = new PDFDocument();

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
      { align: "center" }
    );

  doc.moveDown();

  doc
    .fontSize(12)
    .text(
      `Monto: $${order.amount}`
    );

 doc.text(
  `Autorización: ${codigoAut || "N/A"}`
);

  doc.text(
  `Referencia: ${referenciaPayworks || "N/A"}`
);

  doc.text(
    `Estado: APROBADO`
  );

 doc.text(
  `Mensaje: ${textoPayworks || "APROBADA"}`
);

  doc.text(
    `Fecha: ${
      new Date().toLocaleString()
    }`
  );

  doc.end();

  deleteOrder(REFERENCE3D);

  return;
}
   console.log("\n===== PAGO NO APROBADO =====");

console.log({
  resultado: resultadoPayworks,
  codigoPayworks,
  texto: textoPayworks,
  referencia: referenciaPayworks
});

deleteOrder(REFERENCE3D);

let titulo = "Pago rechazado";

if (resultadoPayworks === "D") {
  titulo = "Pago declinado";
}

if (resultadoPayworks === "T") {
  titulo = "Sin respuesta del banco";
}

if (resultadoPayworks === "Z") {
  titulo = "Operación reversada";
}

return res.send(`
  <html>
    <body style="
      font-family: Arial;
      text-align: center;
      padding-top: 100px;
    ">

      <h1>${titulo}</h1>

      <p>
        ${textoPayworks || "La operación no pudo ser aprobada."}
      </p>

      ${
        codigoPayworks
          ? `<p>Código: ${codigoPayworks}</p>`
          : ""
      }

      ${
        referenciaPayworks
          ? `<p>Referencia: ${referenciaPayworks}</p>`
          : ""
      }

      <br>

      <a href="/">
        Intentar nuevamente
      </a>

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

  const resultadoPayworks =
  data.PAYW_RESULT ||
  data.RESULTADO_PAYW ||
  "";

const approved =
  resultadoPayworks === "A";

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
      data.AUTH_CODE
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
