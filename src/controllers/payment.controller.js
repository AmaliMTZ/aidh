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
  cp,
  PAYMENTS_NUMBER
} = req.body;

    if (!cardNumber || !cardExp || !cvv || !amount) {
      return res.status(400).send("Datos incompletos");
    }
const paymentMonths =
  String(PAYMENTS_NUMBER || "").trim();

    if (
  paymentMonths !== "" &&
  !["06", "12"].includes(paymentMonths)
) {
  return res
    .status(400)
    .send("Modalidad de pago inválida");
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
  cardType,
  PAYMENTS_NUMBER: paymentMonths
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
  amount,
  cardType,
  cardEnding: cardNumber.slice(-4)
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
    console.log(order);

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
      ECI: String(ECI || ""),
      VERSION_3D: "2",
      ...(CAVV && { CAVV }),
      ...(XID && { XID }),
      RESPONSE_LANGUAGE: "ES"
    });

    const plazosMSI = ["06", "12"];

if (
  plazosMSI.includes(
    order.PAYMENTS_NUMBER
  )
) {
  payload.append(
    "INITIAL_DEFERMENT",
    "00"
  );

  payload.append(
    "PAYMENTS_NUMBER",
    order.PAYMENTS_NUMBER
  );

  payload.append(
    "PLAN_TYPE",
    "03"
  );
}

    console.log("\n===== PAYLOAD PAYWORKS =====");

