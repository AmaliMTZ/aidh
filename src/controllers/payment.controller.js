export const createOrder = (req, res) => {
  const { nombre, correo, cardNumber, cardExp, cvv, amount } = req.body;

  // Validación de datos obligatorios
  if (!nombre || !correo || !cardNumber || !cardExp || !cvv || !amount) {
    return res.status(400).send("Faltan datos obligatorios para la transacción");
  }

  // 🔥 LIMPIEZA DE DATOS (IMPORTANTE)
  const cleanCardNumber = cardNumber.replace(/\s+/g, "");
  const cleanExp = cardExp.replace(/\s+/g, "");
  const cleanCvv = cvv.replace(/\s+/g, "");

  const data = {
    MERCHANT_ID: process.env.MERCHANT_ID,
    USER: process.env.USER_BANORTE,
    PASSWORD: process.env.PASSWORD_BANORTE,
    TERMINAL_ID: process.env.TERMINAL_ID,

    CMD_TRANS: "VENTA",

    // 🔥 FORMATO CORRECTO
    AMOUNT: parseFloat(amount).toFixed(2),
    MODE: "AUT",
    CONTROL_NUMBER: "ORD" + Date.now(),

    CARD_NUMBER: cleanCardNumber,
    CARD_EXP: cleanExp, // MMAA
    SECURITY_CODE: cleanCvv,
    ENTRY_MODE: "MANUAL",

    CUSTOMER_REF1: nombre,
    CUSTOMER_REF2: correo,

    // 🔥 IMPORTANTE: URL FIJA (no dependas de env si falla)
    RESPONSE_URL: "https://backend-banorte.onrender.com/api/payment/success"
  };

  // 🔥 LOG SEGURO
  console.log("Transacción creada:", {
    nombre,
    correo,
    amount: data.AMOUNT
  });

  res.send(`
    <html>
      <body>
        <h2>Redirigiendo a Banorte...</h2>
        <form id="form" action="https://via.pagosbanorte.com/payw2" method="POST">
          ${Object.entries(data).map(([key, value]) =>
            `<input type="hidden" name="${key}" value="${value}" />`
          ).join("\n")}
        </form>
        <script>
          document.getElementById('form').submit();
        </script>
      </body>
    </html>
  `);
};

export const success = (req, res) => {
  const data = req.body;
  console.log("Respuesta Banorte:", data);

  if (!data || Object.keys(data).length === 0) {
    return res.send("Ruta success activa, esperando respuesta de Banorte...");
  }

  const result = data.PAYW_RESULT || data.RESULTADO_PAYW;

  switch (result) {
    case "A":
      return res.redirect("https://www.academiaidh.org.mx/respuesta-banorte?status=ok");
    case "D":
    case "R":
      return res.redirect("https://www.academiaidh.org.mx/respuesta-banorte?status=error");
    case "T":
      return res.redirect("https://www.academiaidh.org.mx/respuesta-banorte?status=timeout");
    case "Z":
      return res.redirect("https://www.academiaidh.org.mx/respuesta-banorte?status=reversal");
    default:
      return res.redirect("https://www.academiaidh.org.mx/respuesta-banorte?status=unknown");
  }
};