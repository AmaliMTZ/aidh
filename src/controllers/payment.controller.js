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

  const card =
    String(cardNumber)
      .replace(/\D/g, "");

  // VISA
  if (/^4/.test(card)) {
    return "VISA";
  }

  // MASTERCARD 51 - 55
  if (/^5[1-5]/.test(card)) {
    return "MC";
  }

  // MASTERCARD 2221 - 2720
  const first4 =
    Number(card.slice(0, 4));

  if (
    first4 >= 2221 &&
    first4 <= 2720
  ) {
    return "MC";
  }

  // AMERICAN EXPRESS
  if (/^3[47]/.test(card)) {
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
    } = req.body;

    if ( !cardNumber || !cardExp || !cvv || !amount || !nombre || !correo ||
  !telefono || !direccion || !ciudad || !cp || !tipoTarjeta || !planPago ) {
  return res.status(400).send("Datos incompletos");
}
    const tiposPermitidos = [
  "CR",
  "DB"
];

const planesPermitidos = [
  "contado",
  "06",
  "12"
];

if (!tiposPermitidos.includes(tipoTarjeta)) {
  return res
    .status(400)
    .send("Tipo de tarjeta inválido");
}

if (!planesPermitidos.includes(planPago)) {
  return res
    .status(400)
    .send("Plan de pago inválido");
}

if (
  tipoTarjeta === "DB" &&
  planPago !== "contado"
) {
  return res
    .status(400)
    .send(
      "Las tarjetas de débito solo permiten pago de contado"
    );
}

    const reference3D = `ORD${Date.now().toString().slice(-12)}`;
    const cardDigits = String(cardNumber).replace(/\D/g, "");
    const cardType = getCardType(cardDigits);
    if (!cardType) {
      return res.status(400).send("Marca de tarjeta no reconocida");
    }
    // ===============================
// VALIDAR LONGITUD DE TARJETA
// ===============================
if (
  cardType === "AMEX" &&
  cardDigits.length !== 15
) {
  return res.status(400).send( "La tarjeta AMEX debe tener 15 dígitos" );
}
if (( cardType === "VISA" || cardType === "MC" ) && cardDigits.length !== 16
) {
  return res.status(400).send("La tarjeta debe tener 16 dígitos");
}

// VALIDAR CVV
const cvvDigits = String(cvv).replace(/\D/g, "");
if ( cardType === "AMEX" && !/^\d{4}$/.test(cvvDigits)
) {
  return res.status(400).send("CVV de AMEX inválido"
    );
}
    if (cardType !== "AMEX" && !/^\d{3}$/.test(cvvDigits)
) {
return res.status(400).send( "CVV inválido");
}
    
// VALIDAR FECHA DE EXPIRACIÓN
const expMatch = String(cardExp).match( /^(\d{2})\/(\d{2})$/
  );
if (!expMatch) {
  return res.status(400).send( "Fecha de expiración inválida"
    );
}

const expMonth = Number(expMatch[1]);
const expYear = 2000 + Number(expMatch[2]);

if ( expMonth < 1 || expMonth > 12
) {
  return res.status(400).send( "Mes de expiración inválido"
    );
}

const now = new Date();
const currentMonth = now.getMonth() + 1;
const currentYear = now.getFullYear();

if (
  expYear < currentYear || ( expYear === currentYear && expMonth < currentMonth
  )
) {
  return res.status(400).send( "La tarjeta está vencida"
    );
}

// VALIDAR MONTO

const amountNumber =
  Number(amount);

