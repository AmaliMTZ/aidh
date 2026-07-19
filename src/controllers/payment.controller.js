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
// CONFIGURACIÓN
// ===============================
const PLANES_PERMITIDOS = [
  "contado",
  "03",
  "06",
  "09",
  "12"
];

const PLANES_SIN_INTERESES = [
  "03",
  "06",
  "09",
  "12"
];

const TIPOS_TARJETA_PERMITIDOS = [
  "CR",
  "DB"
];


// ===============================
// DETECTAR MARCA DE TARJETA
// ===============================
const getCardType = (cardNumber) => {

  const number =
    String(cardNumber || "")
      .replace(/\D/g, "");

  if (/^4/.test(number)) {
    return "VISA";
  }

  if (/^5[1-5]/.test(number)) {
    return "MC";
  }

  if (/^3[47]/.test(number)) {
    return "AMEX";
  }

  // Se conserva VISA como valor por defecto,
  // igual que en tu implementación anterior.
  return "VISA";
};


// ===============================
// OCULTAR NÚMERO DE TARJETA EN LOGS
// ===============================
const maskCardNumber = (cardNumber) => {

  const number =
    String(cardNumber || "")
      .replace(/\D/g, "");

  if (number.length < 4) {
    return "****";
  }

  return `************${number.slice(-4)}`;
};


// ===============================
// NORMALIZAR FECHA MM/AA
// ===============================
const normalizeCardExpiration = (
  cardExp
) => {

  return String(cardExp || "")
    .replace(/\D/g, "")
    .slice(0, 4);
};


// ===============================
// VALIDAR FECHA DE EXPIRACIÓN
// ===============================
const isValidExpiration = (
  cardExp
) => {

  const expiration =
    normalizeCardExpiration(cardExp);

  if (!/^\d{4}$/.test(expiration)) {
    return false;
  }

  const month =
    Number(expiration.slice(0, 2));

  const year =
    Number(expiration.slice(2, 4));

  if (
    month < 1 ||
    month > 12
  ) {
    return false;
  }

  const now =
    new Date();

  const currentMonth =
    now.getMonth() + 1;

  const currentYear =
    now.getFullYear() % 100;

  if (year < currentYear) {
    return false;
  }

  if (
    year === currentYear &&
    month < currentMonth
  ) {
    return false;
  }

  return true;
};


// ===============================
// VALIDAR MONTO
// ===============================
const isValidAmount = (amount) => {

  const numericAmount =
    Number(amount);

  return (
    Number.isFinite(numericAmount) &&
    numericAmount > 0 &&
    numericAmount <= 9999999.99
  );
};


// ===============================
// ESCAPAR TEXTO PARA HTML
// ===============================
const escapeHtml = (value) => {

  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
};


