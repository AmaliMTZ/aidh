import axios from "axios";
import {
  MERCHANT_ID,
  BANORTE_USER,
  BANORTE_PASSWORD,
  TERMINAL
} from "../config.js";

export const testPayworks = async (req, res) => {
  try {

    // ===============================
    // PAYLOAD LIMPIO SIN 3D
    // ===============================
    const payload = new URLSearchParams({
      ID_AFILIACION: MERCHANT_ID,
      USUARIO: BANORTE_USER,
      CLAVE_USR: BANORTE_PASSWORD,
      ID_TERMINAL: TERMINAL,
      CMD_TRANS: "VENTA",

      MODO: "AUT",

      MONTO: "1.00",

      NUMERO_TARJETA: "4111111111111111",
      FECHA_EXP: "1226",
      CODIGO_SEGURIDAD: "123",

      MODO_ENTRADA: "MANUAL",
      NUMERO_CONTROL: "TEST" + Date.now()
    });

    console.log("==== REQUEST PAYWORKS ====");
    console.log(payload.toString());

    const response = await axios.post(
      "https://via.pagosbanorte.com/payw2",
      payload.toString(),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        responseType: "text"
      }
    );

    console.log("==== RAW BANORTE ====");
    console.log(response.data);

    // Parsear respuesta
    let result = {};
    if (response.data) {
      result = Object.fromEntries(
        new URLSearchParams(response.data)
      );
    }

    console.log("==== RESULTADO ====");
    console.log(result);

    res.send({
      raw: response.data,
      parsed: result
    });

  } catch (error) {
    console.error("ERROR PAYWORKS:", error.response?.data || error.message);
    res.status(500).send("Error en Payworks");
  }
};