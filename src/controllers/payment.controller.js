//  Crear orden (envía a Banorte)
export const createOrder = (req, res) => {

  const data = {
    MERCHANT_ID: "TU_MERCHANT_ID",
    USER: "TU_USUARIO",
    PASSWORD: "TU_PASSWORD",
    TERMINAL_ID: "TU_TERMINAL",
    CMD_TRANS: "VENTA",
    AMOUNT: "100.00",
    MODE: "AUT", // modo prueba
    CONTROL_NUMBER: "ORD" + Date.now(),
    CUSTOMER_REF1: "Pago prueba",
    RESPONSE_URL: "http://localhost:2026/success"
  };

  res.send(`
    <html>
      <body>
        <h2>Redirigiendo a Banorte...</h2>

        <form id="form" action="https://via.pagosbanorte.com/payw2" method="POST">

          <input type="hidden" name="MERCHANT_ID" value="${data.MERCHANT_ID}" />
          <input type="hidden" name="USER" value="${data.USER}" />
          <input type="hidden" name="PASSWORD" value="${data.PASSWORD}" />
          <input type="hidden" name="TERMINAL_ID" value="${data.TERMINAL_ID}" />
          <input type="hidden" name="CMD_TRANS" value="${data.CMD_TRANS}" />
          <input type="hidden" name="AMOUNT" value="${data.AMOUNT}" />
          <input type="hidden" name="MODE" value="${data.MODE}" />
          <input type="hidden" name="CONTROL_NUMBER" value="${data.CONTROL_NUMBER}" />
          <input type="hidden" name="CUSTOMER_REF1" value="${data.CUSTOMER_REF1}" />
          <input type="hidden" name="RESPONSE_URL" value="${data.RESPONSE_URL}" />

        </form>

        <script>
          document.getElementById('form').submit();
        </script>

      </body>
    </html>
  `);
};



// Recibir respuesta del banco
export const success = (req, res) => {

  console.log("Query:", req.query);
  console.log("Body:", req.body);

  // Detecta si viene por GET o POST
  const data = req.method === "POST" ? req.body : req.query;

  
  const result = data.PAYW_RESULT || data.RESULTADO_PAYW;

  if (result === "A") {
    res.send("Pago aprobado");
  } else if (result === "D") {
    res.send("Pago declinado");
  } else if (result === "R") {
    res.send("Pago rechazado");
  } else {
    res.send("Sin resultado o prueba");
  }
};