// ===============================
// 1. INICIO 3D SECURE
// ===============================
export const start3DSecure =
async (req, res) => {

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
    // NORMALIZAR DATOS
    // ===============================
    const cleanCardNumber =
      String(cardNumber || "")
        .replace(/\D/g, "");

    const cleanCardExp =
      normalizeCardExpiration(
        cardExp
      );

    const cleanCvv =
      String(cvv || "")
        .replace(/\D/g, "");

    const cleanTipoTarjeta =
      String(tipoTarjeta || "")
        .trim()
        .toUpperCase();

    const cleanPlanPago =
      String(planPago || "")
        .trim()
        .toLowerCase();

    const cleanNombre =
      String(nombre || "")
        .trim();

    const cleanCorreo =
      String(correo || "")
        .trim();

    const cleanTelefono =
      String(telefono || "")
        .replace(/\D/g, "");

    const cleanDireccion =
      String(direccion || "")
        .trim();

    const cleanCiudad =
      String(ciudad || "")
        .trim();

    const cleanCp =
      String(cp || "")
        .replace(/\D/g, "");

    // ===============================
    // VALIDAR CAMPOS OBLIGATORIOS
    // ===============================
    if (
      !cleanCardNumber ||
      !cleanCardExp ||
      !cleanCvv ||
      !amount ||
      !cleanNombre ||
      !cleanCorreo ||
      !cleanTelefono ||
      !cleanDireccion ||
      !cleanCiudad ||
      !cleanCp ||
      !cleanTipoTarjeta ||
      !cleanPlanPago
    ) {
      return res
        .status(400)
        .send(
          "Faltan datos obligatorios"
        );
    }

    // ===============================
    // VALIDAR TARJETA
    // ===============================
    if (
      !/^\d{15,19}$/.test(
        cleanCardNumber
      )
    ) {
      return res
        .status(400)
        .send(
          "Número de tarjeta inválido"
        );
    }

    if (
      !isValidExpiration(
        cleanCardExp
      )
    ) {
      return res
        .status(400)
        .send(
          "Fecha de vencimiento inválida"
        );
    }

    if (
      !/^\d{3,4}$/.test(
        cleanCvv
      )
    ) {
      return res
        .status(400)
        .send(
          "Código de seguridad inválido"
        );
    }

    if (!isValidAmount(amount)) {
      return res
        .status(400)
        .send(
          "Monto inválido"
        );
    }

    // ===============================
    // VALIDAR DATOS PERSONALES
    // ===============================
    if (
      cleanNombre.length < 3
    ) {
      return res
        .status(400)
        .send(
          "Nombre inválido"
        );
    }

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        cleanCorreo
      )
    ) {
      return res
        .status(400)
        .send(
          "Correo electrónico inválido"
        );
    }

    if (
      !/^\d{10}$/.test(
        cleanTelefono
      )
    ) {
      return res
        .status(400)
        .send(
          "Teléfono inválido"
        );
    }

    if (
      !/^\d{5}$/.test(
        cleanCp
      )
    ) {
      return res
        .status(400)
        .send(
          "Código postal inválido"
        );
    }

    // ===============================
    // VALIDAR TIPO DE TARJETA
    // ===============================
    if (
      !TIPOS_TARJETA_PERMITIDOS
        .includes(
          cleanTipoTarjeta
        )
    ) {
      return res
        .status(400)
        .send(
          "Tipo de tarjeta inválido"
        );
    }

    // ===============================
    // VALIDAR PLAN DE PAGO
    // ===============================
    if (
      !PLANES_PERMITIDOS.includes(
        cleanPlanPago
      )
    ) {
      return res
        .status(400)
        .send(
          "Modalidad de pago inválida"
        );
    }

    // Débito solamente permite contado.
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

    const esPagoDiferido =
      cleanTipoTarjeta === "CR" &&
      PLANES_SIN_INTERESES
        .includes(
          cleanPlanPago
        );

    // ===============================
    // REFERENCIA DE LA ORDEN
    // ===============================
    const reference3D =
      `ORD${Date.now()}`;

    const cardType =
      getCardType(
        cleanCardNumber
      );

    const nameParts =
      cleanNombre
        .split(/\s+/);

    const firstName =
      nameParts.shift() || "NA";

    const lastName =
      nameParts.join(" ") || "NA";

    // ===============================
    // GUARDAR ORDEN TEMPORAL
    // ===============================
    createOrder(
      reference3D,
      {
        reference3D,

        cardNumber:
          cleanCardNumber,

        cardExp:
          cleanCardExp,

        cvv:
          cleanCvv,

        amount:
          Number(amount)
            .toFixed(2),

        cardType,

        tipoTarjeta:
          cleanTipoTarjeta,

        planPago:
          cleanPlanPago,

        initialDeferment:
          esPagoDiferido
            ? "00"
            : null,

        paymentsNumber:
          esPagoDiferido
            ? cleanPlanPago
            : null,

        planType:
          esPagoDiferido
            ? "03"
            : null,

        nombre:
          cleanNombre,

        correo:
          cleanCorreo,

        telefono:
          cleanTelefono,

        direccion:
          cleanDireccion,

        ciudad:
          cleanCiudad,

        cp:
          cleanCp,

        createdAt:
          new Date().toISOString()
      }
    );

    // ===============================
    // PAYLOAD DE 3D SECURE
    // ===============================
    const payload =
      new URLSearchParams({
        CARD_NUMBER:
          cleanCardNumber,

        CARD_EXP:
          cleanCardExp,

        AMOUNT:
          Number(amount)
            .toFixed(2),

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
          cleanCorreo,

        CITY:
          cleanCiudad,

        COUNTRY:
          "MX",

        POSTAL_CODE:
          cleanCp,

        STREET:
          cleanDireccion,

        MOBILE_PHONE:
          cleanTelefono
      });

    // No imprimir el PAN completo ni CVV.
    console.log(
      "\n===== REQUEST 3D ====="
    );

    console.log({
      reference3D,
      cardNumber:
        maskCardNumber(
          cleanCardNumber
        ),
      cardType,
      creditType:
        cleanTipoTarjeta,
      planPago:
        cleanPlanPago,
      amount:
        Number(amount)
          .toFixed(2)
    });

    const response =
      await axios.post(
        "https://via.banorte.com/secure3d/Solucion3DSecure.htm",
        payload.toString(),
        {
          headers: {
            "Content-Type":
              "application/x-www-form-urlencoded"
          },

          timeout:
            30000
        }
      );

    console.log(
      "\n===== RESPONSE 3D RECIBIDA ====="
    );

    return res.send(
      response.data
    );

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
      .send(
        "Error en 3D Secure"
      );
  }
};


