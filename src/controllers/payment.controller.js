// Crear orden (envía a Banorte)
export const createOrder = (req, res) => {

  // 🔥 IMPORTANTE: usar body (POST)
  const { nombre, correo } = req.body;

  if (!nombre || !correo) {
    return res.status(400).send("Faltan datos (nombre o correo)");
  }

  const data = {
    MERCHANT_ID: process.env.MERCHANT_ID,
    ID_AFILIACION: process.env.ID_AFILIACION, // 🔥 IMPORTANTE
    USER: process.env.USER_BANORTE,
    PASSWORD: process.env.PASSWORD_BANORTE,
    TERMINAL_ID: process.env.TERMINAL_ID,

    CMD_TRANS: "VENTA",
    AMOUNT: "100.00",
    MODE: "AUT", // pruebas
    ENTRY_MODE: "MANUAL", // 🔥 OBLIGATORIO

    CONTROL_NUMBER: "ORD" + Date.now(),

    CUSTOMER_REF1: nombre,
    CUSTOMER_REF2: correo,

    RESPONSE_URL: `${process.env.BASE_URL}/success`
  };

  console.log("DATOS:", data);

  res.send(`
    <html>
      <body>
        <h2>Redirigiendo a Banorte...</h2>

        <form id="form" action="https://via.pagosbanorte.com/payw2" method="POST">

          <input type="hidden" name="MERCHANT_ID" value="${data.MERCHANT_ID}" />
          <input type="hidden" name="ID_AFILIACION" value="${data.ID_AFILIACION}" />
          <input type="hidden" name="USER" value="${data.USER}" />
          <input type="hidden" name="PASSWORD" value="${data.PASSWORD}" />
          <input type="hidden" name="TERMINAL_ID" value="${data.TERMINAL_ID}" />

          <input type="hidden" name="CMD_TRANS" value="${data.CMD_TRANS}" />
          <input type="hidden" name="AMOUNT" value="${data.AMOUNT}" />
          <input type="hidden" name="MODE" value="${data.MODE}" />
          <input type="hidden" name="ENTRY_MODE" value="${data.ENTRY_MODE}" />

          <input type="hidden" name="CONTROL_NUMBER" value="${data.CONTROL_NUMBER}" />
          <input type="hidden" name="CUSTOMER_REF1" value="${data.CUSTOMER_REF1}" />
          <input type="hidden" name="CUSTOMER_REF2" value="${data.CUSTOMER_REF2}" />

          <input type="hidden" name="RESPONSE_URL" value="${data.RESPONSE_URL}" />

        </form>

        <script>
          document.getElementById('form').submit();
        </script>

      </body>
    </html>
  `);
};