if ( !Number.isFinite(amountNumber) || amountNumber <= 1 || amountNumber > 9999999.99
) {
  return res.status(400).send( "Monto inválido" );
}

    const [firstName, ...rest] = (nombre || "").trim().split(" ");
  const lastName = rest.join(" ") || "NA";

    createOrder(reference3D, {
      cardNumber: cardDigits,
      cardExp,
      cvv: cvvDigits,
      amount: amountNumber.toFixed(2),
      cardType,
      tipoTarjeta,
      planPago,
      correo,
      telefono,
      direccion,
      cp
    });

    const payload = new URLSearchParams({
      CARD_NUMBER: cardDigits,
CARD_EXP: String(cardExp),
AMOUNT: amountNumber.toFixed(2),
      CARD_TYPE: cardType,
      CREDIT_TYPE: tipoTarjeta,
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
      tieneCAVV: Boolean(CAVV),
      tieneXID: Boolean(XID)
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

if (!order) {
  return res.send(`
    <h1>Orden no encontrada</h1>
  `);
}

console.log("\n===== ORDEN =====");
console.log({
  amount: order.amount,
  cardType: order.cardType,
  tipoTarjeta: order.tipoTarjeta,
  planPago: order.planPago,
  last4: String(order.cardNumber).slice(-4)
});
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

      // datos amex // 
     ...(order.cardType === "AMEX" 
         ? { 
        ADDRESS: String(order.direccion),
        ZIP_CODE: String(order.cp),
        PHONE:String(order.telefono),
        EMAIL:String(order.correo)
      }
       : {}
        ),

      ...(
    order.tipoTarjeta === "CR" &&
    ["06", "12"].includes(order.planPago)
      ? {
          INITIAL_DEFERMENT: "00",
          PAYMENTS_NUMBER:order.planPago,
          PLAN_TYPE: "03"
        }
      : {}
  ),
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
  tipoTarjeta:order.tipoTarjeta,
  planPago:order.planPago,
  initialDeferment: order.tipoTarjeta === "CR" && ["06", "12"].includes(order.planPago)
    ? "00" : "N/A",
  paymentsNumber: order.tipoTarjeta === "CR" && ["06", "12"].includes(order.planPago)
    ? order.planPago
    : "N/A",
  planType: order.tipoTarjeta === "CR" && ["06", "12"].includes(order.planPago)
    ? "03"
    : "N/A",
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

    const resultadoAutorizador =
  payData.AUTH_RESULT ||
  payData.RESULTADO_AUT ||
  headers["auth_result"] ||
  headers["resultado_aut"] ||
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
  resultadoAutorizador,
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

  // ===============================
// COMPROBANTE DE PAGO AIDH
// ===============================

const doc = new PDFDocument({
  size: "LETTER",
  margin: 50
});

res.setHeader(
  "Content-Type",
  "application/pdf"
);

res.setHeader(
  "Content-Disposition",
  "inline; filename=comprobante-aidh.pdf"
);

doc.pipe(res);


// ===============================
// DATOS DEL COMPROBANTE
// ===============================

const last4 =
  String(order.cardNumber).slice(-4);

let modalidadPago =
  "Pago en una sola exhibición";

if (order.planPago === "06") {
  modalidadPago =
    "6 meses sin intereses";
}

if (order.planPago === "12") {
  modalidadPago =
    "12 meses sin intereses";
}

const tipoTarjetaTexto =
  order.tipoTarjeta === "CR"
    ? "Crédito"
    : "Débito";

const fechaActual =
  new Date();

const fecha =
  fechaActual.toLocaleDateString(
    "es-MX"
  );

const hora =
  fechaActual.toLocaleTimeString(
    "es-MX",
    {
      hour: "2-digit",
      minute: "2-digit"
    }
  );


// ===============================
// MARCO PRINCIPAL
// ===============================

doc
  .roundedRect(
    50,
    40,
    512,
    690,
    12
  )
  .lineWidth(2)
  .stroke("#6A1B9A");


// ===============================
// ENCABEZADO MORADO
// ===============================

doc
  .roundedRect(
    50,
    40,
    512,
    110,
    12
  )
  .fill("#6A1B9A");

doc
  .fillColor("#FFFFFF")
  .fontSize(28)
  .text(
    "AIDH",
    50,
    65,
    {
      width: 512,
      align: "center"
    }
  );

doc
  .fontSize(16)
  .text(
    "COMPROBANTE DE PAGO",
    50,
    105,
    {
      width: 512,
      align: "center"
    }
  );


// ===============================
// ESTADO
// ===============================

doc
  .fillColor("#6A1B9A")
  .fontSize(18)
  .text(
    "PAGO APROBADO",
    50,
    175,
    {
      width: 512,
      align: "center"
    }
  );


// ===============================
// MONTO
// ===============================

doc
  .fillColor("#666666")
  .fontSize(10)
  .text(
    "Monto",
    80,
    220
  );

doc
  .fillColor("#222222")
  .fontSize(22)
  .text(
    `$${Number(order.amount).toFixed(2)} MXN`,
    80,
    237
  );


// ===============================
// MODALIDAD
// ===============================

doc
  .fillColor("#666666")
  .fontSize(10)
  .text(
    "Modalidad de pago",
    80,
    285
  );

doc
  .fillColor("#222222")
  .fontSize(13)
  .text(
    modalidadPago,
    80,
    302
  );


// ===============================
// TARJETA
// ===============================

doc
  .fillColor("#666666")
  .fontSize(10)
  .text(
    "Tarjeta",
    80,
    340
  );

doc
  .fillColor("#222222")
  .fontSize(13)
  .text(
    `${order.cardType} •••• ${last4}`,
    80,
    357
  );

doc
  .fillColor("#666666")
  .fontSize(10)
  .text(
    "Tipo",
    330,
    340
  );

doc
  .fillColor("#222222")
  .fontSize(13)
  .text(
    tipoTarjetaTexto,
    330,
    357
  );


// ===============================
// SEPARADOR
// ===============================

doc
  .moveTo(80, 395)
  .lineTo(530, 395)
  .strokeColor("#DDDDDD")
  .lineWidth(1)
  .stroke();


// ===============================
// DATOS DE OPERACIÓN
// ===============================

doc
  .fillColor("#666666")
  .fontSize(10)
  .text(
    "Autorización",
    80,
    420
  );

doc
  .fillColor("#222222")
  .fontSize(12)
  .text(
    codigoAut || "N/A",
    80,
    437
  );


doc
  .fillColor("#666666")
  .fontSize(10)
  .text(
    "Número de control",
    330,
    420
  );

doc
  .fillColor("#222222")
  .fontSize(12)
  .text(
    REFERENCE3D,
    330,
    437
  );


doc
  .fillColor("#666666")
  .fontSize(10)
  .text(
    "Referencia Banorte",
    80,
    475
  );

doc
  .fillColor("#222222")
  .fontSize(12)
  .text(
    referenciaPayworks || "N/A",
    80,
    492
  );


doc
  .fillColor("#666666")
  .fontSize(10)
  .text(
    "Fecha",
    330,
    475
  );

doc
  .fillColor("#222222")
  .fontSize(12)
  .text(
    fecha,
    330,
    492
  );


doc
  .fillColor("#666666")
  .fontSize(10)
  .text(
    "Hora",
    330,
    525
  );

doc
  .fillColor("#222222")
  .fontSize(12)
  .text(
    hora,
    330,
    542
  );


// ===============================
// ESTADO Y MENSAJE
// ===============================

doc
  .moveTo(80, 580)
  .lineTo(530, 580)
  .strokeColor("#DDDDDD")
  .lineWidth(1)
  .stroke();

doc
  .fillColor("#666666")
  .fontSize(10)
  .text(
    "Estado de la operación",
    80,
    600
  );

doc
  .fillColor("#6A1B9A")
  .fontSize(13)
  .text(
    "APROBADA",
    80,
    617
  );

doc
  .fillColor("#666666")
  .fontSize(10)
  .text(
    "Mensaje",
    80,
    650
  );

doc
  .fillColor("#222222")
  .fontSize(11)
  .text(
    textoPayworks ||
      "Transacción aprobada",
    80,
    667,
    {
      width: 450
    }
  );


// ===============================
// AVISO FINAL
// ===============================

doc
  .fillColor("#777777")
  .fontSize(8)
  .text(
    "COMPROBANTE INFORMATIVO",
    50,
    700,
    {
      width: 512,
      align: "center"
    }
  );

doc
  .fontSize(8)
  .text(
    "Este documento no constituye factura ni comprobante fiscal.",
    50,
    714,
    {
      width: 512,
      align: "center"
    }
  );

doc.end();

  deleteOrder(REFERENCE3D);

  return;
}
   console.log("\n===== PAGO NO APROBADO =====");

console.log({
  resultado: resultadoPayworks,
  resultadoAutorizador,
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
