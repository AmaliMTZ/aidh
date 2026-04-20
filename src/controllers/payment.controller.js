import axios from "axios";
import { MERCHANT_ID, USER, PASSWORD, TERMINAL, BASE_URL } from "../config.js";

// 🔐 1. 3D Secure
export const start3DSecure = async (req, res) => {
  try {
    const { cardNumber, cardExp, amount } = req.body;

    if (!cardNumber || !cardExp || !amount) {
      return res.status(400).json({ error: "Faltan datos" });
    }

    const data = new URLSearchParams({
      CARD_NUMBER: cardNumber,
      CARD_EXP: cardExp,
      AMOUNT: amount,
      MERCHANT_ID,
      MERCHANT_NAME: "MiTienda",
      MERCHANT_CITY: "CDMX",
      FORWARD_PATH: `${BASE_URL}/api/payment/3d-response`,
      "3D_CERTIFICATION": "03"
    });

    const response = await axios.post(
      "https://via.banorte.com/secure3d/Solucion3DSecure.htm",
      data,
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    res.json({
      success: true,
      message: "3D Secure iniciado",
      data: response.data
    });

  } catch (error) {
    console.error("Error 3D:", error.response?.data || error.message);
    res.status(500).json({ success: false, message: "Error 3D Secure" });
  }
};


// 🏦 2. RESPUESTA BANORTE
export const handle3DSecureResponse = async (req, res) => {
  try {
    const { Status } = req.body;

    if (Status !== "200") {
      return res.send("Pago rechazado en 3D Secure ❌");
    }

    res.redirect(`${BASE_URL}/api/payment/confirm-auto`);

  } catch (error) {
    console.error(error);
    res.send("Error en 3D");
  }
};


// 💳 3. CONFIRMAR PAGO
export const confirmAuto = async (req, res) => {
  try {

    const data = new URLSearchParams({
      ID_AFILIACION: MERCHANT_ID,
      USUARIO: USER,
      CLAVE_USR: PASSWORD,
      ID_TERMINAL: TERMINAL,
      CMD_TRANS: "VENTA",
      AMOUNT: "10.00",
      CARD_NUMBER: "4111111111111111",
      CARD_EXP: "2512",
      SECURITY_CODE: "123",
      ENTRY_MODE: "MANUAL",
      MODE: "AUT"
    });

    const response = await axios.post(
      "https://via.pagosbanorte.com/payw2",
      data,
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    res.send(`
      <h1>Resultado del pago</h1>
      <pre>${JSON.stringify(response.data, null, 2)}</pre>
    `);

  } catch (error) {
    console.error("Error pago:", error.response?.data || error.message);
    res.send("Error al confirmar pago");
  }
};