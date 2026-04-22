import axios from "axios";
import { MERCHANT_ID, USER, PASSWORD, TERMINAL, BASE_URL } from "../config.js";
import { createOrder, getOrder, deleteOrder } from "../services/order.service.js";
import { generateReceiptPDF } from "../services/receipt.service.js";

// INICIO 3D SECURE
export const start3DSecure = async (req, res) => {
  try {
    const { cardNumber, cardExp, cvv, amount } = req.body;

    if (!cardNumber || cardNumber.length !== 16) {
      return res.status(400).send("Tarjeta inválida");
    }

    const controlNumber = "ORD" + Date.now();

    const cardType =
      cardNumber.startsWith("4") ? "VISA" :
      cardNumber.startsWith("5") ? "MC" :
      "AMEX";

    createOrder(controlNumber, { cardNumber, cardExp, cvv, amount });

    const data = new URLSearchParams({
      CARD_NUMBER: cardNumber,
      CARD_EXP: cardExp, // MM/AA
      AMOUNT: Number(amount).toFixed(2),
      CARD_TYPE: cardType,
      MERCHANT_ID,
      MERCHANT_NAME: "AIDH",
      MERCHANT_CITY: "Coahuila",
      FORWARD_PATH: `${BASE_URL}/api/payment/3d-response`,
      "3D_CERTIFICATION": "03"
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

    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(response.data);

  } catch (error) {
    console.error("Error 3D:", error.response?.data || error.message);
    res.status(500).send("Error en 3D Secure");
  }
};


// RESPUESTA DEL 3D SECURE + PAGO + COMPROBANTE
export const handle3DSecureResponse = async (req, res) => {
  try {
    const data = req.method === "POST" ? req.body : req.query;
    console.log("3D RESPONSE:", data);
    const { Status, CONTROL_NUMBER, ECI, CAVV, XID } = data;

    if (Status !== "200") {
      deleteOrder(CONTROL_NUMBER);
      return res.send("<h1>Autenticación rechazada</h1>");
    }

    const order = getOrder(CONTROL_NUMBER);
    if (!order) return res.send("<h1>Orden no encontrada</h1>");

    const payload = new URLSearchParams({
      ID_AFILIACION: MERCHANT_ID,
      USUARIO: USER,
      CLAVE_USR: PASSWORD,
      ID_TERMINAL: TERMINAL,
      CMD_TRANS: "VENTA",
      AMOUNT: order.amount,
      CARD_NUMBER: order.cardNumber,
      CARD_EXP: order.cardExp.replace("/", ""),
      SECURITY_CODE: order.cvv,
      ENTRY_MODE: "MANUAL",
      MODE: "AUT",
      ECI,
      CAVV,
      XID
    });

    const response = await axios.post(
      "https://via.pagosbanorte.com/payw2",
      payload.toString(),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        }
      }
    );

    deleteOrder(CONTROL_NUMBER);

    const result = response.data;

    // PAGO APROBADO
    if (result.PAYW_RESULT === "A") {

      const authCode = result.AUTH_CODE || "N/A";
      const reference = result.REFERENCE || "N/A";

      return res.send(`
        <html>
        <head>
          <title>Comprobante</title>
          <style>
            body { font-family: Arial; background:#f4f4f4; text-align:center; }
            .box { background:white; padding:25px; margin:50px auto; width:320px; border-radius:10px; }
            button { padding:10px; background:#6a1b9a; color:white; border:none; border-radius:5px; }
          </style>
        </head>
        <body>
          <div class="box">
            <h2>Pago aprobado</h2>
            <p><b>Orden:</b> ${CONTROL_NUMBER}</p>
            <p><b>Monto:</b> $${order.amount}</p>
            <p><b>Autorización:</b> ${authCode}</p>
            <p><b>Referencia:</b> ${reference}</p>

            <form method="POST" action="/api/payment/receipt">
              <input type="hidden" name="controlNumber" value="${CONTROL_NUMBER}">
              <input type="hidden" name="amount" value="${order.amount}">
              <input type="hidden" name="authCode" value="${authCode}">
              <input type="hidden" name="reference" value="${reference}">
              <button type="submit">Descargar PDF</button>
            </form>
          </div>
        </body>
        </html>
      `);
    }

    // PAGO RECHAZADO
    res.send(`
      <h1>Pago rechazado</h1>
      <pre>${JSON.stringify(result, null, 2)}</pre>
    `);

  } catch (error) {
    console.error("Error pago:", error.response?.data || error.message);
    res.send("<h1>Error en pago</h1>");
  }
};


// GENERAR PDF
export const generateReceipt = (req, res) => {
  const { controlNumber, amount, authCode, reference } = req.body;

  generateReceiptPDF(res, {
    controlNumber,
    amount,
    authCode,
    reference
  });
};