console.log({
  controlNumber: REFERENCE3D,
  amount: Number(order.amount).toFixed(2),
  cardType: order.cardType,
  cardEnding: String(order.cardNumber).slice(-4),
  paymentsNumber: order.PAYMENTS_NUMBER || "CONTADO"
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

    console.log("HEADERS:", payResponse.headers);
console.log("DATA:", payResponse.data);
    
console.log("\n===== RESPUESTA PAYWORKS =====");

console.log(
  "HTTP STATUS:",
  payResponse.status
);

const headers =
  payResponse.headers || {};

const resultadoPayworks =
  headers["resultado_payw"] ||
  headers["payw_result"] ||
  "";

const codigoPayworks =
  headers["codigo_payw"] ||
  headers["payw_code"] ||
  "";

const codigoAutorizacion =
  headers["codigo_aut"] ||
  headers["auth_code"] ||
  "";

const referenciaBanco =
  headers["referencia"] ||
  headers["reference"] ||
  REFERENCE3D;

const numeroControl =
  headers["numero_control"] ||
  REFERENCE3D;

const textoCodificado =
  headers["texto"] ||
  headers["text"] ||
  "";

let textoRespuesta = "";

try {
  textoRespuesta =
    decodeURIComponent(
      String(textoCodificado)
        .replace(/\+/g, " ")
    );
} catch {
  textoRespuesta =
    String(textoCodificado);
}

console.log({
  resultado: resultadoPayworks,
  codigo: codigoPayworks,
  texto: textoRespuesta,
  numeroControl,
  codigoAutorizacion,
  referenciaBanco
});

const approved =
  resultadoPayworks === "A";

if (approved) {

  console.log("\n===== PAGO APROBADO =====");

  console.log({
    resultado_payw:
      resultadoPayworks,

    codigo_aut:
      codigoAutorizacion,

    texto:
      textoRespuesta,

    referencia:
      referenciaBanco
  });
      const doc = new PDFDocument({
  size: "LETTER",
  margins: {
    top: 50,
    bottom: 50,
    left: 55,
    right: 55
  }
});

res.setHeader(
  "Content-Type",
  "application/pdf"
);

res.setHeader(
  "Content-Disposition",
  "inline; filename=comprobante.pdf"
);

doc.pipe(res);

// ===============================
// ENCABEZADO
// ===============================
doc
  .font("Helvetica-Bold")
  .fontSize(22)
  .text(
    "COMPROBANTE DE PAGO",
    { align: "center" }
  );

doc.moveDown(0.4);

doc
  .font("Helvetica")
  .fontSize(11)
  .text(
    "Academia Interamericana",
    { align: "center" }
  );

doc.moveDown(1.5);

// Línea divisoria
doc
  .moveTo(55, doc.y)
  .lineTo(557, doc.y)
  .stroke();

doc.moveDown(1.5);

// ===============================
// ESTADO DEL PAGO
// ===============================
doc
  .font("Helvetica-Bold")
  .fontSize(16)
  .text(
    "PAGO APROBADO",
    { align: "center" }
  );

doc.moveDown(1.5);

// ===============================
// INFORMACIÓN DEL PAGO
// ===============================
doc
  .font("Helvetica-Bold")
  .fontSize(12)
  .text("Detalles de la operación");

doc.moveDown(0.8);

doc
  .font("Helvetica")
  .fontSize(11);

doc.text(
  `Monto: $${Number(order.amount).toFixed(2)} MXN`
);

doc.moveDown(0.5);

doc.text(
  `Número de autorización: ${
    codigoAutorizacion || "N/A"
  }`
);

doc.moveDown(0.5);

doc.text(
  `Referencia: ${
    referenciaBanco
  }`
);

doc.moveDown(0.5);

doc.text(
  "Estado: Aprobado"
);

doc.moveDown(0.5);

doc.text(
  `Mensaje: ${
    textoRespuesta || "Operación aprobada"
  }`
);

doc.moveDown(0.5);

doc.text(
  `Fecha y hora: ${
    new Date().toLocaleString("es-MX")
  }`
);

// ===============================
// MODALIDAD DE PAGO
// ===============================
doc.moveDown(1.2);

doc
  .font("Helvetica-Bold")
  .text("Modalidad de pago:");

doc
  .font("Helvetica");

if (order.PAYMENTS_NUMBER === "06") {
  doc.text("6 meses sin intereses");
} else if (order.PAYMENTS_NUMBER === "12") {
  doc.text("12 meses sin intereses");
} else {
  doc.text("Pago de contado");
}

// ===============================
// AVISO
// ===============================
doc.moveDown(2);

doc
  .moveTo(55, doc.y)
  .lineTo(557, doc.y)
  .stroke();

doc.moveDown(1);

doc
  .font("Helvetica-Bold")
  .fontSize(10)
  .text(
    "AVISO IMPORTANTE",
    { align: "center" }
  );

doc.moveDown(0.5);

doc
  .font("Helvetica")
  .fontSize(9)
  .text(
    "Este comprobante es únicamente informativo y no constituye un documento oficial, factura, recibo fiscal ni comprobante fiscal digital. Para cualquier aclaración, conserve el número de autorización y la referencia de la operación.",
    {
      align: "justify",
      lineGap: 3
    }
  );

// ===============================
// PIE DE PÁGINA
// ===============================
doc.moveDown(2);

doc
  .fontSize(8)
  .text(
    "Documento generado electrónicamente.",
    { align: "center" }
  );

doc.end();

  deleteOrder(REFERENCE3D);

  return;
}
   console.log("\n===== PAGO RECHAZADO =====");

console.log({
  resultado: resultadoPayworks,
  codigo: codigoPayworks,
  texto: textoRespuesta,
  numeroControl
});

deleteOrder(REFERENCE3D);

return res.send(`
  <!DOCTYPE html>
  <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>Pago rechazado</title>
    </head>

    <body style="
      font-family: Arial;
      text-align: center;
      padding: 80px 20px;
    ">
      <h1>Pago rechazado</h1>

      <p>
        <strong>Código:</strong>
        ${codigoPayworks || "Sin código"}
      </p>

      <p>
        <strong>Motivo:</strong>
        ${
          textoRespuesta ||
          "La operación fue rechazada por el banco"
        }
      </p>

      <p>
        <strong>Número de control:</strong>
        ${numeroControl}
      </p>

      <a href="/">
        Volver
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

  const approved =
    data.PAYW_RESULT === "A" ||
    data.RESULTADO_PAYW === "A" ||
    data.AUTH_CODE ||
    data.CODIGO_AUTORIZACION;

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