// ===============================
// 2. RESPUESTA 3D SECURE
// ===============================
export const handle3DSecureResponse =
async (req, res) => {

  try {

    console.log(
      "\n===== RESPUESTA 3D ====="
    );

    const data =
      req.body || {};

    const Status =
      data.Status ||
      data.STATUS ||
      data.Estatus ||
      data.ESTATUS;

    const REFERENCE3D =
      data.REFERENCE3D ||
      data.REFERENCIA3D;

    const ECI =
      data.ECI || "";

    const CAVV =
      data.CAVV || "";

    const XID =
      data.XID || "";

    console.log({
      Status,
      REFERENCE3D,
      ECI,
      hasCAVV:
        Boolean(CAVV),
      hasXID:
        Boolean(XID)
    });

    // ===============================
    // VALIDAR REFERENCIA
    // ===============================
    if (!REFERENCE3D) {
      return res
        .status(400)
        .send(`
          <h1>Respuesta inválida</h1>
          <p>No se recibió la referencia 3D.</p>
        `);
    }

    // ===============================
    // VALIDAR RESULTADO 3D
    // ===============================
    if (
      String(Status) !== "200"
    ) {

      console.log(
        "3D SECURE FALLIDO"
      );

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
            <h1>Validación 3D Secure fallida</h1>

            <p>
              No fue posible autenticar la tarjeta.
            </p>

            <p>
              Estado:
              ${escapeHtml(Status)}
            </p>

            <a href="/">
              Volver
            </a>
          </body>
        </html>
      `);
    }

    // ===============================
    // RECUPERAR ORDEN
    // ===============================
    const order =
      getOrder(
        REFERENCE3D
      );

    if (!order) {
      return res
        .status(404)
        .send(`
          <html>
            <body style="
              font-family: Arial;
              text-align: center;
              padding-top: 100px;
            ">
              <h1>Orden no encontrada</h1>

              <p>
                La orden expiró o ya fue procesada.
              </p>

              <a href="/">
                Volver
              </a>
            </body>
          </html>
        `);
    }

    console.log(
      "\n===== ORDEN RECUPERADA ====="
    );

    console.log({
      reference3D:
        order.reference3D,
      cardNumber:
        maskCardNumber(
          order.cardNumber
        ),
      amount:
        order.amount,
      tipoTarjeta:
        order.tipoTarjeta,
      planPago:
        order.planPago
    });

    // ===============================
    // PAYLOAD BASE PAYWORKS
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
        Number(order.amount)
          .toFixed(2),

      CARD_NUMBER:
        String(order.cardNumber),

      CARD_EXP:
        normalizeCardExpiration(
          order.cardExp
        ),

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

      CREDIT_TYPE:
        order.tipoTarjeta,

      RESPONSE_LANGUAGE:
        "ES"
    };

    // ===============================
    // DATOS DE AUTENTICACIÓN 3D
    // ===============================
    if (CAVV) {
      payworksData.CAVV =
        CAVV;
    }

    if (XID) {
      payworksData.XID =
        XID;
    }

    // ===============================
    // PAGOS DIFERIDOS
    // ===============================
    const esPagoDiferido =
      order.tipoTarjeta === "CR" &&
      PLANES_SIN_INTERESES
        .includes(
          order.planPago
        );

    if (esPagoDiferido) {

      // Meses antes del primer pago.
      payworksData
        .INITIAL_DEFERMENT =
          "00";

      // 03, 06, 09 o 12.
      payworksData
        .PAYMENTS_NUMBER =
          order.planPago;

      // 03 = plan sin intereses.
      payworksData
        .PLAN_TYPE =
          "03";
    }

    const payload =
      new URLSearchParams(
        payworksData
      );

    // No imprimir credenciales, PAN o CVV.
    console.log(
      "\n===== PAYLOAD PAYWORKS ====="
    );

    console.log({
      CONTROL_NUMBER:
        payworksData
          .CONTROL_NUMBER,

      AMOUNT:
        payworksData.AMOUNT,

      CARD_NUMBER:
        maskCardNumber(
          order.cardNumber
        ),

      CREDIT_TYPE:
        payworksData
          .CREDIT_TYPE,

      STATUS_3D:
        payworksData
          .STATUS_3D,

      ECI:
        payworksData.ECI,

      INITIAL_DEFERMENT:
        payworksData
          .INITIAL_DEFERMENT ||
        "NO APLICA",

      PAYMENTS_NUMBER:
        payworksData
          .PAYMENTS_NUMBER ||
        "NO APLICA",

      PLAN_TYPE:
        payworksData
          .PLAN_TYPE ||
        "NO APLICA"
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

          maxRedirects:
            0,

          validateStatus:
            () => true,

          timeout:
            30000
        }
      );

    console.log(
      "\n===== RESPUESTA PAYWORKS ====="
    );

    console.log(
      "STATUS HTTP:",
      payResponse.status
    );

    // ===============================
    // PROCESAR RESPUESTA
    // ===============================
    let payData = {};

    if (
      typeof payResponse.data ===
      "string"
    ) {

      const raw =
        payResponse.data.trim();

      if (raw.includes("=")) {

        const params =
          new URLSearchParams(raw);

        payData =
          Object.fromEntries(
            params.entries()
          );

      } else {

        payData = {
          RAW_RESPONSE:
            raw
        };
      }

    } else {

      payData =
        payResponse.data || {};
    }

    const headers =
      payResponse.headers || {};

    console.log(
      "\n===== RESULTADO PAYWORKS ====="
    );

    console.log({
      resultado:
        headers[
          "resultado_payw"
        ] ||
        headers[
          "payw_result"
        ] ||
        payData.RESULTADO_PAYW ||
        payData.PAYW_RESULT,

      authorization:
        headers[
          "codigo_aut"
        ] ||
        headers[
          "auth_code"
        ] ||
        payData.CODIGO_AUT ||
        payData.AUTH_CODE,

      texto:
        headers.texto ||
        payData.TEXTO ||
        payData.TEXT,

      referencia:
        headers.referencia ||
        payData.REFERENCIA ||
        payData.REFERENCE
    });

    // ===============================
    // VALIDAR APROBACIÓN
    // ===============================
    const resultCode =
      headers[
        "resultado_payw"
      ] ||
      headers[
        "payw_result"
      ] ||
      payData.RESULTADO_PAYW ||
      payData.PAYW_RESULT;

    const authorizationCode =
      headers[
        "codigo_aut"
      ] ||
      headers[
        "auth_code"
      ] ||
      payData.CODIGO_AUT ||
      payData.AUTH_CODE ||
      payData.CODIGO_AUTORIZACION;

    const approved =
      String(resultCode || "")
        .toUpperCase() === "A" ||
      Boolean(
        authorizationCode
      );

    // ===============================
    // PAGO APROBADO
    // ===============================
    if (approved) {

      console.log(
        "\n===== PAGO APROBADO ====="
      );

      const reference =
        headers.referencia ||
        payData.REFERENCIA ||
        payData.REFERENCE ||
        REFERENCE3D;

      const message =
        headers.texto ||
        payData.TEXTO ||
        payData.TEXT ||
        "Transacción aprobada";

      const doc =
        new PDFDocument({
          margin: 50
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

      doc
        .fontSize(20)
        .text(
          "COMPROBANTE DE PAGO",
          {
            align:
              "center"
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
          reference
        }`
      );

      doc.text(
        "Estado: APROBADO"
      );

      doc.text(
        `Mensaje: ${message}`
      );

      doc.text(
        `Tipo de tarjeta: ${
          order.tipoTarjeta === "DB"
            ? "Débito"
            : "Crédito"
        }`
      );

      if (esPagoDiferido) {

        doc.text(
          `Modalidad: ${
            Number(
              order.planPago
            )
          } meses sin intereses`
        );

      } else {

        doc.text(
          "Modalidad: Pago de contado"
        );
      }

      doc.text(
        `Tarjeta: ${
          maskCardNumber(
            order.cardNumber
          )
        }`
      );

      doc.text(
        `Fecha: ${
          new Date()
            .toLocaleString(
              "es-MX"
            )
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

    deleteOrder(
      REFERENCE3D
    );

    const rejectMessage =
      headers.texto ||
      payData.TEXTO ||
      payData.TEXT ||
      payData.RAW_RESPONSE ||
      "La transacción no fue autorizada";

    return res.send(`
      <html>
        <body style="
          font-family: Arial;
          text-align: center;
          padding-top: 100px;
        ">
          <h1>Pago rechazado</h1>

          <p>
            ${escapeHtml(
              rejectMessage
            )}
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

    return res
      .status(500)
      .send(`
        <html>
          <body style="
            font-family: Arial;
            text-align: center;
            padding-top: 100px;
          ">
            <h1>Error procesando el pago</h1>

            <p>
              No fue posible completar la operación.
            </p>

            <a href="/">
              Volver
            </a>
          </body>
        </html>
      `);
  }
};


// ===============================
// 3. CALLBACK FINAL DE BANORTE
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
        params.entries()
      );

  } else {

    data =
      req.body || {};
  }

  const approved =
    data.PAYW_RESULT === "A" ||
    data.RESULTADO_PAYW === "A" ||
    Boolean(
      data.AUTH_CODE ||
      data.CODIGO_AUTORIZACION
    );

  const controlNumber =
    data.CONTROL_NUMBER ||
    data.NUMERO_CONTROL ||
    "N/A";

  if (approved) {

    console.log(
      "\n===== PAGO APROBADO ====="
    );

    console.log({
      controlNumber,
      authorization:
        data.AUTH_CODE ||
        data.CODIGO_AUTORIZACION
    });

    if (
      controlNumber !== "N/A"
    ) {
      deleteOrder(
        controlNumber
      );
    }

    return res.redirect("/");
  }

  console.log(
    "\n===== PAGO RECHAZADO ====="
  );

  if (
    controlNumber !== "N/A"
  ) {
    deleteOrder(
      controlNumber
    );
  }

  return res.send(`
    <html>
      <body style="
        font-family: Arial;
        text-align: center;
        padding-top: 100px;
      ">
        <h1>Pago rechazado</h1>

        <p>
          ${escapeHtml(
            data.TEXT ||
            data.TEXTO ||
            "La transacción no fue autorizada"
          )}
        </p>

        <a href="/">
          Volver
        </a>
      </body>
    </html>
  `);
};


// ===============================
// 4. GENERAR PDF MANUAL
// ===============================
export const generateReceipt = (
  req,
  res
) => {

  try {

    const {
      amount,
      reference,
      status,
      tipoTarjeta,
      planPago
    } = req.body || {};

    const doc =
      new PDFDocument({
        margin: 50
      });

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
          align:
            "center"
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
      `Monto: $${
        amount || "N/A"
      }`
    );

    doc.text(
      `Estado: ${
        status ||
        "DESCONOCIDO"
      }`
    );

    if (tipoTarjeta) {

      doc.text(
        `Tipo de tarjeta: ${
          tipoTarjeta === "DB"
            ? "Débito"
            : "Crédito"
        }`
      );
    }

    if (
      PLANES_SIN_INTERESES
        .includes(
          String(planPago)
        )
    ) {

      doc.text(
        `Modalidad: ${
          Number(planPago)
        } meses sin intereses`
      );

    } else {

      doc.text(
        "Modalidad: Pago de contado"
      );
    }

    doc.text(
      `Fecha: ${
        new Date()
          .toLocaleString(
            "es-MX"
          )
      }`
    );

    doc.end();

  } catch (error) {

    console.error(
      error
    );

    return res
      .status(500)
      .send(
        "Error generando recibo"
      );
  }
};
